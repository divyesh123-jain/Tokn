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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { categoryConfig, type MotionTokenItem } from "@/lib/tokn-constants";
import { useTokenStore } from "@/lib/token-store";
import {
  createTokenAction,
  deleteTokenAction,
  duplicateTokenAction,
  importShadcnComponentsAction,
  softDeleteTokenAction,
} from "@/lib/token-actions";
import { flushWorkspaceTokenPatches } from "@/lib/workspace-token-sync";
import { cn } from "@/lib/utils";

import {
  EASING_PRESETS,
  FRONTEND_ANIMATION_PRESETS,
  normalizeEasing,
  toFramerEasing,
} from "./shared";
import { SwitchPill } from "./ui-controls";

import type { StudioSection } from "./shared";

function getTokenDescriptor(tokenName: string) {
  const parts = tokenName.toLowerCase().split(".");
  return parts[1] ?? "";
}

function getPreviewKind(item: MotionTokenItem) {
  const descriptor = getTokenDescriptor(item.name);

  if (["button", "toggle", "switch", "checkbox", "radio", "tabs"].some((word) => descriptor.includes(word))) {
    return "button" as const;
  }
  if (["card", "accordion"].some((word) => descriptor.includes(word))) {
    return "card" as const;
  }
  if (["modal", "dialog", "sheet", "drawer", "popover", "dropdown-menu"].some((word) => descriptor.includes(word))) {
    return "modal" as const;
  }
  if (item.category === "feedback") return "line" as const;
  if (item.category === "spring") return "dot" as const;
  if (item.category === "exit") return "exit" as const;
  return "enter" as const;
}

