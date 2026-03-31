"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Copy,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
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
import { categoryConfig } from "@/lib/motif";
import { useTokenStore } from "@/lib/token-store";
import {
  createTokenAction,
  deleteTokenAction,
  duplicateTokenAction,
  softDeleteTokenAction,
} from "@/lib/token-actions";
import { flushWorkspaceTokenPatches } from "@/lib/workspace-token-sync";
import { cn } from "@/lib/utils";

import { EASING_PRESETS, normalizeEasing, toFramerEasing } from "./shared";
import { SwitchPill } from "./ui-controls";

import type { StudioSection } from "./shared";

export function SectionPanel({ section }: { section: StudioSection }) {
  const {
    tokens,
    workspaceRole,
    workspaceId,
    searchQuery,
    setSearch,
    selectToken,
    updateToken,
    hasPublishedUsage,
  } = useTokenStore();
  const canEditTokens = workspaceRole === "owner" || workspaceRole === "editor";
  const [libraryHoveredId, setLibraryHoveredId] = useState<string | null>(null);
  const [librarySelection, setLibrarySelection] = useState<string[]>([]);
  const [deployingLibrary, setDeployingLibrary] = useState(false);
  const [durationOffsetPercent, setDurationOffsetPercent] = useState(0);
  const [durationOverrideMs, setDurationOverrideMs] = useState(300);

  const libraryTokens = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tokens.filter((item) => {
      if (item.deprecated) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q);
    });
  }, [tokens, searchQuery]);

  useEffect(() => {
    setLibrarySelection((current) => current.filter((id) => libraryTokens.some((item) => item.id === id)));
  }, [libraryTokens]);

  function toggleLibrarySelection(tokenId: string) {
    setLibrarySelection((current) =>
      current.includes(tokenId) ? current.filter((id) => id !== tokenId) : [...current, tokenId],
    );
  }

  const inspectorSelectedTokens = useMemo(() => {
    const fromSelection = libraryTokens.filter((item) => librarySelection.includes(item.id));
    if (fromSelection.length > 0) return fromSelection;
    return libraryTokens.slice(0, 4);
  }, [libraryTokens, librarySelection]);

  function applyInspectorBatchChanges() {
    if (!canEditTokens || inspectorSelectedTokens.length === 0) return;

    const clampedOverride = Math.max(
      0,
      Math.min(1200, Number.isFinite(durationOverrideMs) ? durationOverrideMs : 300),
    );

    inspectorSelectedTokens.forEach((item) => {
      const relativeDuration = Math.round(item.durationMs * (1 + durationOffsetPercent / 100));
      const nextDuration = durationOffsetPercent === 0 ? clampedOverride : Math.max(0, relativeDuration);
      updateToken(item.id, { durationMs: nextDuration });
    });

    toast.success(
      `Updated ${inspectorSelectedTokens.length} token${inspectorSelectedTokens.length === 1 ? "" : "s"}`,
    );
  }

  async function deployFromLibrary() {
    if (!workspaceId || deployingLibrary) return;
    setDeployingLibrary(true);
    try {
      await flushWorkspaceTokenPatches(workspaceId, useTokenStore.getState);
      toast.success("Changes deployed");
    } finally {
      setDeployingLibrary(false);
    }
  }

  async function duplicateSelection() {
    if (!canEditTokens) return;
    if (librarySelection.length === 0) {
      toast.error("Select at least one token");
      return;
    }

    let duplicated = 0;
    for (const id of librarySelection) {
      const createdId = await duplicateTokenAction(id);
      if (createdId) duplicated += 1;
    }
    if (duplicated > 0) {
      toast.success(`Duplicated ${duplicated} token${duplicated > 1 ? "s" : ""}`);
    }
  }

  async function deleteSelection() {
    if (!canEditTokens) return;
    if (librarySelection.length === 0) {
      toast.error("Select at least one token");
      return;
    }
    const confirmed = window.confirm(
      `Delete ${librarySelection.length} selected token${librarySelection.length > 1 ? "s" : ""}?`,
    );
    if (!confirmed) return;

    for (const id of librarySelection) {
      if (hasPublishedUsage(id)) {
        await softDeleteTokenAction(id);
      } else {
        await deleteTokenAction(id);
      }
    }
    setLibrarySelection([]);
    toast.success("Selection updated");
  }

  const manifestJson = useMemo(() => {
    const payload = {
      generatedAt: new Date().toISOString(),
      total: tokens.filter((t) => !t.deprecated).length,
      tokens: tokens
        .filter((t) => !t.deprecated)
        .map((t) => ({
          id: t.id,
          name: t.name,
          category: t.category,
          transition: t.isSpring
            ? {
                type: "spring",
                stiffness: t.springStiffness,
                damping: t.springDamping,
                mass: t.springMass,
              }
            : {
                type: "timed",
                durationMs: t.durationMs,
                delayMs: t.delayMs,
                easing: t.easing,
              },
        })),
    };
    return JSON.stringify(payload, null, 2);
  }, [tokens]);

  async function copyManifest() {
    await navigator.clipboard.writeText(manifestJson);
    toast.success("Manifest copied");
  }

  if (section === "manifest") {
    return (
      <main className="flex min-w-0 flex-1 flex-col bg-[#f7f7f5]">
        <div className="border-b border-[#dfded8] px-6 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b8a83]">Manifest</p>
          <h1 className="mt-1 text-[30px] font-semibold tracking-tight text-[#151515]">Workspace Manifest</h1>
        </div>
        <div className="min-h-0 flex-1 p-6">
          <div className="flex h-full min-h-0 flex-col rounded-xl border border-[#ddddd7] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-[#2f257f]">Exportable Token Manifest</p>
              <Button type="button" variant="ghost" onClick={copyManifest} className="h-8 border border-[#dddcd7] px-3 text-xs">
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copy
              </Button>
            </div>
            <pre className="min-h-0 flex-1 overflow-auto rounded-lg bg-[#131718] p-4 text-[12px] leading-6 text-[#e6e8e8]">
              <code>{manifestJson}</code>
            </pre>
          </div>
        </div>
      </main>
    );
  }

  if (section === "library") {
    return (
      <main className="flex min-w-0 flex-1 flex-col bg-[#f7f7f5]">
        <div className="border-b border-[#dfded8] px-6 py-4">
          <div className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-[#121212] px-4 py-3 text-white">
            <div className="flex items-center gap-4">
              <p className="text-sm font-semibold">{librarySelection.length} tokens selected</p>
              <span className="hidden text-[10px] uppercase tracking-[0.12em] text-white/60 md:inline">active scope</span>
              <Badge className="h-5 rounded-md border-0 bg-white/10 px-2 py-0 font-mono text-[10px] text-white">global.css</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setLibrarySelection([])}
                className="h-8 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-white hover:bg-white/10 hover:text-white"
              >
                Clear
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-8 rounded-md border border-white/15 bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#171717] hover:bg-white/90"
                onClick={() => {
                  void duplicateSelection();
                }}
                disabled={!canEditTokens || librarySelection.length === 0}
              >
                Duplicate
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-8 rounded-md border border-white/15 bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#171717] hover:bg-white/90"
                onClick={() => {
                  void deleteSelection();
                }}
                disabled={!canEditTokens || librarySelection.length === 0}
              >
                Delete
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void deployFromLibrary();
                }}
                disabled={!workspaceId || deployingLibrary}
                className="h-8 rounded-md bg-primary px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-foreground hover:bg-primary/90"
              >
                {deployingLibrary ? "Deploying..." : "Deploy"}
              </Button>
            </div>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[42px] font-semibold italic leading-none tracking-tight text-[#151515]">Standard Library</h1>
              <p className="mt-2 text-[13px] text-[#636158]">System-defined motion primitives for the Core UI framework.</p>
              <p className="text-[13px] text-[#636158]">Precise, calibrated, and production-ready.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative transition-all duration-200">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8f8d84] transition-colors duration-200" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search tokens..."
                  className="h-9 w-55 rounded-md border-[#d6d4cd] bg-white py-1 pl-8 pr-2 text-xs shadow-none transition-all duration-200 focus:border-[#4c3dc9] focus:ring-1 focus:ring-[#4c3dc9]/20"
                />
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-md border border-[#dddcd7] bg-white text-[#6b685f]">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-md border border-[#dddcd7] bg-white text-[#6b685f]">
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 gap-4 transition-all duration-300 md:grid-cols-2 xl:grid-cols-3">
            {libraryTokens.map((item) => {
              const config = categoryConfig[item.category];
              const selected = librarySelection.includes(item.id);
              const hovered = libraryHoveredId === item.id;
              const showCardActions = canEditTokens && (hovered || selected);

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    toggleLibrarySelection(item.id);
                    selectToken(item.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleLibrarySelection(item.id);
                      selectToken(item.id);
                    }
                  }}
                  onMouseEnter={() => setLibraryHoveredId(item.id)}
                  onMouseLeave={() => setLibraryHoveredId((current) => (current === item.id ? null : current))}
                  className={cn(
                    "relative flex cursor-pointer flex-col gap-8 rounded-lg border bg-white p-8 text-left transition-all duration-200",
                    selected
                      ? "border-[#4c3dc9] shadow-[0_8px_32px_-8px_rgba(76,61,201,0.15)]"
                      : "border-[rgba(200,196,213,0.15)] hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08)]",
                  )}
                >
                  <div className="absolute right-4 top-4 flex items-center gap-1.5">
                    {showCardActions ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(event) => event.stopPropagation()}
                              className="h-7 w-7 rounded-md border border-[#d7d5ce] bg-white text-[#666359] hover:bg-[#f3f2ed]"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" sideOffset={6} className="w-40">
                          <DropdownMenuItem
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void duplicateTokenAction(item.id);
                            }}
                            className="text-xs"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              if (hasPublishedUsage(item.id)) {
                                void softDeleteTokenAction(item.id);
                                return;
                              }
                              void deleteTokenAction(item.id);
                            }}
                            variant="destructive"
                            className="text-xs"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {hasPublishedUsage(item.id) ? "Deprecate" : "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded border-2 transition-all duration-200",
                        selected
                          ? "border-[#4c3dc9] bg-[#4c3dc9]"
                          : "border-[#c8c4d5] bg-white hover:border-[#4c3dc9]",
                      )}
                    >
                      {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </div>
                  </div>

                  <div className="flex h-40 items-center justify-center overflow-hidden rounded-lg bg-[#f4f4f2]">
                    <motion.div
                      key={`${item.id}-${hovered ? "run" : "rest"}`}
                      initial={{ opacity: item.opacityStart, y: item.yOffset, scale: item.scaleStart }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        ...(item.isSpring
                          ? {
                              type: "spring",
                              stiffness: item.springStiffness,
                              damping: item.springDamping,
                              mass: item.springMass,
                            }
                          : {
                              duration: item.durationMs / 1000,
                              delay: item.delayMs / 1000,
                              ease: toFramerEasing(item.easing),
                            }),
                        duration: hovered ? undefined : 0,
                      }}
                      className={cn(
                        "bg-[#534ab7] transition-all duration-200",
                        item.category === "spring"
                          ? "h-12 w-12 rounded-md"
                          : item.category === "feedback"
                            ? "h-1 w-16 rounded-full"
                            : item.category === "exit"
                              ? "h-1 w-20 rounded-full bg-[#6f6d7f]"
                              : "h-9 w-9 rounded-md border-2 border-[#534ab7] bg-transparent",
                      )}
                    />
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm font-bold text-[#1a1c1b]">{item.name}</p>
                    </div>
                    <Badge
                      className="h-5 shrink-0 border-0 px-2 py-0 text-[9px] font-bold uppercase tracking-[0.9px]"
                      style={{ backgroundColor: config.bg, color: config.color }}
                    >
                      {item.category}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-[11px] text-[#787584]">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-[#787584]" />
                      <span>
                        {item.isSpring
                          ? `Stiff: ${item.springStiffness}`
                          : `${item.durationMs}ms`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-[#787584]" />
                      <span>{item.isSpring ? "Spring" : item.easing}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {canEditTokens ? (
            <Button
              type="button"
              onClick={() => {
                void createTokenAction();
              }}
              className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-[#171717] p-0 text-white shadow-lg hover:bg-[#2a2a2a]"
            >
              <Plus className="h-5 w-5" />
            </Button>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-muted/30">
      <aside className="w-72.5 shrink-0 border-r border-border bg-card px-4 py-5">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Selection</p>
            <p className="mt-1 text-xs text-muted-foreground">{libraryTokens.length} tokens available</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setLibrarySelection([])}
            className="h-7 rounded-md border border-border bg-background px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground hover:bg-muted"
          >
            Clear
          </Button>
        </div>

        <div className="space-y-2 pb-2">
          {libraryTokens.map((item) => {
            const selected = librarySelection.includes(item.id);
            const config = categoryConfig[item.category];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  toggleLibrarySelection(item.id);
                  selectToken(item.id);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition",
                  selected
                    ? "border-primary bg-accent"
                    : "border-border bg-background hover:border-primary/40",
                )}
              >
                <div className={cn("flex h-4 w-4 items-center justify-center rounded border", selected ? "border-primary bg-primary" : "border-border bg-background")}>
                  {selected ? <Check className="h-3 w-3 text-white" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[11px] font-semibold text-foreground">{item.name}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{item.durationMs}ms • {item.isSpring ? "spring" : item.easing}</p>
                </div>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
              </button>
            );
          })}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-border bg-card px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Global Inspector</p>
              <h1 className="mt-1 text-[38px] font-semibold italic leading-none tracking-tight text-foreground">Token Batch Console</h1>
              <p className="mt-2 text-[13px] text-muted-foreground">Batch editing {inspectorSelectedTokens.length} active tokens in this workspace.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-background p-3">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Role</p>
                <p className="mt-1 text-xs font-semibold text-foreground">{workspaceRole ?? "unknown"}</p>
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Pending Sync</p>
                <p className="mt-1 text-xs font-semibold text-foreground">{tokens.filter((item) => item.pendingSync && !item.deprecated).length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-6">
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Relative Duration Offset</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="rounded bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground">
                    {durationOffsetPercent > 0 ? `+${durationOffsetPercent}` : durationOffsetPercent}%
                  </span>
                  <span className="text-[11px] text-muted-foreground">-50% to +100%</span>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={100}
                  step={5}
                  value={durationOffsetPercent}
                  onChange={(event) => setDurationOffsetPercent(Number(event.target.value))}
                  className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#dbe2d8] accent-[#236a56]"
                />
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Absolute Overrides</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {[150, 300, 450].map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setDurationOverrideMs(preset);
                        setDurationOffsetPercent(0);
                      }}
                      className={cn(
                        "h-7 rounded-md border px-2.5 text-xs",
                        durationOverrideMs === preset && durationOffsetPercent === 0
                          ? "border-primary bg-accent text-accent-foreground"
                          : "border-border bg-muted/40 text-muted-foreground",
                      )}
                    >
                      {preset}ms
                    </Button>
                  ))}
                  <Input
                    type="number"
                    min={0}
                    max={1200}
                    value={durationOverrideMs}
                    onChange={(event) => {
                      const parsed = Number(event.target.value);
                      setDurationOverrideMs(Number.isFinite(parsed) ? parsed : 300);
                      setDurationOffsetPercent(0);
                    }}
                    className="h-7 w-23 border-[#d3d8cb] bg-[#f8f9f5] px-2 text-xs"
                  />
                  <Button
                    type="button"
                    onClick={applyInspectorBatchChanges}
                    disabled={!canEditTokens || inspectorSelectedTokens.length === 0}
                    className="ml-auto h-9 rounded-md bg-primary px-4 text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground hover:bg-primary/90"
                  >
                    Apply Batch Changes
                  </Button>
                </div>
              </div>
            </div>

            {inspectorSelectedTokens.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#ccd2c5] bg-[#f8f9f5] p-8 text-center text-sm text-[#637061]">
                Select tokens from the left panel to start editing.
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {inspectorSelectedTokens.map((item) => {
                  const easingNormalized = normalizeEasing(item.easing);
                  return (
                    <article key={item.id} className="rounded-xl border border-[#d7d9cf] bg-white p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-sm font-semibold text-[#1e241f]">{item.name}</p>
                          <p className="mt-0.5 text-[11px] text-[#687266]">{item.category} • {item.pendingSync ? "pending sync" : "live"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => selectToken(item.id)}
                            className="h-7 rounded-md border border-[#d3d8cb] bg-[#f8f9f5] px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#495248]"
                          >
                            Focus
                          </Button>
                          <SwitchPill
                            enabled={item.isSpring}
                            onToggle={() => canEditTokens && updateToken(item.id, { isSpring: !item.isSpring })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-[#717a6f]"><span>Duration</span><span>{item.durationMs}ms</span></div>
                          <input
                            type="range"
                            min={0}
                            max={1200}
                            step={10}
                            value={item.durationMs}
                            onChange={(event) => canEditTokens && updateToken(item.id, { durationMs: Number(event.target.value) })}
                            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#dbe2d8] accent-[#236a56]"
                          />
                        </div>

                        <div>
                          <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-[#717a6f]"><span>Delay</span><span>{item.delayMs}ms</span></div>
                          <input
                            type="range"
                            min={0}
                            max={500}
                            step={10}
                            value={item.delayMs}
                            onChange={(event) => canEditTokens && updateToken(item.id, { delayMs: Number(event.target.value) })}
                            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#dbe2d8] accent-[#236a56]"
                          />
                        </div>

                        <div>
                          <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-[#717a6f]"><span>Y Offset</span><span>{item.yOffset}px</span></div>
                          <input
                            type="range"
                            min={-120}
                            max={120}
                            step={1}
                            value={item.yOffset}
                            onChange={(event) => canEditTokens && updateToken(item.id, { yOffset: Number(event.target.value) })}
                            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#dbe2d8] accent-[#236a56]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-[#717a6f]"><span>Scale</span><span>{item.scaleStart.toFixed(2)}</span></div>
                            <input
                              type="range"
                              min={0.5}
                              max={1.5}
                              step={0.01}
                              value={item.scaleStart}
                              onChange={(event) => canEditTokens && updateToken(item.id, { scaleStart: Number(event.target.value) })}
                              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#dbe2d8] accent-[#236a56]"
                            />
                          </div>
                          <div>
                            <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-[#717a6f]"><span>Opacity</span><span>{item.opacityStart.toFixed(2)}</span></div>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={item.opacityStart}
                              onChange={(event) => canEditTokens && updateToken(item.id, { opacityStart: Number(event.target.value) })}
                              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#dbe2d8] accent-[#236a56]"
                            />
                          </div>
                        </div>

                        {item.isSpring ? (
                          <div className="grid grid-cols-3 gap-2">
                            <Input
                              type="number"
                              min={1}
                              max={500}
                              value={item.springStiffness}
                              onChange={(event) => canEditTokens && updateToken(item.id, { springStiffness: Number(event.target.value) })}
                              className="h-8 border-[#d3d8cb] bg-[#f8f9f5] px-2 text-xs"
                            />
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              value={item.springDamping}
                              onChange={(event) => canEditTokens && updateToken(item.id, { springDamping: Number(event.target.value) })}
                              className="h-8 border-[#d3d8cb] bg-[#f8f9f5] px-2 text-xs"
                            />
                            <Input
                              type="number"
                              min={0.1}
                              max={10}
                              step={0.1}
                              value={item.springMass}
                              onChange={(event) => canEditTokens && updateToken(item.id, { springMass: Number(event.target.value) })}
                              className="h-8 border-[#d3d8cb] bg-[#f8f9f5] px-2 text-xs"
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#717a6f]">Easing</div>
                            <div className="mb-2 grid grid-cols-2 gap-1.5">
                              {EASING_PRESETS.map((preset) => (
                                <Button
                                  key={`${item.id}-${preset}`}
                                  type="button"
                                  variant="ghost"
                                  onClick={() => canEditTokens && updateToken(item.id, { isSpring: false, easing: preset })}
                                  className={cn(
                                    "h-7 rounded-md border px-2 text-[10px] font-semibold uppercase tracking-[0.08em]",
                                    easingNormalized === normalizeEasing(preset)
                                      ? "border-[#236a56] bg-[#dff0e8] text-[#24533f]"
                                      : "border-[#d3d8cb] bg-[#f8f9f5] text-[#4d564c]",
                                  )}
                                >
                                  {preset}
                                </Button>
                              ))}
                            </div>
                            <Input
                              value={item.easing.startsWith("cubic-bezier") ? item.easing : ""}
                              onChange={(event) => canEditTokens && updateToken(item.id, { isSpring: false, easing: event.target.value })}
                              placeholder="cubic-bezier(0.42, 0, 0.58, 1)"
                              className="h-8 border-[#d3d8cb] bg-[#f8f9f5] px-2 font-mono text-[10px]"
                            />
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
