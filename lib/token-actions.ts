import { toast } from "sonner";

import { TOKEN_DEFAULTS, type MotionTokenItem } from "@/lib/motif";
import {
  buildCreateTokenBody,
  createTokenRemote,
  deleteTokenRemote,
  patchTokenRemote,
} from "@/lib/token-client";
import { createAutoTokenName, getTokenNameValidationError } from "@/lib/token-name";
import { useTokenStore } from "@/lib/token-store";
import {
  cancelPendingTokenPatch,
  scheduleWorkspaceTokenPatch,
} from "@/lib/workspace-token-sync";

function removeTokenLocal(id: string) {
  useTokenStore.setState((s) => {
    const next = s.tokens.filter((t) => t.id !== id);
    return {
      tokens: next,
      selectedId: s.selectedId === id ? (next[0]?.id ?? null) : s.selectedId,
      nameFocusTargetId: s.selectedId === id ? null : s.nameFocusTargetId,
      replayKey: s.replayKey + 1,
    };
  });
}

function canEditWorkspaceTokens() {
  const role = useTokenStore.getState().workspaceRole;
  return role === "owner" || role === "editor" || role === null;
}

export async function saveTokenNameAction(id: string, name: string) {
  if (!canEditWorkspaceTokens()) {
    toast.error("Viewer role is read-only");
    throw new Error("forbidden");
  }
  const store = useTokenStore.getState();
  const trimmed = name.trim();
  const validationError = getTokenNameValidationError(trimmed);
  if (validationError) {
    toast.error(validationError);
    throw new Error(validationError);
  }
  const conflict = store.tokens.some((t) => t.id !== id && t.name === trimmed);
  if (conflict) {
    const message = "Token name already exists";
    toast.error(message);
    throw new Error(message);
  }

  const ws = store.workspaceId;
  if (ws) cancelPendingTokenPatch(ws, id);

  const now = new Date().toISOString();
  useTokenStore.setState((s) => ({
    tokens: s.tokens.map((t) => (t.id === id ? { ...t, name: trimmed, updatedAt: now } : t)),
  }));

  if (!ws) return;

  const token = useTokenStore.getState().tokens.find((t) => t.id === id);
  if (!token || token.pendingSync) return;

  const server = await patchTokenRemote(ws, id, token);
  useTokenStore.setState((s) => ({
    tokens: s.tokens.map((t) => (t.id === id ? { ...t, ...server, pendingSync: false } : t)),
  }));
}

export async function createTokenAction() {
  if (!canEditWorkspaceTokens()) {
    toast.error("Viewer role is read-only");
    return;
  }
  const store = useTokenStore.getState();
  const ws = store.workspaceId;
  const tempId = crypto.randomUUID();
  const token: MotionTokenItem = {
    ...TOKEN_DEFAULTS,
    id: tempId,
    name: "",
    updatedAt: new Date().toISOString(),
    pendingSync: Boolean(ws),
  };

  useTokenStore.setState((s) => ({
    tokens: [...s.tokens, token],
    selectedId: tempId,
    nameFocusTargetId: tempId,
    nameFocusSelectAll: false,
    replayKey: s.replayKey + 1,
  }));

  if (!ws) return;

  try {
    const created = await createTokenRemote(ws, buildCreateTokenBody());
    useTokenStore.setState((s) => {
      const draft = s.tokens.find((t) => t.id === tempId);
      if (!draft) return {};
      const reconciled: MotionTokenItem = {
        ...created,
        ...draft,
        id: created.id,
        pendingSync: false,
      };
      return {
        tokens: s.tokens.map((t) => (t.id === tempId ? reconciled : t)),
        selectedId: s.selectedId === tempId ? created.id : s.selectedId,
        nameFocusTargetId: s.nameFocusTargetId === tempId ? created.id : s.nameFocusTargetId,
      };
    });

    const synced = useTokenStore.getState().tokens.find((t) => t.id === created.id);
    if (synced?.name?.trim()) {
      scheduleWorkspaceTokenPatch(ws, created.id, useTokenStore.getState);
    }
  } catch {
    // Roll back optimistic create on network failure.
    removeTokenLocal(tempId);
  }
}

export async function duplicateTokenAction(id: string): Promise<string | null> {
  if (!canEditWorkspaceTokens()) {
    toast.error("Viewer role is read-only");
    return null;
  }
  const store = useTokenStore.getState();
  const source = store.tokens.find((t) => t.id === id);
  if (!source) return null;

  const ws = store.workspaceId;
  const nextId = crypto.randomUUID();
  const rest: Omit<MotionTokenItem, "id"> = { ...source };
  delete (rest as { id?: string }).id;
  const duplicateName = createAutoTokenName(source.category, `copy-${Date.now().toString(36).slice(-4)}`);

  if (!ws) {
    const copy: MotionTokenItem = {
      ...rest,
      id: nextId,
      name: duplicateName,
      updatedAt: new Date().toISOString(),
      pendingSync: false,
    };
    useTokenStore.setState((s) => {
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
    const body = buildCreateTokenBody({
      ...rest,
      name: duplicateName,
    });
    const created = await createTokenRemote(ws, body);
    useTokenStore.setState((s) => {
      const index = s.tokens.findIndex((t) => t.id === id);
      const nextTokens = [...s.tokens];
      const insertAt = index === -1 ? nextTokens.length : index + 1;
      nextTokens.splice(insertAt, 0, { ...created, pendingSync: false });
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
}

export async function deleteTokenAction(id: string) {
  if (!canEditWorkspaceTokens()) {
    toast.error("Viewer role is read-only");
    return;
  }
  const ws = useTokenStore.getState().workspaceId;
  if (!ws) {
    removeTokenLocal(id);
    return;
  }

  try {
    await deleteTokenRemote(ws, id, false);
    removeTokenLocal(id);
  } catch {
    // toast handled in token-client
  }
}

export async function softDeleteTokenAction(id: string) {
  if (!canEditWorkspaceTokens()) {
    toast.error("Viewer role is read-only");
    return;
  }
  const ws = useTokenStore.getState().workspaceId;
  if (!ws) {
    useTokenStore.setState((s) => ({
      tokens: s.tokens.map((t) => (t.id === id ? { ...t, deprecated: true } : t)),
      replayKey: s.replayKey + 1,
    }));
    return;
  }

  try {
    const updated = await deleteTokenRemote(ws, id, true);
    if (!updated) {
      useTokenStore.setState((s) => ({
        tokens: s.tokens.map((t) =>
          t.id === id ? { ...t, deprecated: true, updatedAt: new Date().toISOString() } : t,
        ),
        replayKey: s.replayKey + 1,
      }));
      return;
    }

    useTokenStore.setState((s) => ({
      tokens: s.tokens.map((t) => (t.id === id ? { ...updated, pendingSync: false } : t)),
      replayKey: s.replayKey + 1,
    }));
  } catch {
    // toast handled in token-client
  }
}
