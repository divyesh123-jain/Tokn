import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { motionTokens } from "@/db/schema";
import {
  getSessionUser,
  requireWorkspaceRole,
  WorkspaceRoleError,
} from "@/lib/auth-helpers";

const uuidParam = z.string().uuid();
const publishSchema = z.object({
  version: z
    .string()
    .trim()
    .regex(/^v?\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/, "Version must look like 1.2.0"),
});

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

  const payload = publishSchema.safeParse(await req.json());
  if (!payload.success) {
    return NextResponse.json(
      { error: payload.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
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

  const db = getDb();
  const now = new Date();
  const version = payload.data.version.startsWith("v")
    ? payload.data.version
    : `v${payload.data.version}`;

  const updated = await db
    .update(motionTokens)
    .set({
      publishedAt: now,
      publishedVersion: version,
      updatedAt: now,
    })
    .where(and(eq(motionTokens.workspaceId, workspaceId), eq(motionTokens.deprecated, false)))
    .returning({ id: motionTokens.id });

  if (updated.length === 0) {
    return NextResponse.json({ error: "No active tokens to publish" }, { status: 400 });
  }

  return NextResponse.json({
    publishedVersion: version,
    publishedAt: now.toISOString(),
    tokenCount: updated.length,
  });
}
