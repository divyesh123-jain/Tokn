import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { workspaces } from "@/db/schema";
import { getSessionUser, getWorkspaceMemberRole } from "@/lib/auth-helpers";
import { buildWorkspacePreviewSlug } from "@/lib/workspace-slug";

const uuidParam = z.string().uuid();

const patchWorkspaceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens")
    .optional(),
});

function isMissingSlugColumnError(error: unknown) {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === "42703" || e?.cause?.code === "42703";
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
  let rows: Array<{
    id: string;
    name: string;
    slug?: string;
    kind: string;
    createdAt: Date;
  }> = [];

  try {
    rows = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId));
  } catch (error) {
    if (!isMissingSlugColumnError(error)) throw error;
    rows = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        kind: workspaces.kind,
        createdAt: workspaces.createdAt,
      })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId));
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const w = rows[0];
  return NextResponse.json({
    workspace: {
      id: w.id,
      name: w.name,
      slug: w.slug || buildWorkspacePreviewSlug(w.name, w.id),
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

  if (body.data.name === undefined && body.data.slug === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const db = getDb();
  if (body.data.slug !== undefined) {
    try {
      const existing = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(and(eq(workspaces.slug, body.data.slug), eq(workspaces.id, workspaceId)))
        .limit(1);
      if (existing.length === 0) {
        const slugConflict = await db
          .select({ id: workspaces.id })
          .from(workspaces)
          .where(eq(workspaces.slug, body.data.slug))
          .limit(1);
        if (slugConflict.length > 0) {
          return NextResponse.json({ error: "Slug is already taken" }, { status: 409 });
        }
      }
    } catch (error) {
      if (!isMissingSlugColumnError(error)) throw error;
      return NextResponse.json(
        { error: "Slug editing requires database migration" },
        { status: 400 },
      );
    }
  }

  const nextPatch: { name?: string; slug?: string } = {};
  if (body.data.name !== undefined) {
    nextPatch.name = body.data.name.trim();
  }
  if (body.data.slug !== undefined) {
    nextPatch.slug = body.data.slug;
  }

  let rows: Array<{
    id: string;
    name: string;
    slug?: string;
    kind: string;
    createdAt: Date;
  }> = [];
  try {
    rows = await db
      .update(workspaces)
      .set(nextPatch)
      .where(eq(workspaces.id, workspaceId))
      .returning();
  } catch (error) {
    if (!isMissingSlugColumnError(error)) throw error;
    if (body.data.slug !== undefined) {
      return NextResponse.json(
        { error: "Slug editing requires database migration" },
        { status: 400 },
      );
    }
    rows = await db
      .update(workspaces)
      .set({ name: body.data.name?.trim() })
      .where(eq(workspaces.id, workspaceId))
      .returning({
        id: workspaces.id,
        name: workspaces.name,
        kind: workspaces.kind,
        createdAt: workspaces.createdAt,
      });
  }

  const w = rows[0];
  return NextResponse.json({
    workspace: {
      id: w.id,
      name: w.name,
      slug: w.slug || buildWorkspacePreviewSlug(w.name, w.id),
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
