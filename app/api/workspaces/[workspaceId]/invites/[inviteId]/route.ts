import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { users, workspaces, workspaceInvites } from "@/db/schema";
import { getSessionUser, requireWorkspaceRole, WorkspaceRoleError } from "@/lib/auth-helpers";
import { createInviteToken, INVITE_TTL_MS, normalizeInviteEmail, sendInviteEmail } from "@/lib/workspace-invites";

const uuidParam = z.string().uuid();

function getAppOrigin(req: Request): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost ?? req.headers.get("host");
  const forwardedProto = req.headers.get("x-forwarded-proto");
  if (host) {
    const proto = forwardedProto ?? (host.includes("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return new URL(req.url).origin;
}

async function loadInvite(workspaceId: string, inviteId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: workspaceInvites.id,
      workspaceId: workspaceInvites.workspaceId,
      workspaceName: workspaces.name,
      email: workspaceInvites.email,
      role: workspaceInvites.role,
      token: workspaceInvites.token,
      invitedBy: workspaceInvites.invitedBy,
      invitedByEmail: users.email,
      expiresAt: workspaceInvites.expiresAt,
      acceptedAt: workspaceInvites.acceptedAt,
      declinedAt: workspaceInvites.declinedAt,
      cancelledAt: workspaceInvites.cancelledAt,
      createdAt: workspaceInvites.createdAt,
      updatedAt: workspaceInvites.updatedAt,
    })
    .from(workspaceInvites)
    .innerJoin(users, eq(users.id, workspaceInvites.invitedBy))
    .innerJoin(workspaces, eq(workspaces.id, workspaceInvites.workspaceId))
    .where(and(eq(workspaceInvites.workspaceId, workspaceId), eq(workspaceInvites.id, inviteId)))
    .limit(1);

  return rows[0] ?? null;
}

function serializeInvite(invite: Awaited<ReturnType<typeof loadInvite>>) {
  if (!invite) return null;
  const status = invite.acceptedAt
    ? "accepted"
    : invite.cancelledAt
      ? "cancelled"
      : invite.declinedAt
        ? "declined"
        : invite.expiresAt.getTime() < Date.now()
          ? "expired"
          : "pending";

  return {
    id: invite.id,
    workspaceId: invite.workspaceId,
    email: invite.email,
    role: invite.role,
    token: invite.token,
    invitedBy: invite.invitedBy,
    invitedByName: invite.invitedByEmail,
    expiresAt: invite.expiresAt.toISOString(),
    acceptedAt: invite.acceptedAt ? invite.acceptedAt.toISOString() : null,
    declinedAt: invite.declinedAt ? invite.declinedAt.toISOString() : null,
    cancelledAt: invite.cancelledAt ? invite.cancelledAt.toISOString() : null,
    createdAt: invite.createdAt.toISOString(),
    updatedAt: invite.updatedAt.toISOString(),
    status,
  };
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ workspaceId: string; inviteId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId: workspaceIdRaw, inviteId: inviteIdRaw } = await context.params;
  const parsedWorkspaceId = uuidParam.safeParse(workspaceIdRaw);
  const parsedInviteId = uuidParam.safeParse(inviteIdRaw);
  if (!parsedWorkspaceId.success || !parsedInviteId.success) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  try {
    await requireWorkspaceRole(user.userId, parsedWorkspaceId.data, "owner");
  } catch (error) {
    if (error instanceof WorkspaceRoleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const invite = await loadInvite(parsedWorkspaceId.data, parsedInviteId.data);
  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const db = getDb();
  const now = new Date();
  const token = createInviteToken();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
  await db
    .update(workspaceInvites)
    .set({
      token,
      expiresAt,
      acceptedAt: null,
      declinedAt: null,
      cancelledAt: null,
      updatedAt: now,
    })
    .where(eq(workspaceInvites.id, invite.id));

  const inviter = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, user.userId))
    .limit(1);

  const sendResult = await sendInviteEmail({
    to: normalizeInviteEmail(invite.email),
    inviterName: inviter[0]?.email ?? "Tokn",
    workspaceName: invite.workspaceName,
    role: invite.role,
    inviteUrl: `${getAppOrigin(req)}/invite/${token}`,
    expiresAt,
  });

  if (!sendResult.ok) {
    return NextResponse.json({ error: sendResult.error }, { status: sendResult.status ?? 503 });
  }

  const emailSent = !sendResult.skipped;
  const emailNotice = sendResult.skipped
    ? "Invite was refreshed, but email delivery is disabled until an email provider is configured."
    : undefined;

  const updated = await loadInvite(parsedWorkspaceId.data, parsedInviteId.data);
  return NextResponse.json({ invite: serializeInvite(updated), emailSent, emailNotice });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ workspaceId: string; inviteId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId: workspaceIdRaw, inviteId: inviteIdRaw } = await context.params;
  const parsedWorkspaceId = uuidParam.safeParse(workspaceIdRaw);
  const parsedInviteId = uuidParam.safeParse(inviteIdRaw);
  if (!parsedWorkspaceId.success || !parsedInviteId.success) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  try {
    await requireWorkspaceRole(user.userId, parsedWorkspaceId.data, "owner");
  } catch (error) {
    if (error instanceof WorkspaceRoleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const invite = await loadInvite(parsedWorkspaceId.data, parsedInviteId.data);
  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const db = getDb();
  const now = new Date();
  await db
    .update(workspaceInvites)
    .set({ cancelledAt: now, updatedAt: now })
    .where(eq(workspaceInvites.id, invite.id));

  const updated = await loadInvite(parsedWorkspaceId.data, parsedInviteId.data);
  return NextResponse.json({ invite: serializeInvite(updated) });
}