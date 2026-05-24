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

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { getTokenNameValidationError } from "@/lib/token-name";
import { cn } from "@/lib/utils";
import {
  humanizeTokenDescriptor,
  tokenDescriptorFromName,
  tokenMatchesSearch,
} from "@/lib/token-display";
import { categoryConfig, categoryOrder } from "@/lib/tokn-constants";
import { useTokenStore } from "@/lib/token-store";
import {
  createTokenAction,
  deleteTokenAction,
  duplicateTokenAction,
  saveTokenNameAction,
  softDeleteTokenAction,
} from "@/lib/token-actions";
import { flushWorkspaceTokenPatches } from "@/lib/workspace-token-sync";

import { normalizeTokenNameInput, type StudioSection } from "./shared";

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
  const [listGroupMode, setListGroupMode] = useState<"category" | "component">("component");
  const inlineInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    return tokens.filter((t) => tokenMatchesSearch(t, searchQuery));
  }, [tokens, searchQuery]);

  const grouped = useMemo(() => {
    if (listGroupMode === "category") {
      return categoryOrder
        .map((cat) => ({
          kind: "category" as const,
          id: cat,
          title: cat,
          items: filtered.filter((t) => t.category === cat),
        }))
        .filter((g) => g.items.length > 0);
    }
    const map = new Map<string, typeof filtered>();
    for (const t of filtered) {
      const key = tokenDescriptorFromName(t.name);
      const bucket = key === "" ? "__" : key;
      if (!map.has(bucket)) map.set(bucket, []);
      map.get(bucket)!.push(t);
    }
    return [...map.entries()]
      .sort(([a], [b]) =>
        humanizeTokenDescriptor(a === "__" ? "" : a).localeCompare(
          humanizeTokenDescriptor(b === "__" ? "" : b),
        ),
      )
      .map(([bucket, items]) => ({
        kind: "component" as const,
        id: bucket,
        title: humanizeTokenDescriptor(bucket === "__" ? "" : bucket),
        items: [...items].sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [filtered, listGroupMode]);

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

  async function submitRename() {
    if (!canEditTokens) return;
    if (!editingTokenId) return;
    const targetToken = tokens.find((token) => token.id === editingTokenId);
    if (!targetToken) {
      cancelRename();
      return;
    }

    const next = normalizeTokenNameInput(inlineName, targetToken.category);
    const validationError = getTokenNameValidationError(next);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (tokens.some((t) => t.id !== editingTokenId && t.name === next)) {
      toast.error("That name is already taken");
      return;
    }

    setInlineName(next);
    try {
      await saveTokenNameAction(editingTokenId, next);
      setEditingTokenId(null);
      setInlineName("");
    } catch {
      // saveTokenNameAction already surfaces validation/server errors via toast.
    }
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
    <aside className="flex w-[288px] min-w-[272px] shrink-0 flex-col border-r border-border bg-muted/30">
      <div className="shrink-0 space-y-4 border-b border-border px-4 pb-5 pt-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Workspace</p>
        <div className="flex items-center gap-3">
          <Avatar className="size-8 rounded-md">
            <AvatarFallback className="rounded-md text-sm font-bold">M</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-[13px] font-semibold leading-tight text-foreground">
              {workspaceName?.trim() || "Workspace"}
            </p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">v1.0.0-beta</p>
          </div>
        </div>

        <div className="space-y-1.5">
          {SIDEBAR_ROUTES.map((item) => {
            const active = item.key === activeSection;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSectionChange(item.key)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeSection === "library" ? (
        <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 transition-all duration-300">
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Categories</p>
            <div className="space-y-2">
              {categoryStats.map(({ category, count }) => (
                <div
                  key={category}
                  className="flex items-center justify-between rounded-lg px-2.5 py-2 text-[11px] text-foreground"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: categoryConfig[category].color }}
                    />
                    <span>{category}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </nav>
      ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 space-y-4 border-b border-border/70 px-4 pb-4 pt-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, component, tags…"
                className="h-10 rounded-lg border-border bg-background py-2 pl-10 pr-3 text-xs shadow-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={listGroupMode === "component" ? "default" : "secondary"}
                className="h-8 rounded-md px-3 text-[10px] font-semibold uppercase tracking-wide"
                onClick={() => setListGroupMode("component")}
              >
                By component
              </Button>
              <Button
                type="button"
                size="sm"
                variant={listGroupMode === "category" ? "default" : "secondary"}
                className="h-8 rounded-md px-3 text-[10px] font-semibold uppercase tracking-wide"
                onClick={() => setListGroupMode("category")}
              >
                By category
              </Button>
            </div>
          </div>
          <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
            <div className="space-y-6">
              {grouped.map((group) => (
                <div key={`${group.kind}-${group.id}`}>
                  <p className="mb-2.5 px-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {group.title}
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
                            "flex items-center gap-2 rounded-lg px-2.5 py-2.5",
                            selected ? "bg-accent" : "hover:bg-muted",
                          )}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2.5">
                            <div
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: selected ? "#4c3dc9" : config.color }}
                            />

                            {isEditing ? (
                              <Input
                                ref={inlineInputRef}
                                value={inlineName}
                                onChange={(event) => setInlineName(event.target.value)}
                                onBlur={() => {
                                  void submitRename();
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    void submitRename();
                                  }
                                  if (event.key === "Escape") {
                                    event.preventDefault();
                                    cancelRename();
                                  }
                                }}
                                className="h-8 flex-1 rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs"
                              />
                            ) : (
                              <button
                                type="button"
                                className="flex min-w-0 flex-1 flex-col gap-1 text-left"
                                onClick={() => selectToken(token.id)}
                              >
                                <div className="flex min-w-0 items-center gap-1.5">
                                  <span
                                    className={cn(
                                      "min-w-0 flex-1 truncate text-[12px] font-semibold leading-snug",
                                      selected ? "text-primary" : "text-foreground",
                                    )}
                                  >
                                    {humanizeTokenDescriptor(tokenDescriptorFromName(token.name))}
                                  </span>
                                  {(() => {
                                    const rel = recentUpdateLabel(token.updatedAt);
                                    return rel ? (
                                      <Badge
                                        variant="secondary"
                                        className="h-4 shrink-0 border-0 bg-accent px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide text-accent-foreground"
                                        title={
                                          token.updatedAt ? new Date(token.updatedAt).toLocaleString() : undefined
                                        }
                                      >
                                        {rel}
                                      </Badge>
                                    ) : null;
                                  })()}
                                </div>
                                <span
                                  className={cn(
                                    "truncate font-mono text-[10px] leading-snug text-muted-foreground",
                                    selected ? "text-primary/80" : "",
                                  )}
                                >
                                  {token.name || "untitled"}
                                </span>
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
                                      "h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted",
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
                          <div className="mt-2 rounded-lg border border-border bg-card p-3 text-xs shadow-sm">
                            <p className="text-foreground">Delete {token.name || "untitled"}? This cannot be undone.</p>
                            <div className="mt-3 flex justify-end gap-2">
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
          </nav>
        </div>
      )}

      <div className="shrink-0 space-y-3 border-t border-border p-4">
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
              void createTokenAction();
            }}
            className="h-8 w-full justify-center rounded-md border border-dashed border-border bg-transparent text-xs font-medium text-foreground hover:bg-muted"
          >
            New Token
          </Button>
        ) : null}
        <div className="px-1 text-[10px] text-muted-foreground">
          {activeTokenCount} active tokens
          {unsyncedCount > 0 ? ` • ${unsyncedCount} pending sync` : " • live sync"}
        </div>
        <div className="mt-3 border-t border-border pt-3 text-[10px] uppercase tracking-widest text-muted-foreground">
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
