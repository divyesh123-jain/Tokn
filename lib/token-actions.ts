import { toast } from "sonner";

import { TOKEN_DEFAULTS, type MotionTokenCategory, type MotionTokenItem } from "@/lib/tokn-constants";
import {
  buildCreateTokenBody,
  createTokenRemote as createTokenRemoteImpl,
  deleteTokenRemote as deleteTokenRemoteImpl,
  patchTokenRemote as patchTokenRemoteImpl,
} from "@/lib/token-client";
import {
  createImportedShadcnToken,
  nextUniqueTokenName,
  parseShadcnComponentNames,
} from "@/lib/shadcn-import";
import { createAutoTokenName, getTokenNameValidationError } from "@/lib/token-name";
import { useTokenStore } from "@/lib/token-store";
import {
  cancelPendingTokenPatch as cancelPendingTokenPatchImpl,
  scheduleWorkspaceTokenPatch as scheduleWorkspaceTokenPatchImpl,
} from "@/lib/workspace-token-sync";

type TokenActionDeps = {
  createTokenRemote: typeof createTokenRemoteImpl;
  deleteTokenRemote: typeof deleteTokenRemoteImpl;
  patchTokenRemote: typeof patchTokenRemoteImpl;
  cancelPendingTokenPatch: typeof cancelPendingTokenPatchImpl;
  scheduleWorkspaceTokenPatch: typeof scheduleWorkspaceTokenPatchImpl;
  randomId: () => string;
  nowIso: () => string;
  notifyError: (message: string) => void;
};

const defaultTokenActionDeps: TokenActionDeps = {
  createTokenRemote: createTokenRemoteImpl,
  deleteTokenRemote: deleteTokenRemoteImpl,
  patchTokenRemote: patchTokenRemoteImpl,
  cancelPendingTokenPatch: cancelPendingTokenPatchImpl,
  scheduleWorkspaceTokenPatch: scheduleWorkspaceTokenPatchImpl,
  randomId: () => crypto.randomUUID(),
  nowIso: () => new Date().toISOString(),
  notifyError: (message) => toast.error(message),
};

let tokenActionDeps: TokenActionDeps = defaultTokenActionDeps;

export function setTokenActionDeps(overrides: Partial<TokenActionDeps>) {
  tokenActionDeps = { ...tokenActionDeps, ...overrides };
}

export function resetTokenActionDeps() {
  tokenActionDeps = defaultTokenActionDeps;
}

function deps(): TokenActionDeps {
  return tokenActionDeps;
}

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
    deps().notifyError("Viewer role is read-only");
    throw new Error("forbidden");
  }
  const store = useTokenStore.getState();
  const trimmed = name.trim();
  const validationError = getTokenNameValidationError(trimmed);
  if (validationError) {
    deps().notifyError(validationError);
    throw new Error(validationError);
  }
  const conflict = store.tokens.some((t) => t.id !== id && t.name === trimmed);
  if (conflict) {
    const message = "Token name already exists";
    deps().notifyError(message);
    throw new Error(message);
  }

  const ws = store.workspaceId;
  if (ws) deps().cancelPendingTokenPatch(ws, id);

  const now = deps().nowIso();
  useTokenStore.setState((s) => ({
    tokens: s.tokens.map((t) => (t.id === id ? { ...t, name: trimmed, updatedAt: now } : t)),
  }));

  if (!ws) return;

  const token = useTokenStore.getState().tokens.find((t) => t.id === id);
  if (!token || token.pendingSync) return;

  const server = await deps().patchTokenRemote(ws, id, token);
  useTokenStore.setState((s) => ({
    tokens: s.tokens.map((t) => (t.id === id ? { ...t, ...server, pendingSync: false } : t)),
  }));
}

