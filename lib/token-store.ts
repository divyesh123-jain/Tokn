import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  type MotionTokenItem,
  initialMotionTokens,
  TOKEN_DEFAULTS,
} from "./motif";
import {
  buildCreateTokenBody,
  createTokenRemote,
  deleteTokenRemote,
} from "./token-client";
import {
  clearWorkspaceTokenPatches,
  flushWorkspaceTokenPatches,
  scheduleWorkspaceTokenPatch,
  setSkipTokenPatches,
} from "./workspace-token-sync";

export type PreviewComponent = "button" | "card" | "modal" | "toast" | "list";
export type CodeFormat = "framerMotion" | "css" | "tailwind" | "json";

type TokenEditorStore = {
  workspaceId: string | null;
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

  setWorkspaceId: (id: string | null) => void;
  setTokensHydrating: (v: boolean) => void;
  replaceTokens: (tokens: MotionTokenItem[], selectedId: string | null) => void;
  resetWorkspace: () => void;

  selectToken: (id: string) => void;
  updateToken: (id: string, patch: Partial<MotionTokenItem>) => void;
  createToken: () => Promise<void>;
  duplicateToken: (id: string) => Promise<string | null>;
  deleteToken: (id: string) => Promise<void>;
  softDeleteToken: (id: string) => Promise<void>;
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

      setWorkspaceId: (workspaceId) => set({ workspaceId }),

      setTokensHydrating: (tokensHydrating) => set({ tokensHydrating }),

      replaceTokens: (tokens, selectedId) => {
        setSkipTokenPatches(true);
        set({
          tokens,
          selectedId: selectedId ?? tokens[0]?.id ?? null,
          tokensHydrating: false,
        });
        queueMicrotask(() => setSkipTokenPatches(false));
      },

      resetWorkspace: () => {
        clearWorkspaceTokenPatches();
        set({
          workspaceId: null,
          tokens: initialMotionTokens,
          selectedId: initialMotionTokens[0]?.id ?? null,
          tokensHydrating: false,
        });
      },

      selectToken: (id) =>
        set({ selectedId: id, replayKey: get().replayKey + 1 }),

      updateToken: (id, patch) => {
        set((s) => ({
          tokens: s.tokens.map((t) => (t.id === id ? { ...t, ...patch } : t)),
          replayKey: s.replayKey + 1,
        }));
        const ws = get().workspaceId;
        if (!ws) return;
        const token = get().tokens.find((t) => t.id === id);
        if (!token?.name?.trim()) return;
        scheduleWorkspaceTokenPatch(ws, id, get);
      },

      createToken: async () => {
        const ws = get().workspaceId;
        if (!ws) {
          const id = crypto.randomUUID();
          const token: MotionTokenItem = { ...TOKEN_DEFAULTS, id, name: "" };
          set((s) => ({
            tokens: [...s.tokens, token],
            selectedId: id,
            nameFocusTargetId: id,
            nameFocusSelectAll: false,
            replayKey: s.replayKey + 1,
          }));
          return;
        }
        try {
          const body = buildCreateTokenBody();
          const created = await createTokenRemote(ws, body);
          set((s) => ({
            tokens: [...s.tokens, created],
            selectedId: created.id,
            nameFocusTargetId: created.id,
            nameFocusSelectAll: false,
            replayKey: s.replayKey + 1,
          }));
        } catch {
          /* toast in token-client */
        }
      },

      duplicateToken: async (id) => {
        const source = get().tokens.find((t) => t.id === id);
        if (!source) return null;
        const ws = get().workspaceId;
        const nextId = crypto.randomUUID();
        const { id: _sid, ...rest } = source;
        if (!ws) {
          const copy: MotionTokenItem = {
            ...rest,
            id: nextId,
            name: `copy of ${source.name || "untitled"}`,
          };
          set((s) => {
            const index = s.tokens.findIndex((t) => t.id === id);
            const nextTokens = [...s.tokens];
            const insertAt = index === -1 ? nextTokens.length : index + 1;
            nextTokens.splice(insertAt, 0, copy);
            return {
              tokens: nextTokens,
              selectedId: nextId,
              nameFocusTargetId: nextId,
              nameFocusSelectAll: true,
              replayKey: s.replayKey + 1,
            };
          });
          return nextId;
        }
        try {
          const baseName = `copy of ${source.name || "untitled"}`;
          const body = buildCreateTokenBody({
            ...rest,
            name: `${baseName}-${Date.now().toString(36).slice(-4)}`,
          });
          const created = await createTokenRemote(ws, body);
          set((s) => {
            const index = s.tokens.findIndex((t) => t.id === id);
            const nextTokens = [...s.tokens];
            const insertAt = index === -1 ? nextTokens.length : index + 1;
            nextTokens.splice(insertAt, 0, created);
            return {
              tokens: nextTokens,
              selectedId: created.id,
              nameFocusTargetId: created.id,
              nameFocusSelectAll: true,
              replayKey: s.replayKey + 1,
            };
          });
          return created.id;
        } catch {
          return null;
        }
      },

      deleteToken: async (id) => {
        const ws = get().workspaceId;
        if (!ws) {
          set((s) => {
            const next = s.tokens.filter((t) => t.id !== id);
            return {
              tokens: next,
              selectedId: s.selectedId === id ? (next[0]?.id ?? null) : s.selectedId,
              nameFocusTargetId: s.selectedId === id ? null : s.nameFocusTargetId,
              replayKey: s.replayKey + 1,
            };
          });
          return;
        }
        try {
          await deleteTokenRemote(ws, id, false);
          set((s) => {
            const next = s.tokens.filter((t) => t.id !== id);
            return {
              tokens: next,
              selectedId: s.selectedId === id ? (next[0]?.id ?? null) : s.selectedId,
              nameFocusTargetId: s.selectedId === id ? null : s.nameFocusTargetId,
              replayKey: s.replayKey + 1,
            };
          });
        } catch {
          /* toast in token-client */
        }
      },

      softDeleteToken: async (id) => {
        const ws = get().workspaceId;
        if (!ws) {
          set((s) => ({
            tokens: s.tokens.map((t) => (t.id === id ? { ...t, deprecated: true } : t)),
            replayKey: s.replayKey + 1,
          }));
          return;
        }
        try {
          const updated = await deleteTokenRemote(ws, id, true);
          set((s) => ({
            tokens: s.tokens.map((t) => (t.id === id ? updated : t)),
            replayKey: s.replayKey + 1,
          }));
        } catch {
          /* toast in token-client */
        }
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
  await flushWorkspaceTokenPatches(workspaceId, () => useTokenStore.getState());
  clearWorkspaceTokenPatches();
  useTokenStore.setState({
    workspaceId: null,
    tokens: initialMotionTokens,
    selectedId: initialMotionTokens[0]?.id ?? null,
    tokensHydrating: false,
  });
}

export function useSelectedToken(): MotionTokenItem | null {
  const { tokens, selectedId } = useTokenStore();
  return tokens.find((t) => t.id === selectedId) ?? null;
}
