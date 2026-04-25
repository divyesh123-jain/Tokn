import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { motionTokens, workspaces } from "@/db/schema";
import {
  getSessionUser,
  requireWorkspaceRole,
  WorkspaceRoleError,
} from "@/lib/auth-helpers";
import {
  generateWorkspaceSdkJson,
  generateWorkspaceSdkTypescript,
} from "@/lib/codegen";
import { motionTokenDbRowToItem, type MotionTokenDbRow } from "@/lib/token-db";

const uuidParam = z.string().uuid();
const versionParam = z
  .string()
  .trim()
  .regex(/^v?\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/, "Version must look like 1.2.0 or v1.2.0");
const formatQuery = z.enum(["typescript", "json"]);

function normalizeVersion(version: string) {
  return version.startsWith("v") ? version : `v${version}`;
}

function parseDownloadFlag(value: string | null) {
  if (!value) return false;
  const lowered = value.toLowerCase();
  return lowered === "1" || lowered === "true" || lowered === "yes";
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ workspaceId: string; version: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId: workspaceIdRaw, version: versionRaw } = await context.params;
  const parsedWorkspaceId = uuidParam.safeParse(workspaceIdRaw);
  const parsedVersion = versionParam.safeParse(versionRaw);
  if (!parsedWorkspaceId.success || !parsedVersion.success) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const workspaceId = parsedWorkspaceId.data;
  const version = normalizeVersion(parsedVersion.data);

  try {
    await requireWorkspaceRole(user.userId, workspaceId, "viewer");
  } catch (error) {
    if (error instanceof WorkspaceRoleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const formatRaw = req.nextUrl.searchParams.get("format") ?? "typescript";
  const parsedFormat = formatQuery.safeParse(formatRaw);
  if (!parsedFormat.success) {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }
  const format = parsedFormat.data;
  const download = parseDownloadFlag(req.nextUrl.searchParams.get("download"));

  const db = getDb();
  const workspaceRows = await db
    .select({ id: workspaces.id, slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  const workspace = workspaceRows[0];
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(motionTokens)
    .where(
      and(
        eq(motionTokens.workspaceId, workspaceId),
        eq(motionTokens.deprecated, false),
        eq(motionTokens.publishedVersion, version),
        isNotNull(motionTokens.publishedAt),
      ),
    );

  if (rows.length === 0) {
    return NextResponse.json(
      { error: `No published SDK snapshot found for ${version}` },
      { status: 404 },
    );
  }

  const tokens = rows
    .map((row) =>
      motionTokenDbRowToItem(
        row as unknown as MotionTokenDbRow & { updatedAt?: Date | string | null },
      ),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const latestPublishedAtMs = rows.reduce((max, row) => {
    const ms = row.publishedAt ? new Date(row.publishedAt).getTime() : 0;
    return ms > max ? ms : max;
  }, 0);
  const generatedAtIso = new Date(latestPublishedAtMs || Date.now()).toISOString();

  const filenameBase = `${workspace.slug}-${version.replace(/^v/, "v")}`;
  const content =
    format === "json"
      ? generateWorkspaceSdkJson({
          workspaceId,
          version,
          generatedAtIso,
          tokens,
        })
      : generateWorkspaceSdkTypescript({
          workspaceId,
          version,
          generatedAtIso,
          tokens,
        });

  const extension = format === "json" ? "json" : "ts";
  const filename = `${filenameBase}.${extension}`;

  if (download) {
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": format === "json" ? "application/json; charset=utf-8" : "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  }

  return NextResponse.json({
    workspaceId,
    version,
    format,
    filename,
    tokenCount: tokens.length,
    generatedAt: generatedAtIso,
    content,
  });
}
