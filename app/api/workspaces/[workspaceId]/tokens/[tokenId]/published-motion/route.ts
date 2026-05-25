import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { motionTokens, workspaceReleases } from "@/db/schema";
import { getSessionUser, requireWorkspaceRole, WorkspaceRoleError } from "@/lib/auth-helpers";
import { parseWorkspaceSdkSnapshotJson, sdkTokenJsonToMotionPatch } from "@/lib/sdk-published-motion";

function isMissingReleaseTableError(error: unknown) {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === "42P01" || e?.cause?.code === "42P01";
}

const uuidParam = z.string().uuid();

export async function GET(
  _req: Request,
  context: { params: Promise<{ workspaceId: string; tokenId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId: workspaceIdRaw, tokenId: tokenIdRaw } = await context.params;
  const parsedWorkspaceId = uuidParam.safeParse(workspaceIdRaw);
  const parsedTokenId = uuidParam.safeParse(tokenIdRaw);
  if (!parsedWorkspaceId.success || !parsedTokenId.success) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const workspaceId = parsedWorkspaceId.data;
  const tokenId = parsedTokenId.data;

  try {
    await requireWorkspaceRole(user.userId, workspaceId, "viewer");
  } catch (error) {
    if (error instanceof WorkspaceRoleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const db = getDb();
  const tokenRows = await db
    .select({ name: motionTokens.name })
    .from(motionTokens)
    .where(and(eq(motionTokens.id, tokenId), eq(motionTokens.workspaceId, workspaceId)))
    .limit(1);

  if (tokenRows.length === 0) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  const tokenName = tokenRows[0].name;

  let releaseRows: { snapshot: string; version: string }[] = [];
  try {
    releaseRows = await db
      .select({ snapshot: workspaceReleases.snapshot, version: workspaceReleases.version })
      .from(workspaceReleases)
      .where(eq(workspaceReleases.workspaceId, workspaceId))
      .orderBy(desc(workspaceReleases.publishedAt))
      .limit(1);
  } catch (error) {
    if (isMissingReleaseTableError(error)) {
      return NextResponse.json({ error: "No release snapshot available" }, { status: 404 });
    }
    throw error;
  }

  if (releaseRows.length === 0) {
    return NextResponse.json({ error: "No published release" }, { status: 404 });
  }

  const parsed = parseWorkspaceSdkSnapshotJson(releaseRows[0].snapshot);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid snapshot" }, { status: 500 });
  }

  const sdk = parsed.tokens[tokenName];
  if (!sdk) {
    return NextResponse.json({ error: "Token not in latest release" }, { status: 404 });
  }

  const motion = sdkTokenJsonToMotionPatch(sdk);

  return NextResponse.json({
    version: releaseRows[0].version,
    motion,
  });
}
