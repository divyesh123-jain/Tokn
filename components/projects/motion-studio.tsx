"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, MoreHorizontal, Pencil, Play, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemePicker } from "@/components/theme/theme-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { recentUpdateLabel } from "@/lib/token-recent";
import { cn } from "@/lib/utils";
import {
  type MotionTokenItem,
  type MotionTokenCategory,
  categoryConfig,
  categoryOrder,
  motionCategories,
} from "@/lib/motif";
import {
  useTokenStore,
  useSelectedToken,
  type PreviewComponent,
  type CodeFormat,
} from "@/lib/token-store";
import {
  createTokenAction,
  deleteTokenAction,
  duplicateTokenAction,
  saveTokenNameAction,
  softDeleteTokenAction,
} from "@/lib/token-actions";
import { transformToken } from "@/lib/codegen";

const EASING_MAP: Record<string, [number, number, number, number]> = {
  "ease-out": [0, 0, 0.58, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
  linear: [0, 0, 1, 1],
};

function toFramerEasing(raw: string): [number, number, number, number] {
  if (raw.startsWith("cubic-bezier(")) {
    const nums = raw.replace(/cubic-bezier\(|\)/g, "").split(",").map(Number);
    return nums as [number, number, number, number];
  }
  return EASING_MAP[raw] ?? EASING_MAP["ease-out"];
}

function tokenTransition(t: MotionTokenItem) {
  if (t.isSpring) {
    return {
      type: "spring" as const,
      stiffness: t.springStiffness,
      damping: t.springDamping,
      mass: t.springMass,
    };
  }
  return {
    duration: t.durationMs / 1000,
    delay: t.delayMs / 1000,
    ease: toFramerEasing(t.easing),
  };
}

const PREVIEW_TABS: { key: PreviewComponent; label: string }[] = [
  { key: "button", label: "Button" },
  { key: "card", label: "Card" },
  { key: "modal", label: "Modal" },
  { key: "toast", label: "Toast" },
  { key: "list", label: "List item" },
];

const EASING_PRESETS = ["ease-out", "ease-in-out", "linear", "ease-in"];

const CODE_TABS: { key: CodeFormat; label: string }[] = [
  { key: "framerMotion", label: "Framer Motion" },
  { key: "css", label: "CSS" },
  { key: "tailwind", label: "Tailwind CSS" },
  { key: "json", label: "JSON" },
];

export function MotionStudio({ embedded }: { embedded?: boolean } = {}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        embedded ? "h-full min-h-0" : "h-screen",
      )}
    >
      {/* <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-2">
        <nav className="flex items-center gap-2 overflow-x-auto rounded-xl border border-border bg-card/70 px-2 py-1.5 backdrop-blur">
          <Link
            href="/tokens"
            className="rounded-lg border border-border bg-muted/30 px-2 py-1 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            Tokens
          </Link>
          <Link
            href="/preview"
            className="rounded-lg border border-border bg-muted/30 px-2 py-1 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            Preview Lab
          </Link>
          <Link
            href="/releases"
            className="rounded-lg border border-border bg-muted/30 px-2 py-1 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            Releases
          </Link>
          <Link
            href="/settings"
            className="rounded-lg bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Profile
          </Link>
        </nav>

        <ThemePicker variant="compact" />
      </div> */}

      <div className="flex h-full">
        <TokenListPanel />
        <PreviewPanel />
        <PropertiesPanel />
      </div>
    </div>
  );
}

