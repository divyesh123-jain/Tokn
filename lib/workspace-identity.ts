import type { WorkspaceKind, WorkspaceRole } from "@/lib/workspace-types";
import { buildWorkspacePreviewSlug } from "@/lib/workspace-slug";

export const workspaceKindLabel: Record<WorkspaceKind, string> = {
  individual: "Individual",
  team: "Team",
};

export const workspaceRoleLabel: Record<WorkspaceRole, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
};

export function workspacePreviewPath(
  workspace: { name: string; id: string; slug?: string },
  version?: string,
) {
  const slug = workspace.slug || buildWorkspacePreviewSlug(workspace.name, workspace.id);
  if (version?.trim()) {
    return `/preview/${slug}/v/${encodeURIComponent(version.trim())}`;
  }
  return `/preview/${slug}`;
}

export function workspacePreviewUrl(
  origin: string,
  workspace: { name: string; id: string; slug?: string },
  version?: string,
) {
  const base = origin.replace(/\/$/, "");
  return `${base}${workspacePreviewPath(workspace, version)}`;
}

export type SlugChangeImpact = {
  previousSlug: string;
  nextSlug: string;
  previousPreviewUrl: string;
  nextPreviewUrl: string;
  legacyPreviewUrl: string;
};

export function describeSlugChangeImpact(input: {
  origin: string;
  workspace: { name: string; id: string; slug: string };
  nextSlug: string;
}): SlugChangeImpact {
  const { origin, workspace, nextSlug } = input;
  const previousSlug = workspace.slug;
  const legacySlug = buildWorkspacePreviewSlug(workspace.name, workspace.id);
  return {
    previousSlug,
    nextSlug,
    previousPreviewUrl: workspacePreviewUrl(origin, { ...workspace, slug: previousSlug }),
    nextPreviewUrl: workspacePreviewUrl(origin, { ...workspace, slug: nextSlug }),
    legacyPreviewUrl: workspacePreviewUrl(origin, { ...workspace, slug: legacySlug }),
  };
}
