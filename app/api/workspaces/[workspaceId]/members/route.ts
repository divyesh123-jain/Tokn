import { NextResponse } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { users, workspaceMembers, workspaces } from "@/db/schema";
import {
  getSessionUser,
  requireWorkspaceRole,
  WorkspaceRoleError,
} from "@/lib/auth-helpers";

const uuidParam = z.string().uuid();

const inviteSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["owner", "editor", "viewer"]),
});

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
    await requireWorkspaceRole(user.userId, workspaceId, "viewer");
  } catch (error) {
    if (error instanceof WorkspaceRoleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const db = getDb();
  const members = await db
    .select({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      email: users.email,
      role: workspaceMembers.role,
      createdAt: workspaceMembers.createdAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(asc(workspaceMembers.createdAt));

  return NextResponse.json({
    members: members.map((member) => ({
      ...member,
      createdAt: member.createdAt.toISOString(),
    })),
  });
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

  if (payload.data.role === "owner") {
    return NextResponse.json(
      { error: "Invite as editor/viewer first, then transfer ownership explicitly." },
      { status: 400 },
    );
  }

  const db = getDb();
  const workspaceRows = await db
    .select({ id: workspaces.id, kind: workspaces.kind })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  if (workspaceRows.length === 0) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const workspace = workspaceRows[0];
  if (workspace.kind !== "team") {
    return NextResponse.json(
      { error: "Member invitations are available only for team workspaces" },
      { status: 400 },
    );
  }

  const normalizedEmail = payload.data.email.trim().toLowerCase();
  const usersRows = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(sql`lower(${users.email}) = ${normalizedEmail}`)
    .limit(1);

  if (usersRows.length === 0) {
    return NextResponse.json(
      { error: "User not found. They need to sign up first." },
      { status: 404 },
    );
  }

  const invitedUser = usersRows[0];
  const existing = await db
    .select({ id: workspaceMembers.id, role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, invitedUser.id),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    if (existing[0].role === payload.data.role) {
      return NextResponse.json({ error: "User is already in this workspace" }, { status: 409 });
    }

    await db
      .update(workspaceMembers)
      .set({ role: payload.data.role })
      .where(eq(workspaceMembers.id, existing[0].id));

    const updatedRows = await db
      .select({
        id: workspaceMembers.id,
        userId: workspaceMembers.userId,
        email: users.email,
        role: workspaceMembers.role,
        createdAt: workspaceMembers.createdAt,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.id, existing[0].id))
      .limit(1);

    const member = updatedRows[0];
    return NextResponse.json({
      member: {
        ...member,
        createdAt: member.createdAt.toISOString(),
      },
      updated: true,
    });
  }

  const now = new Date();
  const inserted = await db
    .insert(workspaceMembers)
    .values({
      workspaceId,
      userId: invitedUser.id,
      role: payload.data.role,
      createdAt: now,
    })
    .returning({ id: workspaceMembers.id });

  const memberRows = await db
    .select({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      email: users.email,
      role: workspaceMembers.role,
      createdAt: workspaceMembers.createdAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.id, inserted[0].id))
    .limit(1);

  const member = memberRows[0];
  return NextResponse.json(
    {
      member: {
        ...member,
        createdAt: member.createdAt.toISOString(),
      },
      updated: false,
    },
    { status: 201 },
  );
}
