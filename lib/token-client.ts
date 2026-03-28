import { toast } from "sonner";

import type { MotionTokenItem } from "@/lib/motif";
import { TOKEN_DEFAULTS } from "@/lib/motif";

function tokenToApiBody(t: MotionTokenItem) {
  return {
    name: t.name,
    category: t.category,
    durationMs: t.durationMs,
    delayMs: t.delayMs,
    easing: t.easing,
    yOffset: t.yOffset,
    scaleStart: t.scaleStart,
    opacityStart: t.opacityStart,
    isSpring: t.isSpring,
    springStiffness: t.springStiffness,
    springDamping: t.springDamping,
    springMass: t.springMass,
    deprecated: t.deprecated,
  };
}

export function buildCreateTokenBody(overrides: Partial<MotionTokenItem> = {}): Omit<
  MotionTokenItem,
  "id"
> {
  return { ...TOKEN_DEFAULTS, name: "untitled", ...overrides };
}

export async function createTokenRemote(
  workspaceId: string,
  body: Omit<MotionTokenItem, "id">,
): Promise<MotionTokenItem> {
  const res = await fetch(`/api/workspaces/${workspaceId}/tokens`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(tokenToApiBody(body as MotionTokenItem)),
  });
  const json = (await res.json().catch(() => null)) as { token?: MotionTokenItem; error?: string } | null;
  if (!res.ok || !json?.token) {
    toast.error(json?.error ?? "Could not create token");
    throw new Error(json?.error ?? "create failed");
  }
  return json.token;
}

export async function patchTokenRemote(
  workspaceId: string,
  tokenId: string,
  token: MotionTokenItem,
): Promise<MotionTokenItem> {
  const res = await fetch(`/api/workspaces/${workspaceId}/tokens/${tokenId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(tokenToApiBody(token)),
  });
  const json = (await res.json().catch(() => null)) as { token?: MotionTokenItem; error?: string } | null;
  if (!res.ok || !json?.token) {
    toast.error(json?.error ?? "Could not save token");
    throw new Error(json?.error ?? "patch failed");
  }
  return json.token;
}

export async function deleteTokenRemote(
  workspaceId: string,
  tokenId: string,
  soft: boolean,
): Promise<MotionTokenItem> {
  const res = await fetch(`/api/workspaces/${workspaceId}/tokens/${tokenId}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ soft }),
  });
  const json = (await res.json().catch(() => null)) as { token?: MotionTokenItem; error?: string } | null;
  if (!res.ok || !json?.token) {
    toast.error(json?.error ?? "Could not delete token");
    throw new Error(json?.error ?? "delete failed");
  }
  return json.token;
}
