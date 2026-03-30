import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { motionTokens, workspaceMembers, workspaces } from "@/db/schema";
import { getSessionUser } from "@/lib/auth-helpers";
import { motionTokenItemToDbFields } from "@/lib/token-db";
import { buildWorkspacePreviewSlug, workspaceNameToSlug } from "@/lib/workspace-slug";
import {
  MOTION_PRESETS,
  seedDefaultWorkspaceTokens,
  type MotionPreset,
} from "@/lib/workspace-presets";

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(200),
  kind: z.enum(["individual", "team"]),
  preset: z.enum(MOTION_PRESETS).optional(),
});

function isMissingSlugColumnError(error: unknown) {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === "42703" || e?.cause?.code === "42703";
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  let rows: Array<{
    id: string;
    name: string;
    slug?: string;
    kind: string;
    createdAt: Date;
    role: string;
  }> = [];

  try {
    rows = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        kind: workspaces.kind,
        createdAt: workspaces.createdAt,
        role: workspaceMembers.role,
      })
      .from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, user.userId))
      .orderBy(desc(workspaces.createdAt));
  } catch (error) {
    if (!isMissingSlugColumnError(error)) throw error;
    rows = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        kind: workspaces.kind,
        createdAt: workspaces.createdAt,
        role: workspaceMembers.role,
      })
      .from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, user.userId))
      .orderBy(desc(workspaces.createdAt));
  }

  return NextResponse.json({
    workspaces: rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug || buildWorkspacePreviewSlug(r.name, r.id),
      kind: r.kind,
      createdAt: r.createdAt.toISOString(),
      role: r.role,
    })),
  });
}

async function ensureUniqueWorkspaceSlug(base: string) {
  const db = getDb();
  let attempt = 1;
  let candidate = base;
  while (attempt < 500) {
    let rows: Array<{ id: string }> = [];
    try {
      rows = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.slug, candidate))
        .limit(1);
    } catch (error) {
      if (!isMissingSlugColumnError(error)) throw error;
      return base;
    }
    if (rows.length === 0) {
      return candidate;
    }
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createWorkspaceSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { name, kind } = parsed.data;
  const trimmedName = name.trim();
  const preset: MotionPreset = parsed.data.preset ?? "minimal";
  const db = getDb();
  const now = new Date();
  const slug = await ensureUniqueWorkspaceSlug(workspaceNameToSlug(trimmedName));

  const existing = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaceMembers.userId, user.userId),
        sql`lower(${workspaces.name}) = ${trimmedName.toLowerCase()}`,
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Workspace with this name already exists" },
      { status: 409 },
    );
  }

  let insertedWorkspaces: Array<{ id: string }> = [];
  try {
    insertedWorkspaces = await db
      .insert(workspaces)
      .values({ name: trimmedName, slug, kind, createdAt: now })
      .returning({ id: workspaces.id });
  } catch (error) {
    if (!isMissingSlugColumnError(error)) throw error;
    const insertedRaw = await db.execute(
      sql`insert into workspaces (name, kind, created_at) values (${trimmedName}, ${kind}, ${now}) returning id`,
    );
    const rows = (insertedRaw as unknown as { rows?: Array<{ id: string }> }).rows ?? [];
    insertedWorkspaces = rows;
  }

  const workspaceId = insertedWorkspaces[0].id;

  await db.insert(workspaceMembers).values({
    workspaceId,
    userId: user.userId,
    role: "owner",
    createdAt: now,
  });

  const tokenRows = seedDefaultWorkspaceTokens(preset).map((token) => {
    return {
      workspaceId,
      createdAt: now,
      updatedAt: now,
      ...motionTokenItemToDbFields(token),
    };
  });

  await db.insert(motionTokens).values(tokenRows);

  return NextResponse.json({
    workspace: {
      id: workspaceId,
      name: trimmedName,
      slug: buildWorkspacePreviewSlug(trimmedName, workspaceId),
      kind,
      createdAt: now.toISOString(),
      role: "owner",
    },
  });
}