export function SectionPanel({
  section,
  onSectionChange,
}: {
  section: StudioSection;
  onSectionChange: (section: StudioSection) => void;
}) {
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
  const [shadcnInput, setShadcnInput] = useState("");
  const [importingShadcn, setImportingShadcn] = useState(false);
  const [shadcnModalOpen, setShadcnModalOpen] = useState(false);

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

  async function importShadcnComponents() {
    if (!canEditTokens || importingShadcn) return;
    setImportingShadcn(true);
    try {
      const result = await importShadcnComponentsAction(shadcnInput);
      if (result.imported > 0) {
        toast.success(
          `Imported ${result.imported} token${result.imported === 1 ? "" : "s"} from shadcn components`,
        );
        setSearch("");
        onSectionChange("physics-lab");
        if (result.skipped > 0) {
          toast.message(`${result.skipped} component${result.skipped === 1 ? "" : "s"} could not be imported`);
        }
        setShadcnInput("");
        return;
      }
      if (result.skipped > 0) {
        toast.error("Could not import shadcn components");
      }
    } finally {
      setImportingShadcn(false);
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
      <main className="flex min-w-0 flex-1 flex-col bg-muted/30">
        <div className="border-b border-border px-6 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Manifest</p>
          <h1 className="mt-1 text-[30px] font-semibold tracking-tight text-foreground">Workspace Manifest</h1>
        </div>
        <div className="min-h-0 flex-1 p-6">
          <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-primary">Exportable Token Manifest</p>
              <Button type="button" variant="ghost" onClick={copyManifest} className="h-8 border border-border px-3 text-xs">
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copy
              </Button>
            </div>
            <pre className="min-h-0 flex-1 overflow-auto rounded-lg bg-foreground p-4 text-[12px] leading-6 text-background">
              <code>{manifestJson}</code>
            </pre>
          </div>
        </div>
      </main>
    );
  }

  if (section === "library") {
    return (
      <>
        <main className="flex min-w-0 flex-1 flex-col bg-muted/30">
          <div className="border-b border-border px-6 py-4">
          <div className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-3 text-foreground">
            <div className="flex items-center gap-4">
              <p className="text-sm font-semibold">{librarySelection.length} tokens selected</p>
              <span className="hidden text-[10px] uppercase tracking-[0.12em] text-foreground/60 md:inline">active scope</span>
              <Badge className="h-5 rounded-md border-0 bg-accent px-2 py-0 font-mono text-[10px] text-accent-foreground">global.css</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setLibrarySelection([])}
                className="h-8 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground hover:bg-muted hover:text-foreground"
              >
                Clear
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-8 rounded-md border border-border bg-background px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground hover:bg-muted"
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
                className="h-8 rounded-md border border-border bg-background px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground hover:bg-muted"
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
              <h1 className="text-[42px] font-semibold italic leading-none tracking-tight text-foreground">Standard Library</h1>
              <p className="mt-2 text-[13px] text-muted-foreground">System-defined motion primitives for the Core UI framework.</p>
              <p className="text-[13px] text-muted-foreground">Precise, calibrated, and production-ready.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-md border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted"
                onClick={() => {
                  setShadcnModalOpen(true);
                }}
                disabled={!canEditTokens}
              >
                Import shadcn
              </Button>
              <div className="relative transition-all duration-200">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground transition-colors duration-200" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search tokens..."
                  className="h-9 w-55 rounded-md border-border bg-card py-1 pl-8 pr-2 text-xs shadow-none transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-md border border-border bg-card text-muted-foreground">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-md border border-border bg-card text-muted-foreground">
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
              const previewKind = getPreviewKind(item);

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
                    "relative flex cursor-pointer flex-col gap-8 rounded-lg border bg-card p-8 text-left transition-all duration-200",
                    selected
                      ? "border-primary shadow-[0_8px_32px_-8px_rgba(76,61,201,0.15)]"
                      : "border-border hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08)]",
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
                              className="h-7 w-7 rounded-md border border-border bg-background text-muted-foreground hover:bg-muted"
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
                    {selected ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded border-2 border-primary bg-primary transition-all duration-200">
                        <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                      </div>
                    ) : null}
                  </div>

                  <div className="flex h-40 items-center justify-center overflow-hidden rounded-lg bg-muted/40">
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
                      className="flex h-full w-full items-center justify-center p-5 transition-all duration-200"
                    >
                      {previewKind === "button" ? (
                        <div className="w-28 rounded-md border border-[#534ab7]/30 bg-white px-3 py-2 text-center text-[11px] font-semibold text-[#3f388e] shadow-sm">
                          Continue
                        </div>
                      ) : null}
                      {previewKind === "card" ? (
                        <div className="w-30 rounded-lg border border-border bg-white p-3 shadow-sm">
                          <div className="h-2 w-14 rounded bg-[#534ab7]/15" />
                          <div className="mt-2 h-1.5 w-20 rounded bg-muted" />
                          <div className="mt-1.5 h-1.5 w-16 rounded bg-muted" />
                        </div>
                      ) : null}
                      {previewKind === "modal" ? (
                        <div className="relative h-22 w-full max-w-32 rounded-md bg-black/5 p-2">
                          <div className="absolute inset-0 rounded-md bg-black/10" />
                          <div className="relative mx-auto mt-3 w-24 rounded-md border border-border bg-white p-2 shadow-sm">
                            <div className="h-1.5 w-12 rounded bg-[#534ab7]/15" />
                            <div className="mt-1.5 h-1.5 w-18 rounded bg-muted" />
                          </div>
                        </div>
                      ) : null}
                      {previewKind === "dot" ? (
                        <div className="h-12 w-12 rounded-md bg-[#534ab7]" />
                      ) : null}
                      {previewKind === "line" ? (
                        <div className="h-1 w-16 rounded-full bg-[#534ab7]" />
                      ) : null}
                      {previewKind === "exit" ? (
                        <div className="h-1 w-20 rounded-full bg-[#6f6d7f]" />
                      ) : null}
                      {previewKind === "enter" ? (
                        <div className="h-9 w-9 rounded-md border-2 border-[#534ab7] bg-transparent" />
                      ) : null}
                    </motion.div>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm font-bold text-foreground">{item.name}</p>
                    </div>
                    <Badge
                      className="h-5 shrink-0 border-0 px-2 py-0 text-[9px] font-bold uppercase tracking-[0.9px]"
                      style={{ backgroundColor: config.bg, color: config.color }}
                    >
                      {item.category}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-muted-foreground" />
                      <span>
                        {item.isSpring
                          ? `Stiff: ${item.springStiffness}`
                          : `${item.durationMs}ms`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-muted-foreground" />
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
              className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-foreground p-0 text-background shadow-lg hover:bg-foreground/90"
            >
              <Plus className="h-5 w-5" />
            </Button>
          ) : null}
          </div>
        </main>

        <Dialog open={shadcnModalOpen} onOpenChange={setShadcnModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Import shadcn components</DialogTitle>
            </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste shadcn add commands, component names, or import paths. You can also pick a preset below and it will fill the input for you.
            </p>

            <div className="flex flex-wrap gap-2">
              {FRONTEND_ANIMATION_PRESETS.map((preset) => (
                <Button
                  key={preset.key}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShadcnInput(preset.label)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <Textarea
              value={shadcnInput}
              onChange={(event) => setShadcnInput(event.target.value)}
              placeholder="npx shadcn@latest add button card dialog\n@/components/ui/dropdown-menu"
              className="min-h-28 font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              After importing, tune token values in this panel and use Publish in the top header to release a versioned animation system.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShadcnModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                void importShadcnComponents();
              }}
              disabled={!canEditTokens || importingShadcn || shadcnInput.trim().length === 0}
            >
              {importingShadcn ? "Importing..." : "Import components"}
            </Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>
      </>
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
                  {selected ? <Check className="h-3 w-3 text-primary-foreground" /> : null}
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
                  className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
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
                    className="h-7 w-23 border-border bg-background px-2 text-xs"
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
              <div className="rounded-xl border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
                Select tokens from the left panel to start editing.
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {inspectorSelectedTokens.map((item) => {
                  const easingNormalized = normalizeEasing(item.easing);
                  return (
                    <article key={item.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-sm font-semibold text-foreground">{item.name}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{item.category} • {item.pendingSync ? "pending sync" : "live"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => selectToken(item.id)}
                            className="h-7 rounded-md border border-border bg-background px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground"
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
                          <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"><span>Duration</span><span>{item.durationMs}ms</span></div>
                          <input
                            type="range"
                            min={0}
                            max={1200}
                            step={10}
                            value={item.durationMs}
                            onChange={(event) => canEditTokens && updateToken(item.id, { durationMs: Number(event.target.value) })}
                            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                          />
                        </div>

                        <div>
                          <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"><span>Delay</span><span>{item.delayMs}ms</span></div>
                          <input
                            type="range"
                            min={0}
                            max={500}
                            step={10}
                            value={item.delayMs}
                            onChange={(event) => canEditTokens && updateToken(item.id, { delayMs: Number(event.target.value) })}
                            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                          />
                        </div>

                        <div>
                          <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"><span>Y Offset</span><span>{item.yOffset}px</span></div>
                          <input
                            type="range"
                            min={-120}
                            max={120}
                            step={1}
                            value={item.yOffset}
                            onChange={(event) => canEditTokens && updateToken(item.id, { yOffset: Number(event.target.value) })}
                            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"><span>Scale</span><span>{item.scaleStart.toFixed(2)}</span></div>
                            <input
                              type="range"
                              min={0.5}
                              max={1.5}
                              step={0.01}
                              value={item.scaleStart}
                              onChange={(event) => canEditTokens && updateToken(item.id, { scaleStart: Number(event.target.value) })}
                              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                            />
                          </div>
                          <div>
                            <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"><span>Opacity</span><span>{item.opacityStart.toFixed(2)}</span></div>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={item.opacityStart}
                              onChange={(event) => canEditTokens && updateToken(item.id, { opacityStart: Number(event.target.value) })}
                              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
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
                              className="h-8 border-border bg-background px-2 text-xs"
                            />
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              value={item.springDamping}
                              onChange={(event) => canEditTokens && updateToken(item.id, { springDamping: Number(event.target.value) })}
                              className="h-8 border-border bg-background px-2 text-xs"
                            />
                            <Input
                              type="number"
                              min={0.1}
                              max={10}
                              step={0.1}
                              value={item.springMass}
                              onChange={(event) => canEditTokens && updateToken(item.id, { springMass: Number(event.target.value) })}
                              className="h-8 border-border bg-background px-2 text-xs"
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Easing</div>
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
                                      ? "border-primary bg-accent text-accent-foreground"
                                      : "border-border bg-background text-muted-foreground",
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
                              className="h-8 border-border bg-background px-2 font-mono text-[10px]"
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
