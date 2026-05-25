import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";

import {
  type MotionTokenCategory,
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

export type PreviewCompareMode = "none" | "published" | "token";

const MAX_UNDO = 50;

let suspendTokenHistoryDepth = 0;

function beginSuspendTokenHistory() {
  suspendTokenHistoryDepth += 1;
}

function endSuspendTokenHistory() {
  suspendTokenHistoryDepth = Math.max(0, suspendTokenHistoryDepth - 1);
}

function cloneTokenList(tokens: MotionTokenItem[]): MotionTokenItem[] {
  return tokens.map((t) => ({ ...t }));
}

function motionPayloadSig(t: MotionTokenItem): string {
  return JSON.stringify({
    n: t.name,
    c: t.category,
    d: t.durationMs,
    delay: t.delayMs,
    e: t.easing,
    y: t.yOffset,
    sc: t.scaleStart,
    op: t.opacityStart,
    sp: t.isSpring,
    ss: t.springStiffness,
    sd: t.springDamping,
    sm: t.springMass,
    dep: t.deprecated,
    i: t.intent ?? "",
  });
}

function changedTokenIds(before: MotionTokenItem[], after: MotionTokenItem[]): string[] {
  const afterById = new Map(after.map((x) => [x.id, x]));
  const ids: string[] = [];
  for (const b of before) {
    const a = afterById.get(b.id);
    if (a && motionPayloadSig(b) !== motionPayloadSig(a)) ids.push(b.id);
  }
  return ids;
}

function resyncTokensAfterHistoryJump(
  workspaceId: string,
  before: MotionTokenItem[],
  after: MotionTokenItem[],
) {
  clearWorkspaceTokenPatches();
  const beforeIds = new Set(before.map((t) => t.id));
  const afterIds = new Set(after.map((t) => t.id));
  const structureChanged =
    before.length !== after.length || [...beforeIds].some((id) => !afterIds.has(id));

  queueMicrotask(() => {
    const state = useTokenStore.getState();
    if (state.workspaceId !== workspaceId) return;
    const list = state.tokens;
    if (structureChanged) {
      for (const t of list) {
        if (t.name?.trim() && !t.pendingSync) {
          scheduleWorkspaceTokenPatch(workspaceId, t.id, useTokenStore.getState);
        }
      }
      return;
    }
    for (const id of changedTokenIds(before, after)) {
      const t = useTokenStore.getState().tokens.find((x) => x.id === id);
      if (t?.name?.trim() && !t.pendingSync) {
        scheduleWorkspaceTokenPatch(workspaceId, id, useTokenStore.getState);
      }
    }
  });
}

type UpdateTokenOptions = { skipHistory?: boolean };

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

  undoStack: MotionTokenItem[][];
  redoStack: MotionTokenItem[][];
  bulkTokenIds: string[];
  previewCompareMode: PreviewCompareMode;
  previewCompareTokenId: string | null;

  setWorkspaceContext: (workspaceId: string | null, role: WorkspaceRole | null) => void;
  setTokensHydrating: (v: boolean) => void;
  replaceTokens: (tokens: MotionTokenItem[], selectedId: string | null) => void;
  resetWorkspace: () => void;

  selectToken: (id: string) => void;
  updateToken: (id: string, patch: Partial<MotionTokenItem>, options?: UpdateTokenOptions) => void;
  pushHistorySnapshot: () => void;
  undoTokenEdit: () => void;
  redoTokenEdit: () => void;
  toggleBulkTokenId: (id: string) => void;
  clearBulkTokenSelection: () => void;
  setPreviewCompareMode: (mode: PreviewCompareMode) => void;
  setPreviewCompareTokenId: (id: string | null) => void;
  runBulkDeprecate: () => void;
  runBulkSnapDuration: (stepMs: number) => void;
  runBulkBumpCategory: () => void;
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

      undoStack: [],
      redoStack: [],
      bulkTokenIds: [],
      previewCompareMode: "none",
      previewCompareTokenId: null,

      setWorkspaceContext: (workspaceId, workspaceRole) =>
        set({ workspaceId, workspaceRole }),

      setTokensHydrating: (tokensHydrating) => set({ tokensHydrating }),

      replaceTokens: (tokens, selectedId) => {
        beginSuspendTokenHistory();
        setSkipTokenPatches(true);
        set({
          tokens: tokens.map((t) => ({ ...t, pendingSync: Boolean(t.pendingSync) })),
          selectedId: selectedId ?? tokens[0]?.id ?? null,
          tokensHydrating: false,
          undoStack: [],
          redoStack: [],
          bulkTokenIds: [],
        });
        queueMicrotask(() => {
          setSkipTokenPatches(false);
          endSuspendTokenHistory();
        });
      },

      resetWorkspace: () => {
        clearWorkspaceTokenPatches();
        set({
          workspaceId: null,
          workspaceRole: null,
          tokens: initialMotionTokens,
          selectedId: initialMotionTokens[0]?.id ?? null,
          tokensHydrating: false,
          undoStack: [],
          redoStack: [],
          bulkTokenIds: [],
          previewCompareMode: "none",
          previewCompareTokenId: null,
        });
      },

      selectToken: (id) =>
        set({ selectedId: id, replayKey: get().replayKey + 1 }),

      pushHistorySnapshot: () => {
        if (suspendTokenHistoryDepth > 0) return;
        const snapshot = cloneTokenList(get().tokens);
        set((s) => ({
          undoStack: [...s.undoStack, snapshot].slice(-MAX_UNDO),
          redoStack: [],
        }));
      },

      updateToken: (id, patch, options) => {
        const role = get().workspaceRole;
        if (role === "viewer") return;
        const { name: _dropName, ...rest } = patch as Partial<MotionTokenItem>;
        if (Object.keys(rest).length === 0) return;
        const skipHistory = Boolean(options?.skipHistory);
        if (!skipHistory && suspendTokenHistoryDepth === 0) {
          const snapshot = cloneTokenList(get().tokens);
          set((s) => ({
            undoStack: [...s.undoStack, snapshot].slice(-MAX_UNDO),
            redoStack: [],
          }));
        }
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

      undoTokenEdit: () => {
        const s = get();
        if (s.undoStack.length === 0) return;
        const before = cloneTokenList(s.tokens);
        const prev = s.undoStack[s.undoStack.length - 1]!;
        const ws = s.workspaceId;
        beginSuspendTokenHistory();
        clearWorkspaceTokenPatches();
        set({
          tokens: cloneTokenList(prev),
          undoStack: s.undoStack.slice(0, -1),
          redoStack: [...s.redoStack, before].slice(-MAX_UNDO),
          replayKey: s.replayKey + 1,
        });
        endSuspendTokenHistory();
        if (ws) resyncTokensAfterHistoryJump(ws, before, prev);
      },

      redoTokenEdit: () => {
        const s = get();
        if (s.redoStack.length === 0) return;
        const before = cloneTokenList(s.tokens);
        const next = s.redoStack[s.redoStack.length - 1]!;
        const ws = s.workspaceId;
        beginSuspendTokenHistory();
        clearWorkspaceTokenPatches();
        set({
          tokens: cloneTokenList(next),
          redoStack: s.redoStack.slice(0, -1),
          undoStack: [...s.undoStack, before].slice(-MAX_UNDO),
          replayKey: s.replayKey + 1,
        });
        endSuspendTokenHistory();
        if (ws) resyncTokensAfterHistoryJump(ws, before, next);
      },

      toggleBulkTokenId: (id) => {
        set((s) => {
          const has = s.bulkTokenIds.includes(id);
          const bulkTokenIds = has
            ? s.bulkTokenIds.filter((x) => x !== id)
            : [...s.bulkTokenIds, id];
          return { bulkTokenIds };
        });
      },

      clearBulkTokenSelection: () => set({ bulkTokenIds: [] }),

      setPreviewCompareMode: (previewCompareMode) =>
        set({ previewCompareMode, replayKey: get().replayKey + 1 }),

      setPreviewCompareTokenId: (previewCompareTokenId) =>
        set({ previewCompareTokenId, replayKey: get().replayKey + 1 }),

      runBulkDeprecate: () => {
        const s = get();
        if (s.workspaceRole === "viewer") return;
        const ids = [...new Set(s.bulkTokenIds)];
        if (ids.length === 0) return;
        get().pushHistorySnapshot();
        const now = new Date().toISOString();
        beginSuspendTokenHistory();
        set((st) => ({
          tokens: st.tokens.map((t) =>
            ids.includes(t.id) ? { ...t, deprecated: true, updatedAt: now } : t,
          ),
          replayKey: st.replayKey + 1,
          bulkTokenIds: [],
        }));
        endSuspendTokenHistory();
        const ws = get().workspaceId;
        if (!ws) return;
        queueMicrotask(() => {
          for (const id of ids) {
            const t = useTokenStore.getState().tokens.find((x) => x.id === id);
            if (t?.name?.trim() && !t.pendingSync) {
              scheduleWorkspaceTokenPatch(ws, id, useTokenStore.getState);
            }
          }
        });
      },

      runBulkSnapDuration: (stepMs: number) => {
        const s = get();
        if (s.workspaceRole === "viewer") return;
        const ids = [...new Set(s.bulkTokenIds)];
        if (ids.length === 0) return;
        get().pushHistorySnapshot();
        const now = new Date().toISOString();
        beginSuspendTokenHistory();
        set((st) => ({
          tokens: st.tokens.map((t) => {
            if (!ids.includes(t.id) || t.isSpring) return t;
            const rounded = Math.max(0, Math.round(t.durationMs / stepMs) * stepMs);
            return { ...t, durationMs: rounded, updatedAt: now };
          }),
          replayKey: st.replayKey + 1,
          bulkTokenIds: [],
        }));
        endSuspendTokenHistory();
        const ws = get().workspaceId;
        if (!ws) return;
        queueMicrotask(() => {
          for (const id of ids) {
            const t = useTokenStore.getState().tokens.find((x) => x.id === id);
            if (t?.name?.trim() && !t.pendingSync) {
              scheduleWorkspaceTokenPatch(ws, id, useTokenStore.getState);
            }
          }
        });
      },

      runBulkBumpCategory: () => {
        const order: MotionTokenCategory[] = ["enter", "exit", "spring", "feedback"];
        const s = get();
        if (s.workspaceRole === "viewer") return;
        const ids = [...new Set(s.bulkTokenIds)];
        if (ids.length === 0) return;
        get().pushHistorySnapshot();
        const now = new Date().toISOString();
        beginSuspendTokenHistory();
        set((st) => ({
          tokens: st.tokens.map((t) => {
            if (!ids.includes(t.id)) return t;
            const i = order.indexOf(t.category);
            const next = order[(i + 1 + order.length) % order.length];
            return { ...t, category: next, updatedAt: now };
          }),
          replayKey: st.replayKey + 1,
          bulkTokenIds: [],
        }));
        endSuspendTokenHistory();
        const ws = get().workspaceId;
        if (!ws) return;
        queueMicrotask(() => {
          for (const id of ids) {
            const t = useTokenStore.getState().tokens.find((x) => x.id === id);
            if (t?.name?.trim() && !t.pendingSync) {
              scheduleWorkspaceTokenPatch(ws, id, useTokenStore.getState);
            }
          }
        });
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
    undoStack: [],
    redoStack: [],
    bulkTokenIds: [],
    previewCompareMode: "none",
    previewCompareTokenId: null,
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
