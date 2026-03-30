const WORKSPACE_ID_PREFIX_LENGTH = 8;

export function sanitizeWorkspaceSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function workspaceNameToSlug(name: string) {
  const base = sanitizeWorkspaceSlug(name);
  return base || "workspace";
}

export function buildWorkspacePreviewSlug(workspaceName: string, workspaceId: string) {
  const safeBase = workspaceNameToSlug(workspaceName);
  const shortId = workspaceId.slice(0, WORKSPACE_ID_PREFIX_LENGTH).toLowerCase();
  return `${safeBase}-${shortId}`;
}

export function parseWorkspacePreviewSlug(value: string) {
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/^(.*)-([a-f0-9]{8})$/);
  if (!match) {
    return {
      nameSlug: normalized,
      workspaceIdPrefix: null as string | null,
    };
  }

  return {
    nameSlug: match[1],
    workspaceIdPrefix: match[2],
  };
}