export async function createTokenAction() {
  if (!canEditWorkspaceTokens()) {
    deps().notifyError("Viewer role is read-only");
    return;
  }
  const store = useTokenStore.getState();
  const ws = store.workspaceId;
  const tempId = deps().randomId();
  const token: MotionTokenItem = {
    ...TOKEN_DEFAULTS,
    id: tempId,
    name: "",
    updatedAt: deps().nowIso(),
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
    const created = await deps().createTokenRemote(ws, buildCreateTokenBody());
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
      deps().scheduleWorkspaceTokenPatch(ws, created.id, useTokenStore.getState);
    }
  } catch {
    // Roll back optimistic create on network failure.
    removeTokenLocal(tempId);
  }
}

export async function duplicateTokenAction(id: string): Promise<string | null> {
  if (!canEditWorkspaceTokens()) {
    deps().notifyError("Viewer role is read-only");
    return null;
  }
  const store = useTokenStore.getState();
  const source = store.tokens.find((t) => t.id === id);
  if (!source) return null;

  const ws = store.workspaceId;
  const nextId = deps().randomId();
  const rest: Omit<MotionTokenItem, "id"> = { ...source };
  delete (rest as { id?: string }).id;
  const duplicateName = createAutoTokenName(source.category, `copy-${Date.now().toString(36).slice(-4)}`);

  if (!ws) {
    const copy: MotionTokenItem = {
      ...rest,
      id: nextId,
      name: duplicateName,
      updatedAt: deps().nowIso(),
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
    const created = await deps().createTokenRemote(ws, body);
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
    deps().notifyError("Viewer role is read-only");
    return;
  }
  const ws = useTokenStore.getState().workspaceId;
  if (!ws) {
    removeTokenLocal(id);
    return;
  }

  try {
    await deps().deleteTokenRemote(ws, id, false);
    removeTokenLocal(id);
  } catch {
    // toast handled in token-client
  }
}

export async function softDeleteTokenAction(id: string) {
  if (!canEditWorkspaceTokens()) {
    deps().notifyError("Viewer role is read-only");
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
    const updated = await deps().deleteTokenRemote(ws, id, true);
    if (!updated) {
      useTokenStore.setState((s) => ({
        tokens: s.tokens.map((t) =>
          t.id === id ? { ...t, deprecated: true, updatedAt: deps().nowIso() } : t,
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

export async function importShadcnComponentsAction(
  rawInput: string,
  options?: { categoryOverride?: MotionTokenCategory },
) {
  if (!canEditWorkspaceTokens()) {
    deps().notifyError("Viewer role is read-only");
    return { imported: 0, skipped: 0 };
  }

  const components = parseShadcnComponentNames(rawInput);
  if (components.length === 0) {
    deps().notifyError("No supported shadcn components found in input");
    return { imported: 0, skipped: 0 };
  }

  const store = useTokenStore.getState();
  const ws = store.workspaceId;
  const takenNames = new Set(store.tokens.map((token) => token.name));
  const createdTokens: MotionTokenItem[] = [];
  let skipped = 0;

  for (const component of components) {
    const mapped = createImportedShadcnToken(component);
    const category = options?.categoryOverride ?? mapped.category;
    const name = nextUniqueTokenName(category, mapped.descriptor, takenNames);
    const nameError = getTokenNameValidationError(name);
    if (nameError) {
      skipped += 1;
      continue;
    }

    const body = buildCreateTokenBody({
      ...mapped.patch,
      category,
      name,
      deprecated: false,
      delayMs: 0,
    });

    if (!ws) {
      createdTokens.push({
        ...body,
        id: deps().randomId(),
        pendingSync: false,
        updatedAt: deps().nowIso(),
      });
      continue;
    }

    try {
      const created = await deps().createTokenRemote(ws, body);
      createdTokens.push({ ...created, pendingSync: false });
    } catch {
      skipped += 1;
    }
  }

  if (createdTokens.length === 0) {
    return { imported: 0, skipped: components.length };
  }

  const lastId = createdTokens[createdTokens.length - 1]?.id ?? null;
  useTokenStore.setState((s) => ({
    tokens: [...s.tokens, ...createdTokens],
    selectedId: lastId ?? s.selectedId,
    replayKey: s.replayKey + 1,
  }));

  return { imported: createdTokens.length, skipped };
}
