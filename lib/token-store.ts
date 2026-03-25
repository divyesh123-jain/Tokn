import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  type MotionTokenItem,
  initialMotionTokens,
  TOKEN_DEFAULTS,
} from "./motif";

export type PreviewComponent = "button" | "card" | "modal" | "toast" | "list";
export type CodeFormat = "framerMotion" | "css" | "tailwind" | "json";

type TokenEditorStore = {
  tokens: MotionTokenItem[];
  selectedId: string | null;
  searchQuery: string;
  previewComponent: PreviewComponent;
  replayKey: number;
  codeFormat: CodeFormat;
  publishedTokenIds: string[];
  nameFocusTargetId: string | null;
  nameFocusSelectAll: boolean;

  selectToken: (id: string) => void;
  updateToken: (id: string, patch: Partial<MotionTokenItem>) => void;
  createToken: () => void;
  duplicateToken: (id: string) => string | null;
  deleteToken: (id: string) => void;
  softDeleteToken: (id: string) => void;
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
      tokens: initialMotionTokens,
      selectedId: initialMotionTokens[0]?.id ?? null,
      searchQuery: "",
      previewComponent: "button",
      replayKey: 0,
      codeFormat: "framerMotion",
      publishedTokenIds: [],
      nameFocusTargetId: null,
      nameFocusSelectAll: false,

      selectToken: (id) =>
        set({ selectedId: id, replayKey: get().replayKey + 1 }),

      updateToken: (id, patch) =>
        set((s) => ({
          tokens: s.tokens.map((t) => (t.id === id ? { ...t, ...patch } : t)),
          replayKey: s.replayKey + 1,
        })),

      createToken: () => {
        const id = crypto.randomUUID();
        const token: MotionTokenItem = { ...TOKEN_DEFAULTS, id, name: "" };
        set((s) => ({
          tokens: [...s.tokens, token],
          selectedId: id,
          nameFocusTargetId: id,
          nameFocusSelectAll: false,
          replayKey: s.replayKey + 1,
        }));
      },

      duplicateToken: (id) => {
        const source = get().tokens.find((t) => t.id === id);
        if (!source) return null;
        const nextId = crypto.randomUUID();
        const copy: MotionTokenItem = {
          ...source,
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
      },

      deleteToken: (id) =>
        set((s) => {
          const next = s.tokens.filter((t) => t.id !== id);
          return {
            tokens: next,
            selectedId: s.selectedId === id ? (next[0]?.id ?? null) : s.selectedId,
            nameFocusTargetId: s.selectedId === id ? null : s.nameFocusTargetId,
            replayKey: s.replayKey + 1,
          };
        }),

      softDeleteToken: (id) =>
        set((s) => ({
          tokens: s.tokens.map((t) => (t.id === id ? { ...t, deprecated: true } : t)),
          replayKey: s.replayKey + 1,
        })),

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
        tokens: state.tokens,
        selectedId: state.selectedId,
        searchQuery: state.searchQuery,
        previewComponent: state.previewComponent,
        codeFormat: state.codeFormat,
        publishedTokenIds: state.publishedTokenIds,
      }),
    },
  ),
);

export function useSelectedToken(): MotionTokenItem | null {
  const { tokens, selectedId } = useTokenStore();
  return tokens.find((t) => t.id === selectedId) ?? null;
}
