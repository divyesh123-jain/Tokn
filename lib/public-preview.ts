import { and, desc, eq, isNotNull, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { motionTokens, workspaces } from "@/db/schema";
import type { MotionTokenItem } from "@/lib/motif";
import { motionTokenDbRowToItem } from "@/lib/token-db";
import {
  buildWorkspacePreviewSlug,
  parseWorkspacePreviewSlug,
  sanitizeWorkspaceSlug,
  workspaceNameToSlug,
} from "@/lib/workspace-slug";

type PublicPreviewPayload = {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  version: string;
  publishedAtIso: string;
  isLiveDraft: boolean;
  tokens: MotionTokenItem[];
};

function isMissingSlugColumnError(error: unknown) {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === "42703" || e?.cause?.code === "42703";
}

function isDbConnectivityError(error: unknown) {
  const e = error as {
    code?: string;
    cause?: { code?: string; errno?: number; syscall?: string };
    errno?: number;
    syscall?: string;
  };
  const code = e?.code ?? e?.cause?.code;
  return (
    code === "ENOTFOUND" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "EAI_AGAIN" ||
    code === "ECONNRESET" ||
    code === "57P01"
  );
}

let lastConnectivityLogAt = 0;

function logPreviewDbConnectivityIssue(error: unknown) {
  const now = Date.now();
  // Avoid flooding dev logs when the preview route retries quickly.
  if (now - lastConnectivityLogAt < 15000) return;
  lastConnectivityLogAt = now;

  const e = error as { code?: string; cause?: { code?: string; hostname?: string }; hostname?: string };
  const code = e?.code ?? e?.cause?.code ?? "UNKNOWN";
  const host = e?.hostname ?? e?.cause?.hostname;
  const hostSuffix = host ? ` (${host})` : "";
  console.warn(`Public preview DB unavailable: ${code}${hostSuffix}`);
}

export async function getPublicPreviewPayload({
  workspaceSlug,
  version,
}: {
  workspaceSlug: string;
  version?: string;
}): Promise<PublicPreviewPayload | null> {
  try {
    const db = getDb();
    const normalizedIncomingSlug = sanitizeWorkspaceSlug(workspaceSlug);
    const parsed = parseWorkspacePreviewSlug(workspaceSlug);

    let exactWorkspaceRows: Array<{ id: string; name: string; slug?: string }> = [];
    try {
      exactWorkspaceRows = await db
        .select({
          id: workspaces.id,
          name: workspaces.name,
          slug: workspaces.slug,
        })
        .from(workspaces)
        .where(eq(workspaces.slug, normalizedIncomingSlug))
        .limit(1);
    } catch (error) {
      if (!isMissingSlugColumnError(error)) throw error;
    }

    let workspace = exactWorkspaceRows[0];

    if (!workspace) {
      if (!parsed.workspaceIdPrefix) return null;
      let workspaceRows: Array<{ id: string; name: string; slug?: string }> = [];
      try {
        workspaceRows = await db
          .select({
            id: workspaces.id,
            name: workspaces.name,
            slug: workspaces.slug,
          })
          .from(workspaces)
          .where(sql`left(${workspaces.id}::text, 8) = ${parsed.workspaceIdPrefix}`)
          .limit(1);
      } catch (error) {
        if (!isMissingSlugColumnError(error)) throw error;
        workspaceRows = await db
          .select({
            id: workspaces.id,
            name: workspaces.name,
          })
          .from(workspaces)
          .where(sql`left(${workspaces.id}::text, 8) = ${parsed.workspaceIdPrefix}`)
          .limit(1);
      }
      workspace = workspaceRows[0];
      if (!workspace) return null;

      if (workspaceNameToSlug(workspace.name) !== parsed.nameSlug) {
        return null;
      }
    }

    const rows = await db
      .select()
      .from(motionTokens)
      .where(
        and(
          eq(motionTokens.workspaceId, workspace.id),
          isNotNull(motionTokens.publishedAt),
          eq(motionTokens.deprecated, false),
        ),
      )
      .orderBy(desc(motionTokens.publishedAt));

    if (rows.length === 0) {
      if (version?.trim()) return null;

      const liveRows = await db
        .select()
        .from(motionTokens)
        .where(and(eq(motionTokens.workspaceId, workspace.id), eq(motionTokens.deprecated, false)))
        .orderBy(desc(motionTokens.updatedAt));

      if (liveRows.length === 0) return null;

      const tokens = liveRows.map((row) =>
        motionTokenDbRowToItem(
          row as unknown as { workspaceId: string; id: string } & typeof row,
        ),
      );

      const latestMs = Math.max(
        ...liveRows.map((row) => {
          const d = row.updatedAt ?? row.createdAt;
          return new Date(d as Date).getTime();
        }),
      );

      return {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        workspaceSlug: workspace.slug || buildWorkspacePreviewSlug(workspace.name, workspace.id),
        version: "live",
        publishedAtIso: new Date(latestMs).toISOString(),
        isLiveDraft: true,
        tokens,
      };
    }

    let selectedVersion = version?.trim() || "";
    if (!selectedVersion) {
      const latestVersionRow = rows.find((row) => !!row.publishedVersion?.trim());
      if (!latestVersionRow?.publishedVersion) {
        return null;
      }
      selectedVersion = latestVersionRow.publishedVersion;
    }

    const versionRows = rows.filter((row) => row.publishedVersion === selectedVersion);
    if (versionRows.length === 0) return null;

    const tokens = versionRows.map((row) =>
      motionTokenDbRowToItem(row as unknown as { workspaceId: string; id: string } & typeof row),
    );

    const publishedAtMs = Math.max(
      ...versionRows.map((row) => new Date(row.publishedAt as Date).getTime()),
    );

    return {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      workspaceSlug: workspace.slug || buildWorkspacePreviewSlug(workspace.name, workspace.id),
      version: selectedVersion,
      publishedAtIso: new Date(publishedAtMs).toISOString(),
      isLiveDraft: false,
      tokens,
    };
  } catch (error) {
    if (isDbConnectivityError(error)) {
      logPreviewDbConnectivityIssue(error);
      return null;
    }
    throw error;
  }
}
