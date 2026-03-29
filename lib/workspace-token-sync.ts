import type { MotionTokenItem } from "@/lib/motif";
import { patchTokenRemote } from "@/lib/token-client";

const DEBOUNCE_MS = 480;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

let skipPatches = false;

export function setSkipTokenPatches(v: boolean) {
  skipPatches = v;
}

type TokenSlice = { tokens: MotionTokenItem[] };

export function scheduleWorkspaceTokenPatch(
  workspaceId: string,
  tokenId: string,
  getState: () => TokenSlice,
) {
  if (skipPatches) return;
  const key = `${workspaceId}:${tokenId}`;
  const prev = timers.get(key);
  if (prev) clearTimeout(prev);
  const t = setTimeout(() => {
    timers.delete(key);
    const token = getState().tokens.find((x) => x.id === tokenId);
    if (token?.pendingSync) return;
    if (!token?.name?.trim()) return;
    void patchTokenRemote(workspaceId, tokenId, token)
      .then((server) => {
        void import("@/lib/token-store").then(({ useTokenStore }) => {
          useTokenStore.setState((s) => ({
            tokens: s.tokens.map((t) =>
              t.id === tokenId ? { ...t, ...server } : t,
            ),
          }));
        });
      })
      .catch(() => {});
  }, DEBOUNCE_MS);
  timers.set(key, t);
}

export function cancelPendingTokenPatch(workspaceId: string, tokenId: string) {
  const key = `${workspaceId}:${tokenId}`;
  const prev = timers.get(key);
  if (prev) clearTimeout(prev);
  timers.delete(key);
}

export function clearWorkspaceTokenPatches() {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
}

export function hasPendingWorkspaceTokenPatches(workspaceId: string) {
  for (const key of timers.keys()) {
    if (key.startsWith(`${workspaceId}:`)) return true;
  }
  return false;
}

export async function flushWorkspaceTokenPatches(
  workspaceId: string,
  getState: () => TokenSlice,
) {
  const keys = [...timers.keys()].filter((k) => k.startsWith(`${workspaceId}:`));
  for (const key of keys) {
    const timer = timers.get(key);
    if (timer) clearTimeout(timer);
    timers.delete(key);
    const tokenId = key.slice(workspaceId.length + 1);
    const token = getState().tokens.find((x) => x.id === tokenId);
    if (token?.pendingSync) continue;
    if (token?.name?.trim()) {
      await patchTokenRemote(workspaceId, tokenId, token).catch(() => {});
    }
  }
}
