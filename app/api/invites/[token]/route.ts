import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { users, workspaceInvites, workspaceMembers, workspaces } from "@/db/schema";
import { getSessionUserState, getSessionUser } from "@/lib/auth-helpers";
import {
  getInviteStatus,
  normalizeInviteEmail,
  sendWorkspaceJoinEmail,
} from "@/lib/workspace-invites";

const tokenParam = z.string().uuid();

async function loadInvite(token: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: workspaceInvites.id,
      workspaceId: workspaceInvites.workspaceId,
      workspaceName: workspaces.name,
      workspaceSlug: workspaces.slug,
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
    .innerJoin(workspaces, eq(workspaces.id, workspaceInvites.workspaceId))
    .innerJoin(users, eq(users.id, workspaceInvites.invitedBy))
    .where(eq(workspaceInvites.token, token))
    .limit(1);

  const invite = rows[0];
  if (!invite) return null;

  const status = getInviteStatus(invite);
  return {
    id: invite.id,
    workspaceId: invite.workspaceId,
    workspaceName: invite.workspaceName,
    workspaceSlug: invite.workspaceSlug,
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

export async function GET(
  _req: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token: tokenRaw } = await context.params;
  const parsedToken = tokenParam.safeParse(tokenRaw);
  if (!parsedToken.success) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const invite = await loadInvite(parsedToken.data);
  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  return NextResponse.json({ invite });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ token: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionState = await getSessionUserState();
  const { token: tokenRaw } = await context.params;
  const parsedToken = tokenParam.safeParse(tokenRaw);
  if (!parsedToken.success) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const invite = await loadInvite(parsedToken.data);
  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.status === "cancelled") {
    return NextResponse.json({ error: "This invite is no longer valid" }, { status: 410 });
  }
  if (invite.status === "declined") {
    return NextResponse.json({ error: "This invite is no longer valid" }, { status: 410 });
  }
  if (invite.status === "expired") {
    return NextResponse.json({ error: "This invite has expired" }, { status: 410 });
  }
  if (normalizeInviteEmail(sessionState.email ?? user.email) !== normalizeInviteEmail(invite.email)) {
    return NextResponse.json({ error: `This invite was sent to ${invite.email}` }, { status: 403 });
  }

  const db = getDb();
  const memberRows = await db
    .select({ id: workspaceMembers.id, role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, invite.workspaceId), eq(workspaceMembers.userId, user.userId)))
    .limit(1);

  if (memberRows.length > 0) {
    return NextResponse.json({
      ok: true,
      alreadyMember: true,
      workspace: {
        id: invite.workspaceId,
        name: invite.workspaceName,
        slug: invite.workspaceSlug,
        role: memberRows[0].role,
      },
    });
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .insert(workspaceMembers)
      .values({
        workspaceId: invite.workspaceId,
        userId: user.userId,
        role: invite.role,
        createdAt: now,
      })
      .onConflictDoNothing({ target: [workspaceMembers.workspaceId, workspaceMembers.userId] });

    await tx
      .update(workspaceInvites)
      .set({ acceptedAt: now, declinedAt: null, cancelledAt: null, updatedAt: now })
      .where(eq(workspaceInvites.id, invite.id));
  });

  const ownerRows = await db
    .select({ email: users.email })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(and(eq(workspaceMembers.workspaceId, invite.workspaceId), eq(workspaceMembers.role, "owner")))
    .limit(1);

  if (ownerRows[0]?.email) {
    const joinEmailResult = await sendWorkspaceJoinEmail({
      to: ownerRows[0].email,
      workspaceName: invite.workspaceName,
      memberName: user.email,
      role: invite.role,
    });
    if (!joinEmailResult.ok) {
      console.warn("Workspace join notification email failed");
    }
  }

  return NextResponse.json({
    ok: true,
    workspace: {
      id: invite.workspaceId,
      name: invite.workspaceName,
      slug: invite.workspaceSlug,
      role: invite.role,
    },
  });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ token: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token: tokenRaw } = await context.params;
  const parsedToken = tokenParam.safeParse(tokenRaw);
  if (!parsedToken.success) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const invite = await loadInvite(parsedToken.data);
  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.status !== "pending") {
    return NextResponse.json({ error: "This invite is no longer valid" }, { status: 410 });
  }

  const sessionState = await getSessionUserState();
  if (normalizeInviteEmail(sessionState.email ?? user.email) !== normalizeInviteEmail(invite.email)) {
    return NextResponse.json({ error: `This invite was sent to ${invite.email}` }, { status: 403 });
  }

  const db = getDb();
  await db
    .update(workspaceInvites)
    .set({ declinedAt: new Date(), updatedAt: new Date() })
    .where(eq(workspaceInvites.id, invite.id));

  return NextResponse.json({ ok: true });
}