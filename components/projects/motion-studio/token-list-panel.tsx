"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Boxes,
  Copy,
  FileText,
  FlaskConical,
  Gauge,
  LifeBuoy,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { recentUpdateLabel } from "@/lib/token-recent";
import { cn } from "@/lib/utils";
import { categoryConfig, categoryOrder } from "@/lib/motif";
import { useTokenStore } from "@/lib/token-store";
import {
  createTokenAction,
  deleteTokenAction,
  duplicateTokenAction,
  saveTokenNameAction,
  softDeleteTokenAction,
} from "@/lib/token-actions";
import { flushWorkspaceTokenPatches } from "@/lib/workspace-token-sync";

import type { StudioSection } from "./shared";

const SIDEBAR_ROUTES = [
  { key: "library", label: "Library", icon: Boxes },
  { key: "physics-lab", label: "Motion Lab", icon: FlaskConical },
  { key: "inspector", label: "Global Inspector", icon: Gauge },
  { key: "manifest", label: "Manifest", icon: BookOpen },
] as const;

type TokenListPanelProps = {
  activeSection: StudioSection;
  onSectionChange: (section: StudioSection) => void;
  workspaceName?: string;
};

export function TokenListPanel({
  activeSection,
  onSectionChange,
  workspaceName,
}: TokenListPanelProps) {
  const {
    tokens,
    selectedId,
    workspaceRole,
    searchQuery,
    setSearch,
    selectToken,
    hasPublishedUsage,
    workspaceId,
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
  const categoryStats = useMemo(
    () =>
      categoryOrder
        .map((category) => ({
          category,
          count: tokens.filter((token) => !token.deprecated && token.category === category).length,
        }))
        .filter((item) => item.count > 0),
    [tokens],
  );
  const unsyncedCount = useMemo(
    () => tokens.filter((token) => token.pendingSync && !token.deprecated).length,
    [tokens],
  );
  const tokenLimit = 20;
  const tokenLimitReached = activeTokenCount >= tokenLimit;
  const [deploying, setDeploying] = useState(false);

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

  async function deployChanges() {
    if (!workspaceId || deploying) return;
    setDeploying(true);
    try {
      await flushWorkspaceTokenPatches(workspaceId, useTokenStore.getState);
      toast.success("Changes deployed");
    } finally {
      setDeploying(false);
    }
  }

  return (
    <aside className="flex w-62 shrink-0 flex-col border-r border-[#dddcd7] bg-[#efefed]">
      <div className="border-b border-[#dddcd7] px-4 pb-4 pt-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b8a83]">Workspace</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#4c3dc9] text-sm font-bold text-white">
            M
          </div>
          <div>
            <p className="text-[13px] font-semibold leading-tight text-[#161616]">
              {workspaceName?.trim() || "Workspace"}
            </p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-[#84837c]">v1.0.0-beta</p>
          </div>
        </div>

        <div className="mt-4 space-y-1">
          {SIDEBAR_ROUTES.map((item) => {
            const active = item.key === activeSection;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSectionChange(item.key)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-widest",
                  active
                    ? "bg-[#d9d7f3] text-[#2d247c]"
                    : "text-[#4d4b44] hover:bg-[#e6e5df]",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-auto px-3 py-4 transition-all duration-300">
        {activeSection === "library" ? (
          <div>
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b8a83]">Categories</p>
            <div className="space-y-1">
              {categoryStats.map(({ category, count }) => (
                <div
                  key={category}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-[11px] text-[#3f3d35]"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: categoryConfig[category].color }}
                    />
                    <span>{category}</span>
                  </div>
                  <span className="text-[10px] text-[#7f7d74]">{count}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8f8d84]" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search token"
                className="h-8 rounded-md border-[#d6d4cd] bg-[#f7f7f5] py-1 pl-8 pr-2 text-xs shadow-none"
              />
            </div>
            <div className="space-y-3">
              {grouped.map((group) => (
                <div key={group.category}>
                  <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-[#8c8a81]">
                    {group.category}
                  </p>
                  {group.items.map((token) => {
                    const selected = token.id === selectedId;
                    const isHovered = hoveredId === token.id;
                    const isEditing = editingTokenId === token.id;
                    const showMenu = canEditTokens && (selected || isHovered);
                    const showDeleteConfirm = deleteConfirmId === token.id;
                    const config = categoryConfig[token.category];

                    return (
                      <div
                        key={token.id}
                        onMouseEnter={() => setHoveredId(token.id)}
                        onMouseLeave={() =>
                          setHoveredId((current) => (current === token.id ? null : current))
                        }
                      >
                        <div
                          className={cn(
                            "flex items-center gap-1 rounded-md px-2 py-1.5",
                            selected ? "bg-[#dbdaf5]" : "hover:bg-[#e7e6e1]",
                          )}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <div
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: selected ? "#4c3dc9" : config.color }}
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
                                className="h-6 flex-1 rounded border border-[#d2d0c8] bg-white px-1.5 py-1 font-mono text-xs"
                              />
                            ) : (
                              <button
                                type="button"
                                className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                                onClick={() => selectToken(token.id)}
                              >
                                <span
                                  className={cn(
                                    "truncate text-[12px] font-medium",
                                    selected ? "text-[#2f257f]" : "text-[#27261f]",
                                  )}
                                >
                                  {token.name || "untitled"}
                                </span>

                                {(() => {
                                  const rel = recentUpdateLabel(token.updatedAt);
                                  return rel ? (
                                    <Badge
                                      variant="secondary"
                                      className="h-4 border-0 bg-[#ecebfa] px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide text-[#3d318f]"
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
                                      "h-6 w-6 rounded-md text-[#888780] hover:bg-[#dedcd5]",
                                      showMenu ? "opacity-100" : "opacity-0",
                                    )}
                                  >
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                }
                              />
                              <DropdownMenuContent align="end" sideOffset={6} className="w-40">
                                <DropdownMenuItem onClick={() => void duplicateTokenAction(token.id)} className="text-xs">
                                  <Copy className="h-3.5 w-3.5" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => startRename(token.id, token.name)} className="text-xs">
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

                        {showDeleteConfirm ? (
                          <div className="mt-1 rounded-md border border-[#d6d4cd] bg-[#f9f8f4] p-2 text-xs shadow-sm">
                            <p className="text-[#1f1e1a]">Delete {token.name || "untitled"}? This cannot be undone.</p>
                            <div className="mt-2 flex justify-end gap-1.5">
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
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        )}
      </nav>

      <div className="space-y-2 border-t border-[#dddcd7] p-3">
        {canEditTokens ? (
          <Button
            type="button"
            onClick={() => {
              void deployChanges();
            }}
            disabled={!workspaceId || deploying || unsyncedCount === 0}
            className="h-8 w-full justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {deploying ? "Deploying..." : "Deploy Changes"}
          </Button>
        ) : null}
        {canEditTokens ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (tokenLimitReached) return;
              void createTokenAction();
            }}
            disabled={tokenLimitReached}
            className="h-8 w-full justify-center rounded-md border border-dashed border-[#cbc9c1] bg-transparent text-xs font-medium text-[#4d4b44] hover:bg-[#e8e7e2]"
          >
            New Token
          </Button>
        ) : null}
        <div className="px-1 text-[10px] text-[#7f7d74]">
          {activeTokenCount} active tokens
          {unsyncedCount > 0 ? ` • ${unsyncedCount} pending sync` : " • live sync"}
        </div>
        <div className="mt-3 border-t border-[#dddcd7] pt-3 text-[10px] uppercase tracking-widest text-[#86847b]">
          <div className="flex items-center gap-1.5 px-1 py-1">
            <LifeBuoy className="h-3 w-3" />
            Support
          </div>
          <div className="flex items-center gap-1.5 px-1 py-1">
            <FileText className="h-3 w-3" />
            Docs
          </div>
        </div>
      </div>
    </aside>
  );
}