function TokenListPanel() {
  const {
    tokens,
    selectedId,
    workspaceRole,
    searchQuery,
    setSearch,
    selectToken,
    hasPublishedUsage,
  } = useTokenStore();
  const canEditTokens = workspaceRole === "owner" || workspaceRole === "editor";
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editingTokenId, setEditingTokenId] = useState<string | null>(null);
  const [inlineName, setInlineName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return tokens.filter((t) => t.name.toLowerCase().includes(q));
  }, [tokens, searchQuery]);

  const grouped = useMemo(() => {
    return categoryOrder
      .map((cat) => ({
        category: cat,
        items: filtered.filter((t) => t.category === cat),
      }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);

  const activeTokenCount = useMemo(
    () => tokens.filter((token) => !token.deprecated).length,
    [tokens],
  );
  const tokenLimit = 20;
  const nearLimit = activeTokenCount >= 17;
  const tokenLimitReached = activeTokenCount >= tokenLimit;

  useEffect(() => {
    if (editingTokenId && inlineInputRef.current) {
      inlineInputRef.current.focus();
      inlineInputRef.current.select();
    }
  }, [editingTokenId]);

  function startRename(tokenId: string, currentName: string) {
    if (!canEditTokens) return;
    setDeleteConfirmId(null);
    setEditingTokenId(tokenId);
    setInlineName(currentName);
  }

  function submitRename() {
    if (!canEditTokens) return;
    if (!editingTokenId) return;
    const next = inlineName.trim() || "untitled";
    if (tokens.some((t) => t.id !== editingTokenId && t.name === next)) {
      toast.error("That name is already taken");
      return;
    }
    void saveTokenNameAction(editingTokenId, inlineName);
    setEditingTokenId(null);
    setInlineName("");
  }

  function cancelRename() {
    setEditingTokenId(null);
    setInlineName("");
  }

  function requestDelete(tokenId: string) {
    if (!canEditTokens) return;
    setEditingTokenId(null);
    setDeleteConfirmId(tokenId);
  }

  function confirmDelete(tokenId: string) {
    if (!canEditTokens) return;
    if (hasPublishedUsage(tokenId)) {
      void softDeleteTokenAction(tokenId);
    } else {
      void deleteTokenAction(tokenId);
    }
    setDeleteConfirmId(null);
  }

  return (
    <aside className="flex w-[220px] flex-col border-r border-border bg-card">
      <div className="p-4 pb-3">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-[10px] font-bold text-primary-foreground">
            TK
          </div>
          <span className="text-sm font-semibold text-foreground">Tokn</span>
          <span className="text-[10px] text-muted-foreground">v1.0</span>
        </div>
        {nearLimit ? (
          <p className="mb-2 text-[10px] text-muted-foreground">
            {activeTokenCount}/{tokenLimit} tokens used
          </p>
        ) : null}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tokens…"
            className="h-auto border-0 bg-background py-1.5 pl-8 pr-3 text-xs shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-auto px-2">
        {grouped.map((group) => (
          <div key={group.category} className="mb-3">
            <p
              className="mb-1 px-2 text-[10px] font-semibold uppercase text-[#888780]"
              style={{ letterSpacing: "0.06em" }}
            >
              {group.category}
            </p>
            {group.items.map((token) => {
              const sel = token.id === selectedId;
              const cfg = categoryConfig[token.category];
              const isHovered = hoveredId === token.id;
              const isEditing = editingTokenId === token.id;
              const showMenu = canEditTokens && (sel || isHovered);
              const showDeleteConfirm = deleteConfirmId === token.id;
              return (
                <div
                  key={token.id}
                  className="relative"
                  onMouseEnter={() => setHoveredId(token.id)}
                  onMouseLeave={() => setHoveredId((current) => (current === token.id ? null : current))}
                >
                  <div
                    className={cn(
                      "flex items-center gap-1 rounded-lg px-2 py-1.5",
                      sel ? "bg-[#EEEDFE]" : "hover:bg-muted",
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <div
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: sel ? "#534AB7" : cfg.color,
                        }}
                      />
                      {isEditing ? (
                        <Input
                          ref={inlineInputRef}
                          value={inlineName}
                          onChange={(event) => setInlineName(event.target.value)}
                          onBlur={submitRename}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              submitRename();
                            }
                            if (event.key === "Escape") {
                              event.preventDefault();
                              cancelRename();
                            }
                          }}
                          className="h-6 flex-1 rounded border border-border px-1.5 py-1 font-mono text-xs"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => selectToken(token.id)}
                          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                        >
                          <span
                            className={cn(
                              "min-w-0 flex-1 truncate text-xs font-medium",
                              sel ? "text-[#3C3489]" : "text-foreground",
                            )}
                          >
                            {token.name || "untitled"}
                          </span>
                          {(() => {
                            const rel = recentUpdateLabel(token.updatedAt);
                            return rel ? (
                              <Badge
                                variant="secondary"
                                className="h-4 shrink-0 border-0 bg-primary/10 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide text-primary"
                                title={token.updatedAt ? new Date(token.updatedAt).toLocaleString() : undefined}
                              >
                                {rel}
                              </Badge>
                            ) : null;
                          })()}
                        </button>
                      )}
                    </div>
                    {canEditTokens ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(event) => event.stopPropagation()}
                              className={cn(
                                "h-6 w-6 rounded-md text-[#888780] hover:bg-muted",
                                showMenu ? "opacity-100" : "opacity-0",
                              )}
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" sideOffset={6} className="w-40">
                          <DropdownMenuItem
                            onClick={() => void duplicateTokenAction(token.id)}
                            className="text-xs"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => startRename(token.id, token.name)}
                            className="text-xs"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => requestDelete(token.id)}
                            variant="destructive"
                            className="text-xs"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                  {showDeleteConfirm && (
                    <div className="mt-1 rounded-lg border border-border bg-popover p-2 text-xs shadow-md">
                      <p className="text-foreground">
                        Delete {token.name || "untitled"}? This cannot be undone.
                      </p>
                      <div className="mt-2 flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setDeleteConfirmId(null)}
                          className="h-auto px-2 py-1 text-[11px]"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => confirmDelete(token.id)}
                          className="h-auto px-2 py-1 text-[11px] text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {canEditTokens ? (
        <div className="border-t border-border p-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (tokenLimitReached) return;
              void createTokenAction();
            }}
            disabled={tokenLimitReached}
            title={
              tokenLimitReached
                ? "Token limit reached. Upgrade to Solo for unlimited tokens."
                : undefined
            }
            className={cn(
              "flex h-auto w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs font-normal text-muted-foreground hover:border-primary/40 hover:bg-transparent hover:text-foreground",
              tokenLimitReached && "cursor-not-allowed opacity-50 hover:border-border hover:text-muted-foreground",
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            New token
          </Button>
        </div>
      ) : null}
    </aside>
  );
}

function PreviewPanel() {
  const { previewComponent, setPreviewComponent, replayKey, replay } =
    useTokenStore();
  const token = useSelectedToken();
  if (!token) return <main className="flex-1 bg-[#F1EFE8]" />;

  const durPercent = Math.min(100, Math.max(8, token.durationMs / 8));

  return (
    <main className="flex flex-1 flex-col overflow-auto bg-[#F1EFE8]">
      <div className="flex flex-1 items-center justify-center p-8">
        <div
          className="overflow-hidden rounded-xl bg-white shadow-lg"
          style={{ width: 320 }}
        >
          <div className="flex items-center gap-1.5 border-b border-gray-100 px-3 py-2.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#FF6058]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex min-h-[220px] items-center justify-center p-8">
            <motion.div
              key={`${replayKey}-${previewComponent}`}
              initial={{
                opacity: token.opacityStart,
                y: token.yOffset,
                scale: token.scaleStart,
              }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={tokenTransition(token)}
            >
              <PreviewComponent type={previewComponent} />
            </motion.div>
          </div>
        </div>
      </div>

      <div className="px-8 pb-5">
        <div className="flex items-center gap-2">
          {PREVIEW_TABS.map((tab) => (
            <Button
              key={tab.key}
              type="button"
              variant="ghost"
              onClick={() => setPreviewComponent(tab.key)}
              className={cn(
                "h-auto rounded-lg px-3 py-1.5 text-xs font-medium",
                previewComponent === tab.key
                  ? "bg-white text-foreground shadow-sm hover:bg-white"
                  : "text-[#888780] hover:bg-transparent hover:text-foreground",
              )}
            >
              {tab.label}
            </Button>
          ))}
          <div className="flex-1" />
          <Button
            type="button"
            variant="ghost"
            onClick={replay}
            className="h-auto gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-gray-50"
          >
            <Play className="h-3 w-3" />
            Replay
          </Button>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-16 text-[10px] text-[#888780]">opacity</span>
            <div className="flex-1">
              <div
                className="h-1.5 rounded-full bg-[#534AB7]"
                style={{ width: `${token.opacityStart < 1 ? durPercent : 0}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-16 text-[10px] text-[#888780]">transform</span>
            <div className="flex-1">
              <div
                className="h-1.5 rounded-full bg-[#3BA89E]"
                style={{
                  width: `${token.yOffset !== 0 || token.scaleStart !== 1 ? durPercent : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function PreviewComponent({ type }: { type: PreviewComponent }) {
  switch (type) {
    case "button":
      return (
        <Button
          type="button"
          className="h-auto rounded-lg bg-[#534AB7] px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#534AB7]"
        >
          Get started
        </Button>
      );
    case "card":
      return (
        <div className="w-56 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 h-20 rounded-lg bg-gray-50" />
          <p className="text-sm font-medium text-gray-900">Welcome back</p>
          <p className="mt-1 text-xs text-gray-500">Dashboard is ready</p>
        </div>
      );
    case "modal":
      return (
        <div className="w-64 rounded-xl bg-white p-5 shadow-xl ring-1 ring-gray-100">
          <h4 className="font-semibold text-gray-900">Confirm action</h4>
          <p className="mt-2 text-xs text-gray-500">
            This action cannot be undone.
          </p>
          <div className="mt-4 flex gap-2">
            <span className="flex-1 rounded-lg border border-gray-200 py-2 text-center text-xs text-gray-600">
              Cancel
            </span>
            <span className="flex-1 rounded-lg bg-[#534AB7] py-2 text-center text-xs text-white">
              Confirm
            </span>
          </div>
        </div>
      );
    case "toast":
      return (
        <div className="flex items-center gap-2.5 rounded-lg bg-gray-900 px-4 py-3 shadow-lg">
          <div className="h-4 w-4 rounded-full bg-green-400" />
          <span className="text-sm text-white">Changes saved</span>
        </div>
      );
    case "list":
      return (
        <div className="flex w-56 items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
          <div className="h-9 w-9 rounded-full bg-[#EEEDFE]" />
          <div>
            <p className="text-sm font-medium text-gray-900">Design review</p>
            <p className="text-[10px] text-gray-400">Updated 2h ago</p>
          </div>
        </div>
      );
  }
}

function PropertiesPanel() {
  const {
    tokens,
    workspaceRole,
    updateToken,
    codeFormat,
    setCodeFormat,
    nameFocusTargetId,
    nameFocusSelectAll,
    clearNameFocusRequest,
  } = useTokenStore();
  const token = useSelectedToken();
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const canEditTokens = workspaceRole === "owner" || workspaceRole === "editor";

  useEffect(() => {
    if (token) setNameDraft(token.name);
  }, [token?.id]);

  const nameConflict = useMemo(() => {
    if (!token || !nameDraft.trim()) return false;
    const next = nameDraft.trim();
    return tokens.some((t) => t.id !== token.id && t.name === next);
  }, [tokens, token, nameDraft]);

  const nameDirty =
    !!token && nameDraft.trim() !== (token.name || "").trim();

  const code = useMemo(() => {
    if (!token) return { framerMotion: "", css: "", tailwind: "", json: "" };
    return transformToken({ ...token, name: nameDraft });
  }, [token, nameDraft]);

  useEffect(() => {
    if (!token || !nameInputRef.current) return;
    if (token.name === "") {
      nameInputRef.current.focus();
      return;
    }
    if (nameFocusTargetId === token.id) {
      nameInputRef.current.focus();
      if (nameFocusSelectAll) {
        nameInputRef.current.select();
      }
      clearNameFocusRequest();
    }
  }, [token, nameFocusTargetId, nameFocusSelectAll, clearNameFocusRequest]);

  if (!token) {
    return (
      <aside className="flex w-[260px] items-center justify-center border-l border-border bg-card p-5">
        <p className="text-xs text-muted-foreground">No token selected</p>
      </aside>
    );
  }

  function update(patch: Partial<MotionTokenItem>) {
    if (!canEditTokens) return;
    updateToken(token!.id, patch);
  }

  async function commitTokenName() {
    if (!canEditTokens) return;
    if (!token || nameConflict) return;
    setNameSaving(true);
    try {
      await saveTokenNameAction(token.id, nameDraft);
      toast.success("Name saved");
    } finally {
      setNameSaving(false);
    }
  }

  function handleBlur() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(code[codeFormat]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <aside className="flex w-[260px] flex-col overflow-auto border-l border-border bg-card">
      <div className="flex-1 p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#888780]">
            Properties
          </p>
          {saved && (
            <span className="text-[10px] font-medium text-primary">Saved</span>
          )}
        </div>

        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-[10px] text-[#888780]">Name</label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Duplicate this token."
              onClick={() => void duplicateTokenAction(token.id)}
              disabled={!canEditTokens}
              className="h-6 w-6 rounded-md text-[#888780] hover:bg-muted"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Input
                ref={nameInputRef}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (!canEditTokens) return;
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void commitTokenName();
                  }
                }}
                placeholder="enter.default"
                disabled={!canEditTokens}
                className={cn(
                  "h-auto rounded-lg border bg-background px-2.5 py-1.5 pr-8 font-mono text-xs focus-visible:ring-2 focus-visible:ring-ring",
                  nameConflict ? "border-red-400" : "border-border",
                )}
              />
              {nameDirty && !nameConflict && nameDraft.trim() && (
                <span className="pointer-events-none absolute right-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-amber-500" />
              )}
            </div>
            <Button
              type="button"
              size="sm"
              className="h-9 shrink-0 px-3 text-xs"
              disabled={!canEditTokens || !nameDirty || nameConflict || nameSaving}
              onClick={() => void commitTokenName()}
            >
              {nameSaving ? "…" : "Save"}
            </Button>
          </div>
          {nameConflict && (
            <p className="mt-1 text-[10px] text-red-500">
              This name is already taken
            </p>
          )}
          {token.updatedAt && (() => {
            const rel = recentUpdateLabel(token.updatedAt);
            return (
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                {rel ? (
                  <>
                    Updated{" "}
                    <span className="font-medium text-foreground">{rel}</span>
                  </>
                ) : (
                  <>Updated {new Date(token.updatedAt).toLocaleString()}</>
                )}
              </p>
            );
          })()}
        </div>

        <div className="mb-5">
          <label className="mb-1 block text-[10px] text-[#888780]">
            Category
          </label>
          <Select
            value={token.category}
            disabled={!canEditTokens}
            onValueChange={(v) =>
              update({ category: v as MotionTokenCategory })
            }
          >
            <SelectTrigger className="h-auto w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-normal shadow-none focus:ring-2 focus:ring-ring">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {motionCategories.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mb-5 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#888780]">
            {token.isSpring ? "Spring physics" : "Timing"}
          </span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => update({ isSpring: !token.isSpring })}
            disabled={!canEditTokens}
            className={cn(
              "relative h-[18px] w-8 shrink-0 rounded-full p-0 hover:bg-transparent",
              token.isSpring ? "bg-primary" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform",
                token.isSpring ? "translate-x-[14px]" : "translate-x-0.5",
              )}
            />
          </Button>
        </div>

        {token.isSpring ? (
          <div className="space-y-4">
            <Slider
              label="Stiffness"
              value={token.springStiffness}
              min={1}
              max={500}
              step={1}
              onChange={(v) => update({ springStiffness: v })}
              onBlur={handleBlur}
              disabled={!canEditTokens}
            />
            <Slider
              label="Damping"
              value={token.springDamping}
              min={1}
              max={100}
              step={1}
              onChange={(v) => update({ springDamping: v })}
              onBlur={handleBlur}
              disabled={!canEditTokens}
            />
            <Slider
              label="Mass"
              value={token.springMass}
              min={0.1}
              max={10}
              step={0.1}
              suffix=""
              onChange={(v) => update({ springMass: v })}
              onBlur={handleBlur}
              disabled={!canEditTokens}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <Slider
              label="Duration"
              value={token.durationMs}
              min={0}
              max={1000}
              step={10}
              suffix="ms"
              onChange={(v) => update({ durationMs: v })}
              onBlur={handleBlur}
              disabled={!canEditTokens}
            />
            <Slider
              label="Delay"
              value={token.delayMs}
              min={0}
              max={500}
              step={10}
              suffix="ms"
              onChange={(v) => update({ delayMs: v })}
              onBlur={handleBlur}
              disabled={!canEditTokens}
            />
          </div>
        )}

        <div className="mt-4 space-y-4">
          <Slider
            label="Y Offset"
            value={token.yOffset}
            min={-100}
            max={100}
            step={1}
            suffix="px"
            onChange={(v) => update({ yOffset: v })}
            onBlur={handleBlur}
            disabled={!canEditTokens}
          />
          <Slider
            label="Scale"
            value={token.scaleStart}
            min={0}
            max={2}
            step={0.01}
            onChange={(v) => update({ scaleStart: v })}
            onBlur={handleBlur}
            disabled={!canEditTokens}
          />
          <Slider
            label="Opacity"
            value={token.opacityStart}
            min={0}
            max={1}
            step={0.1}
            onChange={(v) => update({ opacityStart: v })}
            onBlur={handleBlur}
            disabled={!canEditTokens}
          />
        </div>

        {!token.isSpring && (
          <div className="mt-5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#888780]">
              Easing
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {EASING_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="ghost"
                  onClick={() => update({ easing: preset })}
                  disabled={!canEditTokens}
                  className={cn(
                    "h-auto rounded-lg px-2 py-1.5 text-[11px] font-medium",
                    token.easing === preset
                      ? "bg-[#EEEDFE] text-[#3C3489] hover:bg-[#EEEDFE]"
                      : "bg-muted text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {preset}
                </Button>
              ))}
            </div>
            <Input
              value={
                token.easing.startsWith("cubic-bezier") ? token.easing : ""
              }
              onChange={(e) => update({ easing: e.target.value })}
              onBlur={handleBlur}
              disabled={!canEditTokens}
              placeholder="cubic-bezier(0.4, 0, 0.2, 1)"
              className="mt-2 h-auto rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-[10px] placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        )}

        <div className="mt-5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#888780]">
            Generated code
          </p>
          <div className="mb-2 flex flex-wrap gap-1">
            {CODE_TABS.map((tab) => (
              <Button
                key={tab.key}
                type="button"
                variant="ghost"
                onClick={() => setCodeFormat(tab.key)}
                className={cn(
                  "h-auto rounded px-2 py-1 text-[10px] font-medium",
                  codeFormat === tab.key
                    ? "bg-[#EEEDFE] text-[#3C3489] hover:bg-[#EEEDFE]"
                    : "text-muted-foreground hover:bg-transparent hover:text-foreground",
                )}
              >
                {tab.label}
              </Button>
            ))}
          </div>
          <pre className="max-h-[200px] overflow-auto rounded-lg bg-background p-3 font-mono text-[11px] leading-relaxed text-foreground">
            <code>{code[codeFormat]}</code>
          </pre>
        </div>
      </div>

      <div className="border-t border-border p-4">
        {canEditTokens ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => void deleteTokenAction(token.id)}
            className="mb-2 flex h-auto w-full items-center justify-center gap-1.5 rounded-lg border border-border py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete token
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          onClick={handleCopy}
          className="flex h-auto w-full items-center justify-center gap-1.5 rounded-lg border border-border py-2.5 text-xs font-medium text-foreground hover:bg-muted"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-500" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy code
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
  onBlur,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
  onBlur?: () => void;
  disabled?: boolean;
}) {
  const display =
    step < 1 ? value.toFixed(step < 0.1 ? 2 : 1) : String(value);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-mono text-xs font-medium text-foreground">
          {display}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onBlur}
        disabled={disabled}
        className="w-full"
      />
    </div>
  );
}
