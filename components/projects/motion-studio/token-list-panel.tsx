"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  FlaskConical,
  Gauge,
  LifeBuoy,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Send,
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
import { DEFAULT_WORKSPACE_TOKEN_NAMES } from "@/lib/workspace-presets";

import { normalizeTokenNameInput, type StudioSection } from "./shared";

const SIDEBAR_ROUTES = [
  { key: "library", label: "Library", icon: Boxes },
  { key: "physics-lab", label: "Motion Lab", icon: FlaskConical },
  { key: "inspector", label: "Global Inspector", icon: Gauge },
  { key: "manifest", label: "Manifest", icon: BookOpen },
] as const;

const SECTION_HINT: Record<StudioSection, string> = {
  library: "Overview by category",
  "physics-lab": "Pick a token to preview and tune",
  inspector: "Batch edit selected tokens",
  manifest: "Workspace token manifest",
};

const SIDEBAR_PANEL_COLLAPSED_KEY = "motion-studio-sidebar-panel-collapsed";

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
    bulkTokenIds,
    toggleBulkTokenId,
    clearBulkTokenSelection,
    runBulkDeprecate,
    runBulkSnapDuration,
    runBulkBumpCategory,
  } = useTokenStore();
  const canEditTokens = workspaceRole === "owner" || workspaceRole === "editor";
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editingTokenId, setEditingTokenId] = useState<string | null>(null);
  const [inlineName, setInlineName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [listGroupMode, setListGroupMode] = useState<"category" | "component">("component");
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const [panelCollapsed, setPanelCollapsedState] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(SIDEBAR_PANEL_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  function setPanelCollapsed(next: boolean) {
    setPanelCollapsedState(next);
    try {
      window.localStorage.setItem(SIDEBAR_PANEL_COLLAPSED_KEY, next ? "1" : "0");
    } catch {}
  }

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

  const activeRoute = SIDEBAR_ROUTES.find((r) => r.key === activeSection);

  function buildTokenListBody(compact: boolean) {
    const bar = cn(
      "shrink-0 space-y-2 border-b border-border/60",
      compact ? "px-2 pb-2 pt-2" : "space-y-3 px-3 pb-3 pt-3",
    );
    const navPad = compact ? "px-2 py-2" : "px-3 py-3";
    const row = compact ? "gap-1 rounded-md px-1.5 py-1.5" : "gap-1.5 rounded-md px-2 py-2";
    const titleCls = compact ? "text-[11px]" : "text-[12px]";
    const monoCls = compact ? "text-[9px]" : "text-[10px]";
    const searchCls = compact
      ? "h-8 rounded-md border-border bg-background py-1.5 pl-7 pr-2 text-[11px] shadow-sm"
      : "h-9 rounded-md border-border bg-background py-2 pl-8 pr-2.5 text-xs shadow-sm";
    const searchIconCls = compact
      ? "pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground"
      : "pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground";
    const seg = compact ? "flex h-7 w-full rounded-md border border-border/80 bg-muted/40 p-0.5" : "flex h-8 w-full rounded-lg border border-border/80 bg-muted/40 p-0.5";
    const segBtn = compact ? "flex-1 rounded-[5px] text-[9px] font-semibold transition-colors" : "flex-1 rounded-[6px] text-[10px] font-semibold transition-colors";
    const groupStack = compact ? "space-y-3.5" : "space-y-5";
    const dot = compact ? "h-1.5 w-1.5 shrink-0 rounded-full" : "h-2 w-2 shrink-0 rounded-full";
    const menuBtn = compact ? "h-6 w-6 shrink-0 rounded-md text-muted-foreground hover:bg-muted" : "h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted";
    const menuIcon = compact ? "h-3 w-3" : "h-3.5 w-3.5";
    const seedNames = DEFAULT_WORKSPACE_TOKEN_NAMES as readonly string[];
    const activeNotDeprecated = tokens.filter((t) => !t.deprecated);
    const hasCustomToken = activeNotDeprecated.some((t) => !seedNames.includes(t.name));
    const starterToken = activeNotDeprecated.find((t) => seedNames.includes(t.name));

    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className={bar}>
          <div className="relative">
            <Search className={searchIconCls} />
            <Input
              value={searchQuery}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tokens…"
              className={searchCls}
            />
          </div>
          <div className={seg}>
            <button
              type="button"
              className={cn(
                segBtn,
                listGroupMode === "component"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setListGroupMode("component")}
            >
              By component
            </button>
            <button
              type="button"
              className={cn(
                segBtn,
                listGroupMode === "category"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setListGroupMode("category")}
            >
              By category
            </button>
          </div>
          {bulkTokenIds.length > 0 && canEditTokens ? (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2">
              <span className="text-[10px] font-medium text-muted-foreground">{bulkTokenIds.length} selected</span>
              <Button type="button" size="sm" variant="secondary" className="h-7 text-[10px]" onClick={() => runBulkDeprecate()}>
                Deprecate
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 text-[10px]"
                onClick={() => runBulkSnapDuration(50)}
              >
                Snap 50ms
              </Button>
              <Button type="button" size="sm" variant="secondary" className="h-7 text-[10px]" onClick={() => runBulkBumpCategory()}>
                Bump category
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => clearBulkTokenSelection()}>
                Clear
              </Button>
            </div>
          ) : null}
        </div>
        <nav className={cn("min-h-0 flex-1 overflow-y-auto overflow-x-hidden", navPad)}>
          <div className={groupStack}>
            {!hasCustomToken && canEditTokens && starterToken && filtered.length > 0 ? (
              <div
                className={cn(
                  "rounded-lg border border-border bg-card",
                  compact ? "mx-0 px-2 py-2" : "mx-0.5 px-3 py-3",
                )}
              >
                <p className={cn("text-muted-foreground", compact ? "mb-1.5 text-[9px]" : "mb-2 text-[10px]")}>
                  Only seed tokens so far — branch one to customize.
                </p>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="w-full"
                  onClick={() => void duplicateTokenAction(starterToken.id)}
                >
                  Duplicate starter token
                </Button>
              </div>
            ) : null}
            {grouped.length === 0 ? (
              <div
                className={cn(
                  "flex flex-col items-center justify-center px-3 text-center",
                  compact ? "py-8" : "py-12",
                )}
              >
                <p className={cn("font-medium text-foreground", compact ? "text-xs" : "text-sm")}>
                  {activeNotDeprecated.length === 0
                    ? "No tokens yet"
                    : searchQuery.trim()
                      ? "No matches for this search"
                      : "Nothing to show"}
                </p>
                <div className="mt-4 w-full max-w-[220px]">
                  {activeNotDeprecated.length === 0 && canEditTokens ? (
                    <Button type="button" className="w-full" size="sm" onClick={() => void createTokenAction()}>
                      New token
                    </Button>
                  ) : filtered.length === 0 && searchQuery.trim() !== "" ? (
                    <Button type="button" className="w-full" size="sm" onClick={() => setSearch("")}>
                      Clear search
                    </Button>
                  ) : activeNotDeprecated.length > 0 && activeSection !== "physics-lab" ? (
                    <Button type="button" className="w-full" size="sm" onClick={() => onSectionChange("physics-lab")}>
                      Open motion studio
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              grouped.map((group) => (
              <div key={`${group.kind}-${group.id}`}>
                <p
                  className={cn(
                    "px-0.5 font-semibold uppercase tracking-wider text-muted-foreground",
                    compact ? "mb-1.5 text-[9px]" : "mb-2 text-[10px]",
                  )}
                >
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
                      onMouseLeave={() => setHoveredId((current) => (current === token.id ? null : current))}
                    >
                      <div
                        className={cn(
                          "flex items-center",
                          row,
                          selected ? "bg-accent shadow-sm" : "hover:bg-muted/80",
                        )}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-1.5">
                          {canEditTokens ? (
                            <input
                              type="checkbox"
                              checked={bulkTokenIds.includes(token.id)}
                              onChange={() => toggleBulkTokenId(token.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-3.5 w-3.5 shrink-0 rounded border border-border accent-primary"
                              aria-label="Select for bulk edit"
                            />
                          ) : null}
                          <div
                            className={dot}
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
                              className={cn(
                                "flex-1 rounded-md border border-border bg-background px-2 py-1 font-mono text-xs",
                                compact ? "h-7" : "h-8 py-1.5",
                              )}
                            />
                          ) : (
                            <button
                              type="button"
                              className={cn("flex min-w-0 flex-1 flex-col text-left", compact ? "gap-0.5" : "gap-1")}
                              onClick={() => selectToken(token.id)}
                            >
                              <div className="flex min-w-0 items-center gap-1">
                                <span
                                  className={cn(
                                    "min-w-0 flex-1 truncate font-semibold leading-snug",
                                    titleCls,
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
                                      className={cn(
                                        "shrink-0 border-0 bg-accent font-semibold uppercase tracking-wide text-accent-foreground",
                                        compact
                                          ? "h-3.5 px-1 py-0 text-[8px]"
                                          : "h-4 px-1.5 py-0 text-[9px]",
                                      )}
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
                                  "truncate font-mono leading-snug text-muted-foreground",
                                  monoCls,
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
                                    menuBtn,
                                    showMenu ? "opacity-100" : "opacity-0",
                                  )}
                                >
                                  <MoreHorizontal className={menuIcon} />
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
                        <div
                          className={cn(
                            "border border-border bg-card text-xs shadow-sm",
                            compact ? "mt-1.5 rounded-md p-2" : "mt-2 rounded-lg p-3",
                          )}
                        >
                          <p className="text-foreground">Delete {token.name || "untitled"}? This cannot be undone.</p>
                          <div className={cn("flex justify-end", compact ? "mt-2 gap-1.5" : "mt-3 gap-2")}>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setDeleteConfirmId(null)}
                              className={cn(
                                "h-auto px-2 py-1",
                                compact ? "text-[10px]" : "text-[11px]",
                              )}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => confirmDelete(token.id)}
                              className={cn(
                                "h-auto px-2 py-1 text-red-600 hover:bg-red-50 hover:text-red-700",
                                compact ? "text-[10px]" : "text-[11px]",
                              )}
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
            )))}
          </div>
        </nav>
      </div>
    );
  }

  const tokenListBody = buildTokenListBody(false);

  const libraryBody = (
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
  );

  const footerCompact = (
    <footer className="shrink-0 space-y-1.5 border-t border-border/80 bg-muted/10 px-2 py-2">
      {canEditTokens ? (
        <Button
          type="button"
          onClick={() => {
            void deployChanges();
          }}
          disabled={!workspaceId || deploying || unsyncedCount === 0}
          className="h-7 w-full justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {deploying ? "Deploying..." : "Deploy"}
        </Button>
      ) : null}
      {canEditTokens ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void createTokenAction();
          }}
          className="h-7 w-full justify-center rounded-md text-[11px] font-medium"
        >
          New token
        </Button>
      ) : null}
      <p className="px-0.5 text-center text-[9px] leading-relaxed text-muted-foreground">
        {activeTokenCount} active
        {unsyncedCount > 0 ? ` · ${unsyncedCount} unsynced` : " · synced"}
      </p>
    </footer>
  );

  const footerClassic = (
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
  );

  if (activeSection === "physics-lab") {
    return (
      <div className="flex h-full min-h-0 shrink-0 border-r border-border bg-background">
        <nav
          className="flex w-10 shrink-0 flex-col items-center gap-0.5 border-r border-border/80 bg-muted/25 py-2"
          aria-label="Studio sections"
        >
          <Avatar className="size-8 rounded-md border border-border/60 shadow-sm">
            <AvatarFallback className="rounded-md text-[10px] font-bold">M</AvatarFallback>
          </Avatar>
          <div className="my-1.5 h-px w-6 bg-border/80" />
          {panelCollapsed ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Expand token panel"
              aria-expanded={!panelCollapsed}
              onClick={() => setPanelCollapsed(false)}
              className="size-8 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : null}
          {SIDEBAR_ROUTES.map((item) => {
            const active = item.key === activeSection;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                title={item.label}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                onClick={() => onSectionChange(item.key)}
                className={cn(
                  "flex size-8 items-center justify-center rounded-md transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
              </button>
            );
          })}
          <div className="flex-1" />
          <a
            href="/contact"
            title="Support"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LifeBuoy className="h-3.5 w-3.5" />
          </a>
          <a
            href="/releases"
            title="Docs & releases"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <FileText className="h-3.5 w-3.5" />
          </a>
        </nav>

        {panelCollapsed ? null : (
          <aside className="flex h-full min-h-0 w-[15rem] min-w-[14rem] max-w-[16rem] shrink-0 flex-col border-border bg-muted/20 sm:w-60 sm:min-w-0 sm:max-w-none">
            <header className="flex shrink-0 flex-row items-start justify-between gap-2 border-b border-border/80 px-2.5 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold leading-tight text-foreground">
                  {workspaceName?.trim() || "Workspace"}
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-primary">{activeRoute?.label}</p>
                <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-muted-foreground">
                  {SECTION_HINT[activeSection]}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Shrink token panel"
                aria-expanded={!panelCollapsed}
                onClick={() => setPanelCollapsed(true)}
                className="h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </header>
            {buildTokenListBody(true)}
            {footerCompact}
          </aside>
        )}
      </div>
    );
  }

  if (panelCollapsed) {
    return (
      <aside className="flex h-full min-h-0 w-10 min-w-10 shrink-0 flex-col border-r border-border bg-background">
        <nav
          className="flex min-h-0 flex-1 flex-col items-center gap-0.5 bg-muted/25 py-2"
          aria-label="Studio sections"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Expand sidebar"
            aria-expanded={!panelCollapsed}
            onClick={() => setPanelCollapsed(false)}
            className="size-8 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Avatar className="size-8 rounded-md border border-border/60 shadow-sm">
            <AvatarFallback className="rounded-md text-[10px] font-bold">M</AvatarFallback>
          </Avatar>
          <div className="my-1.5 h-px w-6 bg-border/80" />
          {SIDEBAR_ROUTES.map((item) => {
            const active = item.key === activeSection;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                title={item.label}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                onClick={() => onSectionChange(item.key)}
                className={cn(
                  "flex size-8 items-center justify-center rounded-md transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
              </button>
            );
          })}
          <div className="flex-1" />
          {canEditTokens ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Deploy"
              onClick={() => {
                void deployChanges();
              }}
              disabled={!workspaceId || deploying || unsyncedCount === 0}
              className="size-8 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          {canEditTokens ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="New token"
              onClick={() => {
                void createTokenAction();
              }}
              className="size-8 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          <a
            href="/contact"
            title="Support"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LifeBuoy className="h-3.5 w-3.5" />
          </a>
          <a
            href="/releases"
            title="Docs & releases"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <FileText className="h-3.5 w-3.5" />
          </a>
        </nav>
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 w-[288px] min-w-[272px] shrink-0 flex-col border-r border-border bg-muted/30">
      <div className="shrink-0 space-y-4 border-b border-border px-4 pb-5 pt-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Workspace</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Shrink sidebar"
            aria-expanded={!panelCollapsed}
            onClick={() => setPanelCollapsed(true)}
            className="h-8 w-8 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
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

      {activeSection === "library" ? libraryBody : tokenListBody}

      {footerClassic}
    </aside>
  );
}
