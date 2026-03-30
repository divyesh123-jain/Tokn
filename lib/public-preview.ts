import { and, desc, eq, isNotNull, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { motionTokens, workspaces } from "@/db/schema";
import type { MotionTokenItem } from "@/lib/motif";
import { motionTokenDbRowToItem } from "@/lib/token-db";
import {
  buildWorkspacePreviewSlug,
  parseWorkspacePreviewSlug,
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

export async function getPublicPreviewPayload({
  workspaceSlug,
  version,
}: {
  workspaceSlug: string;
  version?: string;
}): Promise<PublicPreviewPayload | null> {
  const db = getDb();
  const parsed = parseWorkspacePreviewSlug(workspaceSlug);

  if (!parsed.workspaceIdPrefix) return null;

  const workspaceRows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
    })
    .from(workspaces)
    .where(sql`left(${workspaces.id}::text, 8) = ${parsed.workspaceIdPrefix}`)
    .limit(1);

  const workspace = workspaceRows[0];
  if (!workspace) return null;

  if (workspaceNameToSlug(workspace.name) !== parsed.nameSlug) {
    return null;
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
      workspaceSlug: buildWorkspacePreviewSlug(workspace.name, workspace.id),
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
    workspaceSlug: buildWorkspacePreviewSlug(workspace.name, workspace.id),
    version: selectedVersion,
    publishedAtIso: new Date(publishedAtMs).toISOString(),
    isLiveDraft: false,
    tokens,
  };
}
