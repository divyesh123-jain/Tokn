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

  selectToken: (id: string) => void;
  updateToken: (id: string, patch: Partial<MotionTokenItem>) => void;
  createToken: () => void;
  deleteToken: (id: string) => void;
  setSearch: (query: string) => void;
  setPreviewComponent: (comp: PreviewComponent) => void;
  setCodeFormat: (fmt: CodeFormat) => void;
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
          replayKey: s.replayKey + 1,
        }));
      },

      deleteToken: (id) =>
        set((s) => {
          const next = s.tokens.filter((t) => t.id !== id);
          return {
            tokens: next,
            selectedId: s.selectedId === id ? (next[0]?.id ?? null) : s.selectedId,
            replayKey: s.replayKey + 1,
          };
        }),

      setSearch: (searchQuery) => set({ searchQuery }),
      setPreviewComponent: (previewComponent) =>
        set((s) => ({ previewComponent, replayKey: s.replayKey + 1 })),
      setCodeFormat: (codeFormat) => set({ codeFormat }),
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
      }),
    },
  ),
);

export function useSelectedToken(): MotionTokenItem | null {
  const { tokens, selectedId } = useTokenStore();
  return tokens.find((t) => t.id === selectedId) ?? null;
}
