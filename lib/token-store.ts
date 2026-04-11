import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";

import {
  type MotionTokenItem,
  initialMotionTokens,
} from "./tokn-constants";
import type { WorkspaceRole } from "./workspace-types";
import {
  patchTokenRemote,
} from "./token-client";
import {
  clearWorkspaceTokenPatches,
  flushWorkspaceTokenPatches,
  hasPendingWorkspaceTokenPatches,
  scheduleWorkspaceTokenPatch,
  setSkipTokenPatches,
} from "./workspace-token-sync";

export type PreviewComponent = "button" | "card" | "modal" | "toast" | "list";
export type CodeFormat = "framerMotion" | "css" | "tailwind" | "json";

type TokenEditorStore = {
  workspaceId: string | null;
  workspaceRole: WorkspaceRole | null;
  tokensHydrating: boolean;
  tokens: MotionTokenItem[];
  selectedId: string | null;
  searchQuery: string;
  previewComponent: PreviewComponent;
  replayKey: number;
  codeFormat: CodeFormat;
  publishedTokenIds: string[];
  nameFocusTargetId: string | null;
  nameFocusSelectAll: boolean;

  setWorkspaceContext: (workspaceId: string | null, role: WorkspaceRole | null) => void;
  setTokensHydrating: (v: boolean) => void;
  replaceTokens: (tokens: MotionTokenItem[], selectedId: string | null) => void;
  resetWorkspace: () => void;

  selectToken: (id: string) => void;
  updateToken: (id: string, patch: Partial<MotionTokenItem>) => void;
  hasPublishedUsage: (id: string) => boolean;
  setSearch: (query: string) => void;
  setPreviewComponent: (comp: PreviewComponent) => void;
  setCodeFormat: (fmt: CodeFormat) => void;
  clearNameFocusRequest: () => void;
  replay: () => void;
};

export const useTokenStore = create<TokenEditorStore>()(
  persist(
    (set, get) => ({
      workspaceId: null,
      workspaceRole: null,
      tokensHydrating: false,
      tokens: initialMotionTokens,
      selectedId: initialMotionTokens[0]?.id ?? null,
      searchQuery: "",
      previewComponent: "button",
      replayKey: 0,
      codeFormat: "framerMotion",
      publishedTokenIds: [],
      nameFocusTargetId: null,
      nameFocusSelectAll: false,

      setWorkspaceContext: (workspaceId, workspaceRole) =>
        set({ workspaceId, workspaceRole }),

      setTokensHydrating: (tokensHydrating) => set({ tokensHydrating }),

      replaceTokens: (tokens, selectedId) => {
        setSkipTokenPatches(true);
        set({
          tokens: tokens.map((t) => ({ ...t, pendingSync: Boolean(t.pendingSync) })),
          selectedId: selectedId ?? tokens[0]?.id ?? null,
          tokensHydrating: false,
        });
        queueMicrotask(() => setSkipTokenPatches(false));
      },

      resetWorkspace: () => {
        clearWorkspaceTokenPatches();
        set({
          workspaceId: null,
          workspaceRole: null,
          tokens: initialMotionTokens,
          selectedId: initialMotionTokens[0]?.id ?? null,
          tokensHydrating: false,
        });
      },

      selectToken: (id) =>
        set({ selectedId: id, replayKey: get().replayKey + 1 }),

      updateToken: (id, patch) => {
        const role = get().workspaceRole;
        if (role === "viewer") return;
        const { name: _dropName, ...rest } = patch as Partial<MotionTokenItem>;
        if (Object.keys(rest).length === 0) return;
        const now = new Date().toISOString();
        set((s) => ({
          tokens: s.tokens.map((t) =>
            t.id === id ? { ...t, ...rest, updatedAt: now } : t,
          ),
          replayKey: s.replayKey + 1,
        }));
        const ws = get().workspaceId;
        if (!ws) return;
        const token = get().tokens.find((t) => t.id === id);
        if (!token?.name?.trim()) return;
        if (token.pendingSync) return;
        scheduleWorkspaceTokenPatch(ws, id, get);
      },

      hasPublishedUsage: (id) => get().publishedTokenIds.includes(id),

      setSearch: (searchQuery) => set({ searchQuery }),
      setPreviewComponent: (previewComponent) =>
        set((s) => ({ previewComponent, replayKey: s.replayKey + 1 })),
      setCodeFormat: (codeFormat) => set({ codeFormat }),
      clearNameFocusRequest: () =>
        set({ nameFocusTargetId: null, nameFocusSelectAll: false }),
      replay: () => set((s) => ({ replayKey: s.replayKey + 1 })),
    }),
    {
      name: "tokn-token-store",
      partialize: (state) => ({
        searchQuery: state.searchQuery,
        previewComponent: state.previewComponent,
        codeFormat: state.codeFormat,
        publishedTokenIds: state.publishedTokenIds,
      }),
    },
  ),
);

export async function leaveWorkspaceSession(workspaceId: string) {
  if (useTokenStore.getState().workspaceId !== workspaceId) return;
  await flushWorkspaceTokenPatches(workspaceId, useTokenStore.getState);
  const snapshot = useTokenStore.getState().tokens.map((t) => ({ ...t }));
  const results = await Promise.allSettled(
    snapshot.map((t) => {
      if (t.pendingSync) return Promise.resolve();
      if (!t.name.trim()) return Promise.resolve();
      return patchTokenRemote(workspaceId, t.id, t);
    }),
  );
  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) {
    toast.error("Some changes could not be saved. Check your connection and try again.");
  }
  if (useTokenStore.getState().workspaceId !== workspaceId) return;
  useTokenStore.setState({
    workspaceId: null,
    workspaceRole: null,
    tokens: initialMotionTokens,
    selectedId: initialMotionTokens[0]?.id ?? null,
    tokensHydrating: false,
  });
}

export function hasPendingPatches(workspaceId: string) {
  const state = useTokenStore.getState();
  if (state.workspaceId !== workspaceId) return false;
  if (hasPendingWorkspaceTokenPatches(workspaceId)) return true;
  return state.tokens.some((t) => t.pendingSync && t.name.trim().length > 0);
}

export function useSelectedToken(): MotionTokenItem | null {
  const { tokens, selectedId } = useTokenStore();
  return tokens.find((t) => t.id === selectedId) ?? null;
}
