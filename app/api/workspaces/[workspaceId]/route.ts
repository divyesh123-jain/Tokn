import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { workspaces } from "@/db/schema";
import { getSessionUser, getWorkspaceMemberRole } from "@/lib/auth-helpers";

const uuidParam = z.string().uuid();

const patchWorkspaceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
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
  const parsed = uuidParam.safeParse(workspaceIdRaw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid workspaceId" }, { status: 400 });
  }

  const workspaceId = parsed.data;
  const role = await getWorkspaceMemberRole(user.userId, workspaceId);
  if (!role) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const db = getDb();
  const rows = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId));
  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const w = rows[0];
  return NextResponse.json({
    workspace: {
      id: w.id,
      name: w.name,
      kind: w.kind,
      createdAt: w.createdAt.toISOString(),
      role,
    },
  });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId: workspaceIdRaw } = await context.params;
  const parsed = uuidParam.safeParse(workspaceIdRaw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid workspaceId" }, { status: 400 });
  }

  const workspaceId = parsed.data;
  const role = await getWorkspaceMemberRole(user.userId, workspaceId);
  if (!role) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = patchWorkspaceSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.data.name === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const db = getDb();
  const rows = await db
    .update(workspaces)
    .set({ name: body.data.name })
    .where(eq(workspaces.id, workspaceId))
    .returning();

  const w = rows[0];
  return NextResponse.json({
    workspace: {
      id: w.id,
      name: w.name,
      kind: w.kind,
      createdAt: w.createdAt.toISOString(),
      role,
    },
  });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId: workspaceIdRaw } = await context.params;
  const parsed = uuidParam.safeParse(workspaceIdRaw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid workspaceId" }, { status: 400 });
  }

  const workspaceId = parsed.data;
  const role = await getWorkspaceMemberRole(user.userId, workspaceId);
  if (!role) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
  return NextResponse.json({ ok: true });
}
