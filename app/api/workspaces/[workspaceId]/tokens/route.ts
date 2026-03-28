import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { motionTokens, workspaces } from "@/db/schema";
import { getSessionUser, getWorkspaceMemberRole } from "@/lib/auth-helpers";
import { motionTokenItemToDbFields, motionTokenDbRowToItem } from "@/lib/token-db";

const tokenCategorySchema = z.enum(["enter", "exit", "spring", "feedback"]);

const uuidParam = z.string().uuid();

const tokenCreateSchema = z.object({
  name: z.string().min(1).max(200),
  category: tokenCategorySchema,
  durationMs: z.number().int().min(0).max(10_000),
  delayMs: z.number().int().min(0).max(10_000),
  easing: z.string().min(1).max(200),
  yOffset: z.number().int().min(-10_000).max(10_000),
  scaleStart: z.number().min(0).max(10),
  opacityStart: z.number().min(0).max(1),
  isSpring: z.boolean(),
  springStiffness: z.number().int().min(1).max(10_000),
  springDamping: z.number().int().min(0).max(10_000),
  springMass: z.number().min(0).max(10),
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
  const role = await getWorkspaceMemberRole(user.userId, workspaceId);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select()
    .from(motionTokens)
    .where(eq(motionTokens.workspaceId, workspaceId));

  const tokens = rows.map((r) =>
    motionTokenDbRowToItem(r as unknown as { workspaceId: string; id: string } & typeof r),
  );

  return NextResponse.json({ tokens });
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

  const memberRole = await getWorkspaceMemberRole(user.userId, workspaceId);
  if (!memberRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const workspaceRows = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId));
  if (workspaceRows.length === 0) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const payload = tokenCreateSchema.safeParse(await req.json());
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
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
    springStiffness: token.springStiffness,
    springDamping: token.springDamping,
    springMass: token.springMass,
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

