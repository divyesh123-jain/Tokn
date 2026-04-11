import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { users, workspaces, workspaceInvites, workspaceMembers } from "@/db/schema";
import { getSessionUser, requireWorkspaceRole, WorkspaceRoleError } from "@/lib/auth-helpers";
import { formatInviteCountdown } from "@/lib/invite-display";
import {
  createInviteToken,
  INVITE_TTL_MS,
  normalizeInviteEmail,
  sendInviteEmail,
} from "@/lib/workspace-invites";

const uuidParam = z.string().uuid();

const inviteSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["editor", "viewer"]),
});

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

async function serializeInvites(workspaceId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: workspaceInvites.id,
      workspaceId: workspaceInvites.workspaceId,
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
      workspaceName: workspaces.name,
    })
    .from(workspaceInvites)
    .innerJoin(users, eq(users.id, workspaceInvites.invitedBy))
    .innerJoin(workspaces, eq(workspaces.id, workspaceInvites.workspaceId))
    .where(eq(workspaceInvites.workspaceId, workspaceId));

  const now = Date.now();
  return rows.map((invite) => ({
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
    status:
      invite.acceptedAt
        ? "accepted"
        : invite.cancelledAt
          ? "cancelled"
          : invite.declinedAt
            ? "declined"
            : invite.expiresAt.getTime() < now
              ? "expired"
              : "pending",
    countdown: formatInviteCountdown(invite.expiresAt.toISOString(), now),
    workspaceName: invite.workspaceName,
  }));
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId: workspaceIdRaw } = await context.params;
  const parsedWorkspaceId = uuidParam.safeParse(workspaceIdRaw);
  if (!parsedWorkspaceId.success) {
    return NextResponse.json({ error: "Invalid workspaceId" }, { status: 400 });
  }

  const workspaceId = parsedWorkspaceId.data;
  try {
    await requireWorkspaceRole(user.userId, workspaceId, "owner");
  } catch (error) {
    if (error instanceof WorkspaceRoleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const invites = await serializeInvites(workspaceId);
  return NextResponse.json({ invites });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId: workspaceIdRaw } = await context.params;
  const parsedWorkspaceId = uuidParam.safeParse(workspaceIdRaw);
  if (!parsedWorkspaceId.success) {
    return NextResponse.json({ error: "Invalid workspaceId" }, { status: 400 });
  }

  const workspaceId = parsedWorkspaceId.data;
  try {
    await requireWorkspaceRole(user.userId, workspaceId, "owner");
  } catch (error) {
    if (error instanceof WorkspaceRoleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const payload = inviteSchema.safeParse(await req.json());
  if (!payload.success) {
    return NextResponse.json(
      { error: payload.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const db = getDb();
  const workspaceRows = await db
    .select({ id: workspaces.id, kind: workspaces.kind, name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  if (workspaceRows.length === 0) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const workspace = workspaceRows[0];
  if (workspace.kind !== "team") {
    return NextResponse.json({ error: "Invites are available only for team workspaces" }, { status: 400 });
  }

  const normalizedEmail = normalizeInviteEmail(payload.data.email);
  const self = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, user.userId))
    .limit(1);

  if (self[0]?.email?.toLowerCase() === normalizedEmail) {
    return NextResponse.json({ error: "You cannot invite yourself" }, { status: 400 });
  }

  const existingMember = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        sql`lower(${users.email}) = ${normalizedEmail}`,
      ),
    )
    .limit(1);

  if (existingMember.length > 0) {
    return NextResponse.json({ error: "This person is already a member" }, { status: 409 });
  }

  const existingInvite = await db
    .select({ id: workspaceInvites.id })
    .from(workspaceInvites)
    .where(and(eq(workspaceInvites.workspaceId, workspaceId), eq(workspaceInvites.email, normalizedEmail)))
    .limit(1);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
  const token = createInviteToken();

  let inviteId = existingInvite[0]?.id;
  if (inviteId) {
    await db
      .update(workspaceInvites)
      .set({
        email: normalizedEmail,
        role: payload.data.role,
        invitedBy: user.userId,
        token,
        expiresAt,
        acceptedAt: null,
        declinedAt: null,
        cancelledAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .where(eq(workspaceInvites.id, inviteId));
  } else {
    const inserted = await db
      .insert(workspaceInvites)
      .values({
        workspaceId,
        email: normalizedEmail,
        role: payload.data.role,
        invitedBy: user.userId,
        token,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: workspaceInvites.id });
    inviteId = inserted[0]?.id;
  }

  if (!inviteId) {
    return NextResponse.json({ error: "Could not create invite" }, { status: 500 });
  }

  const inviter = await db
    .select({ name: users.email })
    .from(users)
    .where(eq(users.id, user.userId))
    .limit(1);

  const inviteUrl = `${getAppOrigin(req)}/invite/${token}`;
  const sendResult = await sendInviteEmail({
    to: normalizedEmail,
    inviterName: inviter[0]?.name ?? "Tokn",
    workspaceName: workspace.name,
    role: payload.data.role,
    inviteUrl,
    expiresAt,
  });

  if (!sendResult.ok) {
    return NextResponse.json({ error: sendResult.error }, { status: sendResult.status ?? 503 });
  }

  const emailSent = !sendResult.skipped;
  const emailNotice = sendResult.skipped
    ? "Invite created. Email delivery is disabled until an email provider is configured."
    : undefined;

  const invites = await serializeInvites(workspaceId);
  const invite = invites.find((item) => item.id === inviteId) ?? null;

  return NextResponse.json({
    invite,
    invites,
    resent: Boolean(existingInvite[0]),
    emailSent,
    emailNotice,
  });
}