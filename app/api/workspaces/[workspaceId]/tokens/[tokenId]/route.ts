import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { motionTokens } from "@/db/schema";
import { motionTokenDbRowToItem, motionTokenItemToDbFields } from "@/lib/token-db";

const tokenCategorySchema = z.enum(["enter", "exit", "spring", "feedback"]);

const uuidParam = z.string().uuid();

const tokenPatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: tokenCategorySchema.optional(),
  durationMs: z.number().int().min(0).max(10_000).optional(),
  delayMs: z.number().int().min(0).max(10_000).optional(),
  easing: z.string().min(1).max(200).optional(),
  yOffset: z.number().int().min(-10_000).max(10_000).optional(),
  scaleStart: z.number().min(0).max(10).optional(),
  opacityStart: z.number().min(0).max(1).optional(),
  isSpring: z.boolean().optional(),
  springStiffness: z.number().int().min(1).max(10_000).optional(),
  springDamping: z.number().int().min(0).max(10_000).optional(),
  springMass: z.number().min(0).max(10).optional(),
  deprecated: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ workspaceId: string; tokenId: string }> },
) {
  const { workspaceId: workspaceIdRaw, tokenId: tokenIdRaw } = await context.params;
  const db = getDb();
  const parsedWorkspaceId = uuidParam.safeParse(workspaceIdRaw);
  const parsedTokenId = uuidParam.safeParse(tokenIdRaw);
  if (!parsedWorkspaceId.success || !parsedTokenId.success) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const workspaceId = parsedWorkspaceId.data;
  const tokenId = parsedTokenId.data;

  const payload = tokenPatchSchema.safeParse(await req.json());
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const now = new Date();

  const existingRows = await db
    .select()
    .from(motionTokens)
    .where(and(eq(motionTokens.id, tokenId), eq(motionTokens.workspaceId, workspaceId)));

  if (existingRows.length === 0) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  const existing = existingRows[0] as unknown as {
    workspaceId: string;
    id: string;
    name: string;
    category: string;
    durationMs: number;
    delayMs: number;
    easing: string;
    yOffset: number;
    scaleStart: number;
    opacityStart: number;
    isSpring: boolean;
    springStiffness: number;
    springDamping: number;
    springMass: number;
    deprecated: boolean;
  };

  const existingItem = motionTokenDbRowToItem(existing);

  const nextItem = {
    ...existingItem,
    ...payload.data,
  };

  if (payload.data.name && payload.data.name !== existingItem.name) {
    const conflictRows = await db
      .select()
      .from(motionTokens)
      .where(and(eq(motionTokens.workspaceId, workspaceId), eq(motionTokens.name, payload.data.name)));

    const isConflict = conflictRows.some((r) => r.id !== tokenId);
    if (isConflict) {
      return NextResponse.json({ error: "Token name already exists" }, { status: 409 });
    }
  }

  const dbFields = motionTokenItemToDbFields({
    name: nextItem.name,
    category: nextItem.category,
    durationMs: nextItem.durationMs,
    delayMs: nextItem.delayMs,
    easing: nextItem.easing,
    yOffset: nextItem.yOffset,
    scaleStart: nextItem.scaleStart,
    opacityStart: nextItem.opacityStart,
    isSpring: nextItem.isSpring,
    springStiffness: nextItem.springStiffness,
    springDamping: nextItem.springDamping,
    springMass: nextItem.springMass,
    deprecated: nextItem.deprecated,
  });

  const updated = await db
    .update(motionTokens)
    .set({
      ...dbFields,
      updatedAt: now,
    })
    .where(and(eq(motionTokens.id, tokenId), eq(motionTokens.workspaceId, workspaceId)))
    .returning();

  const updatedItem = motionTokenDbRowToItem(
    updated[0] as unknown as { workspaceId: string; id: string } & typeof updated[0],
  );

  return NextResponse.json({ token: updatedItem });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ workspaceId: string; tokenId: string }> },
) {
  const { workspaceId: workspaceIdRaw, tokenId: tokenIdRaw } = await context.params;
  const db = getDb();
  const parsedWorkspaceId = uuidParam.safeParse(workspaceIdRaw);
  const parsedTokenId = uuidParam.safeParse(tokenIdRaw);
  if (!parsedWorkspaceId.success || !parsedTokenId.success) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const workspaceId = parsedWorkspaceId.data;
  const tokenId = parsedTokenId.data;

  const body = await req.json().catch(() => ({}));
  const soft = typeof body?.soft === "boolean" ? body.soft : true;

  const now = new Date();

  if (soft) {
    const updated = await db
      .update(motionTokens)
      .set({ deprecated: true, updatedAt: now })
      .where(and(eq(motionTokens.id, tokenId), eq(motionTokens.workspaceId, workspaceId)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    return NextResponse.json({ token: motionTokenDbRowToItem(updated[0] as any) });
  }

  const deleted = await db
    .delete(motionTokens)
    .where(and(eq(motionTokens.id, tokenId), eq(motionTokens.workspaceId, workspaceId)))
    .returning();

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  return NextResponse.json({ token: motionTokenDbRowToItem(deleted[0] as any) });
}

