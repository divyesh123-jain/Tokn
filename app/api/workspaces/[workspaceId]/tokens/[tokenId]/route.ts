import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { motionTokens } from "@/db/schema";
import {
  getSessionUser,
  requireWorkspaceRole,
  WorkspaceRoleError,
} from "@/lib/auth-helpers";
import { getTokenNameValidationError } from "@/lib/token-name";
import { motionTokenDbRowToItem, motionTokenItemToDbFields } from "@/lib/token-db";

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

const tokenPatchSchema = z.object({
  name: tokenNameSchema.optional(),
  category: tokenCategorySchema.optional(),
  durationMs: z.number().int().min(0).max(10_000).optional(),
  delayMs: z.number().int().min(0).max(5_000).optional(),
  easing: easingSchema.optional(),
  yOffset: z.number().int().min(-1_000).max(1_000).optional(),
  scaleStart: z.number().min(0.01).max(3).optional(),
  opacityStart: z.number().min(0).max(1).optional(),
  isSpring: z.boolean().optional(),
  springStiffness: z.number().min(1).max(1_000).optional(),
  springDamping: z.number().min(0.1).max(100).optional(),
  springMass: z.number().min(0.1).max(20).optional(),
  deprecated: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ workspaceId: string; tokenId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId: workspaceIdRaw, tokenId: tokenIdRaw } = await context.params;
  const db = getDb();
  const parsedWorkspaceId = uuidParam.safeParse(workspaceIdRaw);
  const parsedTokenId = uuidParam.safeParse(tokenIdRaw);
  if (!parsedWorkspaceId.success || !parsedTokenId.success) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const workspaceId = parsedWorkspaceId.data;
  const tokenId = parsedTokenId.data;
  try {
    await requireWorkspaceRole(user.userId, workspaceId, "editor");
  } catch (error) {
    if (error instanceof WorkspaceRoleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const payload = tokenPatchSchema.safeParse(await req.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
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
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId: workspaceIdRaw, tokenId: tokenIdRaw } = await context.params;
  const db = getDb();
  const parsedWorkspaceId = uuidParam.safeParse(workspaceIdRaw);
  const parsedTokenId = uuidParam.safeParse(tokenIdRaw);
  if (!parsedWorkspaceId.success || !parsedTokenId.success) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const workspaceId = parsedWorkspaceId.data;
  const tokenId = parsedTokenId.data;
  try {
    await requireWorkspaceRole(user.userId, workspaceId, "editor");
  } catch (error) {
    if (error instanceof WorkspaceRoleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const existingRows = await db
    .select({ id: motionTokens.id, publishedAt: motionTokens.publishedAt })
    .from(motionTokens)
    .where(and(eq(motionTokens.id, tokenId), eq(motionTokens.workspaceId, workspaceId)));

  if (existingRows.length === 0) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  const now = new Date();
  const body = (await req.json().catch(() => null)) as { soft?: boolean } | null;
  const shouldSoftDelete = Boolean(body?.soft) || Boolean(existingRows[0].publishedAt);

  if (shouldSoftDelete) {
    const updatedRows = await db
      .update(motionTokens)
      .set({ deprecated: true, updatedAt: now })
      .where(and(eq(motionTokens.id, tokenId), eq(motionTokens.workspaceId, workspaceId)))
      .returning();

    const updatedItem = motionTokenDbRowToItem(
      updatedRows[0] as unknown as { workspaceId: string; id: string } & typeof updatedRows[0],
    );

    return NextResponse.json({ deleted: false, deprecated: true, token: updatedItem });
  }

  await db
    .delete(motionTokens)
    .where(and(eq(motionTokens.id, tokenId), eq(motionTokens.workspaceId, workspaceId)));

  return NextResponse.json({ deleted: true });
}

