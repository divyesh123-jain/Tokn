import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { users, workspaceMembers } from "@/db/schema";
import {
  getSessionUser,
  requireWorkspaceRole,
  WorkspaceRoleError,
} from "@/lib/auth-helpers";

const uuidParam = z.string().uuid();

const patchMemberSchema = z.object({
  role: z.enum(["owner", "editor", "viewer"]),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ workspaceId: string; memberId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId: workspaceIdRaw, memberId: memberIdRaw } = await context.params;
  const parsedWorkspaceId = uuidParam.safeParse(workspaceIdRaw);
  const parsedMemberId = uuidParam.safeParse(memberIdRaw);
  if (!parsedWorkspaceId.success || !parsedMemberId.success) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const workspaceId = parsedWorkspaceId.data;
  const memberId = parsedMemberId.data;

  try {
    await requireWorkspaceRole(user.userId, workspaceId, "owner");
  } catch (error) {
    if (error instanceof WorkspaceRoleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const payload = patchMemberSchema.safeParse(await req.json());
  if (!payload.success) {
    return NextResponse.json(
      { error: payload.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const db = getDb();
  const members = await db
    .select({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      createdAt: workspaceMembers.createdAt,
      email: users.email,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId));

  const target = members.find((member) => member.id === memberId);
  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (target.role === payload.data.role) {
    return NextResponse.json({
      member: {
        ...target,
        createdAt: target.createdAt.toISOString(),
      },
    });
  }

  if (target.role === "owner" && payload.data.role !== "owner") {
    return NextResponse.json(
      { error: "Owner role cannot be removed directly. Transfer ownership first." },
      { status: 400 },
    );
  }

  if (payload.data.role === "owner") {
    const currentOwner = members.find((member) => member.role === "owner");
    if (!currentOwner) {
      return NextResponse.json(
        { error: "Workspace owner not found" },
        { status: 500 },
      );
    }

    if (currentOwner.id !== target.id) {
      await db
        .update(workspaceMembers)
        .set({ role: "editor" })
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.id, currentOwner.id),
          ),
        );
    }

    await db
      .update(workspaceMembers)
      .set({ role: "owner" })
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.id, target.id),
        ),
      );
  } else {
    await db
      .update(workspaceMembers)
      .set({ role: payload.data.role })
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.id, target.id),
        ),
      );
  }

  const updatedRows = await db
    .select({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      createdAt: workspaceMembers.createdAt,
      email: users.email,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.id, target.id))
    .limit(1);

  const updated = updatedRows[0];
  return NextResponse.json({
    member: {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
    },
  });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ workspaceId: string; memberId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId: workspaceIdRaw, memberId: memberIdRaw } = await context.params;
  const parsedWorkspaceId = uuidParam.safeParse(workspaceIdRaw);
  const parsedMemberId = uuidParam.safeParse(memberIdRaw);
  if (!parsedWorkspaceId.success || !parsedMemberId.success) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const workspaceId = parsedWorkspaceId.data;
  const memberId = parsedMemberId.data;

  try {
    await requireWorkspaceRole(user.userId, workspaceId, "owner");
  } catch (error) {
    if (error instanceof WorkspaceRoleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const db = getDb();
  const memberRows = await db
    .select({ id: workspaceMembers.id, role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.id, memberId),
      ),
    )
    .limit(1);

  const member = memberRows[0];
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (member.role === "owner") {
    return NextResponse.json(
      { error: "Owner cannot be removed. Transfer ownership first." },
      { status: 400 },
    );
  }

  await db
    .delete(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.id, memberId),
      ),
    );

  return NextResponse.json({ ok: true });
}
