import { NextRequest, NextResponse } from "next/server";
import { eq, and, asc, gt, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { motionTokens, workspaces } from "@/db/schema";
import {
  getSessionUser,
  requireWorkspaceRole,
  WorkspaceRoleError,
} from "@/lib/auth-helpers";
import { SPRING_DEFAULTS } from "@/lib/motif";
import { getTokenNameValidationError } from "@/lib/token-name";
import { motionTokenItemToDbFields, motionTokenDbRowToItem } from "@/lib/token-db";

const tokenCategorySchema = z.enum(["enter", "exit", "spring", "feedback"]);

const tokenNameSchema = z
  .string()
  .trim()
  .superRefine((name, ctx) => {
    const error = getTokenNameValidationError(name);
    if (error) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
    }
  });

const easingSchema = z
  .enum(["linear", "ease", "ease-in", "ease-out", "ease-in-out"])
  .or(
    z.string().regex(
      /^cubic-bezier\(\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*\)$/,
      "Easing must be a known preset or a valid cubic-bezier()",
    ),
  );

const uuidParam = z.string().uuid();

const tokenCreateSchema = z.object({
  name: tokenNameSchema,
  category: tokenCategorySchema,
  durationMs: z.number().int().min(0).max(10_000),
  delayMs: z.number().int().min(0).max(5_000),
  easing: easingSchema,
  yOffset: z.number().int().min(-1_000).max(1_000),
  scaleStart: z.number().min(0.01).max(3),
  opacityStart: z.number().min(0).max(1),
  isSpring: z.boolean(),
  springStiffness: z.number().min(1).max(1_000).optional(),
  springDamping: z.number().min(0.1).max(100).optional(),
  springMass: z.number().min(0.1).max(20).optional(),
  deprecated: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId: workspaceIdRaw } = await context.params;
  const db = getDb();
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

  const searchParams = req.nextUrl.searchParams;

  const rawLimit = searchParams.get("limit");
  const parsedLimit = z.coerce.number().int().min(1).max(100).safeParse(rawLimit ?? "50");
  if (!parsedLimit.success) {
    return NextResponse.json({ error: "Invalid limit" }, { status: 400 });
  }
  const limit = parsedLimit.data;

  const rawCursor = searchParams.get("cursor");
  let cursor: string | null = null;
  if (rawCursor) {
    const parsedCursor = uuidParam.safeParse(rawCursor);
    if (!parsedCursor.success) {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }
    cursor = parsedCursor.data;
  }

  const rawCategory = searchParams.get("category");
  let category: z.infer<typeof tokenCategorySchema> | null = null;
  if (rawCategory) {
    const parsedCategory = tokenCategorySchema.safeParse(rawCategory);
    if (!parsedCategory.success) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    category = parsedCategory.data;
  }

  const totalWhere = category
    ? and(eq(motionTokens.workspaceId, workspaceId), eq(motionTokens.category, category))
    : eq(motionTokens.workspaceId, workspaceId);

  const totalRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(motionTokens)
    .where(totalWhere);
  const total = Number(totalRows[0]?.count ?? 0);

  const shouldPaginate = Boolean(cursor) || searchParams.has("limit") || total > 50;

  const tokenWhere = cursor
    ? and(
        eq(motionTokens.workspaceId, workspaceId),
        category ? eq(motionTokens.category, category) : undefined,
        gt(motionTokens.id, cursor),
      )
    : category
      ? and(eq(motionTokens.workspaceId, workspaceId), eq(motionTokens.category, category))
      : eq(motionTokens.workspaceId, workspaceId);

  const rows = shouldPaginate
    ? await db
        .select()
        .from(motionTokens)
        .where(tokenWhere)
        .orderBy(asc(motionTokens.id))
        .limit(limit + 1)
    : await db
        .select()
        .from(motionTokens)
        .where(tokenWhere)
        .orderBy(asc(motionTokens.id));

  const hasMore = shouldPaginate ? rows.length > limit : false;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const tokens = pageRows.map((r) =>
    motionTokenDbRowToItem(r as unknown as { workspaceId: string; id: string } & typeof r),
  );

  const nextCursor = hasMore ? pageRows[pageRows.length - 1]?.id ?? null : null;

  return NextResponse.json({
    tokens,
    nextCursor,
    hasMore,
    total,
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId: workspaceIdRaw } = await context.params;
  const db = getDb();
  const parsedWorkspaceId = uuidParam.safeParse(workspaceIdRaw);
  if (!parsedWorkspaceId.success) {
    return NextResponse.json({ error: "Invalid workspaceId" }, { status: 400 });
  }

  const workspaceId = parsedWorkspaceId.data;
  try {
    await requireWorkspaceRole(user.userId, workspaceId, "editor");
  } catch (error) {
    if (error instanceof WorkspaceRoleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const workspaceRows = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId));
  if (workspaceRows.length === 0) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }
  const workspace = workspaceRows[0];

  if (workspace.kind === "individual") {
    const countRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(motionTokens)
      .where(and(eq(motionTokens.workspaceId, workspaceId), eq(motionTokens.deprecated, false)));
    const activeCount = Number(countRows[0]?.count ?? 0);
    if (activeCount >= 20) {
      return NextResponse.json(
        { error: "Token limit reached. Upgrade to Solo for unlimited tokens." },
        { status: 403 },
      );
    }
  }

  const payload = tokenCreateSchema.safeParse(await req.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const token = payload.data;
  const now = new Date();

  const conflict = await db
    .select()
    .from(motionTokens)
    .where(and(eq(motionTokens.workspaceId, workspaceId), eq(motionTokens.name, token.name)));
  if (conflict.length > 0) {
    return NextResponse.json({ error: "Token name already exists" }, { status: 409 });
  }

  const itemFields = motionTokenItemToDbFields({
    name: token.name,
    category: token.category,
    durationMs: token.durationMs,
    delayMs: token.delayMs,
    easing: token.easing,
    yOffset: token.yOffset,
    scaleStart: token.scaleStart,
    opacityStart: token.opacityStart,
    isSpring: token.isSpring,
    springStiffness: token.springStiffness ?? SPRING_DEFAULTS.springStiffness,
    springDamping: token.springDamping ?? SPRING_DEFAULTS.springDamping,
    springMass: token.springMass ?? SPRING_DEFAULTS.springMass,
    deprecated: token.deprecated ?? false,
  });

  const inserted = await db
    .insert(motionTokens)
    .values({
      workspaceId,
      createdAt: now,
      updatedAt: now,
      ...itemFields,
    })
    .returning();

  const created = motionTokenDbRowToItem(
    inserted[0] as unknown as { workspaceId: string; id: string } & typeof inserted[0],
  );

  return NextResponse.json({ token: created }, { status: 201 });
}

