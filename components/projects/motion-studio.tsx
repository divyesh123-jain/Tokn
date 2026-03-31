"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Boxes,
  Check,
  Copy,
  FileText,
  FlaskConical,
  Gauge,
  LayoutGrid,
  LifeBuoy,
  MoreHorizontal,
  Pencil,
  Play,
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
  DialogDescription,
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
import { recentUpdateLabel } from "@/lib/token-recent";
import { cn } from "@/lib/utils";
import {
  type MotionTokenCategory,
  type MotionTokenItem,
  categoryConfig,
  categoryOrder,
} from "@/lib/motif";
import {
  useSelectedToken,
  useTokenStore,
} from "@/lib/token-store";
import {
  createTokenAction,
  deleteTokenAction,
  duplicateTokenAction,
  saveTokenNameAction,
  softDeleteTokenAction,
} from "@/lib/token-actions";
import { getTokenNameValidationError } from "@/lib/token-name";
import { transformToken } from "@/lib/codegen";
import { flushWorkspaceTokenPatches } from "@/lib/workspace-token-sync";

type StudioSection = "library" | "physics-lab" | "inspector" | "manifest";

const EASING_MAP: Record<string, [number, number, number, number]> = {
  "ease-out": [0, 0, 0.58, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
  linear: [0, 0, 1, 1],
  easein: [0.42, 0, 1, 1],
  easeout: [0, 0, 0.58, 1],
  easeinout: [0.42, 0, 0.58, 1],
};

const EASING_PRESETS = ["ease-out", "ease-in-out", "linear", "ease-in"];

const FRONTEND_ANIMATION_PRESETS: Array<{
  key: string;
  label: string;
  description: string;
  patch: Partial<MotionTokenItem>;
}> = [
  {
    key: "modal-pop",
    label: "Modal Pop",
    description: "Dialog and popup entrances",
    patch: {
      isSpring: true,
      springStiffness: 230,
      springDamping: 20,
      springMass: 0.9,
      yOffset: 12,
      scaleStart: 0.96,
      opacityStart: 0,
    },
  },
  {
    key: "toast-rise",
    label: "Toast Rise",
    description: "Notifications and alerts",
    patch: {
      isSpring: false,
      durationMs: 220,
      delayMs: 0,
      easing: "ease-out",
      yOffset: 14,
      scaleStart: 0.98,
      opacityStart: 0,
    },
  },
  {
    key: "sheet-slide",
    label: "Sheet Slide",
    description: "Drawers and side sheets",
    patch: {
      isSpring: false,
      durationMs: 260,
      delayMs: 0,
      easing: "ease-in-out",
      yOffset: 0,
      scaleStart: 1,
      opacityStart: 0,
    },
  },
  {
    key: "list-stagger",
    label: "List Stagger",
    description: "Cards, feed and table rows",
    patch: {
      isSpring: false,
      durationMs: 180,
      delayMs: 40,
      easing: "ease-out",
      yOffset: 10,
      scaleStart: 1,
      opacityStart: 0,
    },
  },
  {
    key: "page-transition",
    label: "Page Transition",
    description: "Route and tab switching",
    patch: {
      isSpring: false,
      durationMs: 300,
      delayMs: 0,
      easing: "ease-in-out",
      yOffset: 14,
      scaleStart: 1,
      opacityStart: 0,
    },
  },
  {
    key: "button-press",
    label: "Button Press",
    description: "Button/CTA micro interactions",
    patch: {
      isSpring: true,
      springStiffness: 320,
      springDamping: 24,
      springMass: 0.6,
      yOffset: 0,
      scaleStart: 0.94,
      opacityStart: 1,
    },
  },
];

function buildAnimationPatchFromPrompt(prompt: string): Partial<MotionTokenItem> {
  const text = prompt.toLowerCase();
  const durationMsMatch = text.match(/(\d+)\s*ms/);
  const durationSMatch = text.match(/(\d+(?:\.\d+)?)\s*s\b/);
  const delayMatch = text.match(/delay\s*(?:of|:|=)?\s*(\d+)\s*ms/);
  const yMatch = text.match(/(?:y|offset|move\s*up|move\s*down)\s*(?:to|:|=)?\s*(-?\d+)/);
  const opacityMatch = text.match(/opacity\s*(?:to|:|=)?\s*(0(?:\.\d+)?|1(?:\.0+)?)/);
  const scaleMatch = text.match(/scale\s*(?:to|:|=)?\s*(0(?:\.\d+)?|1(?:\.\d+)?|2(?:\.0+)?)/);

  const durationMs = durationMsMatch
    ? Number(durationMsMatch[1])
    : durationSMatch
      ? Math.round(Number(durationSMatch[1]) * 1000)
      : text.includes("fast")
        ? 160
        : text.includes("slow")
          ? 420
          : 260;

  const delayMs = delayMatch ? Number(delayMatch[1]) : text.includes("stagger") ? 40 : 0;
  const yOffset = yMatch ? Number(yMatch[1]) : text.includes("slide") ? 14 : 8;
  const opacityStart = opacityMatch ? Number(opacityMatch[1]) : 0;
  const scaleStart = scaleMatch ? Number(scaleMatch[1]) : text.includes("zoom") ? 0.96 : 1;

  const easing = text.includes("linear")
    ? "linear"
    : text.includes("ease in out") || text.includes("ease-in-out")
      ? "ease-in-out"
      : text.includes("ease in") || text.includes("ease-in")
        ? "ease-in"
        : text.includes("ease out") || text.includes("ease-out")
          ? "ease-out"
          : "ease-out";

  const wantsSpring =
    text.includes("spring") ||
    text.includes("bounce") ||
    text.includes("snappy") ||
    text.includes("physics");

  if (wantsSpring) {
    return {
      isSpring: true,
      springStiffness: text.includes("snappy") ? 320 : text.includes("soft") ? 140 : 220,
      springDamping: text.includes("bouncy") ? 14 : text.includes("soft") ? 24 : 20,
      springMass: text.includes("heavy") ? 1.3 : 0.9,
      yOffset,
      scaleStart,
      opacityStart,
      durationMs,
      delayMs,
      easing,
    };
  }

  return {
    isSpring: false,
    durationMs,
    delayMs,
    easing,
    yOffset,
    scaleStart,
    opacityStart,
  };
}

function normalizeEasing(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, "").replace(/_/g, "-");
}

const SIDEBAR_ROUTES = [
  { key: "library", label: "Library", icon: Boxes },
  { key: "physics-lab", label: "Motion Lab", icon: FlaskConical },
  { key: "inspector", label: "Global Inspector", icon: Gauge },
  { key: "manifest", label: "Manifest", icon: BookOpen },
] as const;

function toFramerEasing(raw: string): [number, number, number, number] {
  const normalized = normalizeEasing(raw);
  if (normalized.startsWith("cubic-bezier(")) {
    const nums = raw
      .replace(/cubic-bezier\(|\)/g, "")
      .split(",")
      .map(Number);
    if (nums.length === 4 && nums.every((n) => Number.isFinite(n))) {
      return nums as [number, number, number, number];
    }
    return EASING_MAP["ease-out"];
  }
  return EASING_MAP[normalized] ?? EASING_MAP["ease-out"];
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

function normalizeTokenNameInput(raw: string, fallbackCategory: MotionTokenCategory) {
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned) return "";

  const [left, ...rest] = cleaned.split(".");
  const hasDot = rest.length > 0;
  const categoryRaw = hasDot ? left : fallbackCategory;
  const descriptorRaw = hasDot ? rest.join(".") : left;

  const category = categoryRaw.replace(/[^a-z0-9]/g, "");
  const descriptor = descriptorRaw
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  const safeCategory = /^[a-z][a-z0-9]*$/.test(category) ? category : fallbackCategory;
  const safeDescriptor = descriptor || "default";

  return `${safeCategory}.${safeDescriptor}`;
}

export function MotionStudio({
  embedded,
  workspaceName,
}: {
  embedded?: boolean;
  workspaceName?: string;
} = {}) {
  const [activeSection, setActiveSection] = useState<StudioSection>("library");
  const [additiveMotion, setAdditiveMotion] = useState(true);
  const [relativeUnits, setRelativeUnits] = useState(false);

  return (
    <div
      className={cn(
        "h-full min-h-0 overflow-hidden bg-[#f4f4f2] text-[#171717]",
        !embedded && "min-h-screen",
      )}
    >
      <div className="flex h-full min-h-0 min-w-[1160px]">
        <TokenListPanel
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          workspaceName={workspaceName}
        />
        <div className="min-w-0 flex-1">
          <div className="flex h-full min-h-0">
            {activeSection === "physics-lab" ? (
              <>
                <PreviewPanel
                  additiveMotion={additiveMotion}
                  relativeUnits={relativeUnits}
                />
                <PropertiesPanel
                  additiveMotion={additiveMotion}
                  setAdditiveMotion={setAdditiveMotion}
                  relativeUnits={relativeUnits}
                  setRelativeUnits={setRelativeUnits}
                />
              </>
            ) : (
              <SectionPanel section={activeSection} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TokenListPanel({
  activeSection,
  onSectionChange,
  workspaceName,
}: {
  activeSection: StudioSection;
  onSectionChange: (section: StudioSection) => void;
  workspaceName?: string;
}) {
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
    <aside className="flex w-[248px] shrink-0 flex-col border-r border-[#dddcd7] bg-[#efefed]">
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
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.1em]",
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
                  <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8c8a81]">
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
        <div className="mt-3 border-t border-[#dddcd7] pt-3 text-[10px] uppercase tracking-[0.1em] text-[#86847b]">
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

function SectionPanel({ section }: { section: StudioSection }) {
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
                  className="h-9 w-[220px] rounded-md border-[#d6d4cd] bg-white py-1 pl-8 pr-2 text-xs shadow-none transition-all duration-200 focus:border-[#4c3dc9] focus:ring-1 focus:ring-[#4c3dc9]/20"
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 transition-all duration-300">
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
                  {/* Selection Checkbox */}
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

                  {/* Preview Area */}
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

                  {/* Header: Title & Badge */}
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

                  {/* Metadata: Duration/Stiffness & Easing */}
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
      <aside className="w-[290px] shrink-0 border-r border-border bg-card px-4 py-5">
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
                  className="h-7 w-[92px] border-[#d3d8cb] bg-[#f8f9f5] px-2 text-xs"
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
                        <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.1em] text-[#717a6f]"><span>Duration</span><span>{item.durationMs}ms</span></div>
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
                        <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.1em] text-[#717a6f]"><span>Delay</span><span>{item.delayMs}ms</span></div>
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
                        <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.1em] text-[#717a6f]"><span>Y Offset</span><span>{item.yOffset}px</span></div>
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
                          <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.1em] text-[#717a6f]"><span>Scale</span><span>{item.scaleStart.toFixed(2)}</span></div>
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
                          <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.1em] text-[#717a6f]"><span>Opacity</span><span>{item.opacityStart.toFixed(2)}</span></div>
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
                          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#717a6f]">Easing</div>
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

function PreviewPanel({
  additiveMotion,
  relativeUnits,
}: {
  additiveMotion: boolean;
  relativeUnits: boolean;
}) {
  const { replayKey, replay, workspaceRole, workspaceId } = useTokenStore();
  const token = useSelectedToken();
  const [saving, setSaving] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"json" | "tailwind" | "css" | "framerMotion">("json");
  const canEditTokens = workspaceRole === "owner" || workspaceRole === "editor";

  const exportCode = useMemo(() => {
    if (!token) return { framerMotion: "", css: "", tailwind: "", json: "" };
    const raw = transformToken(token);
    const slug = token.name.replace(/\./g, "-");
    const tailwindClassList = raw.tailwind
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const motionName = token.name.replace(/[^a-zA-Z0-9_$]/g, "_");
    const transitionBlock = token.isSpring
      ? [
          `type: \"spring\"`,
          `stiffness: ${token.springStiffness}`,
          `damping: ${token.springDamping}`,
          `mass: ${token.springMass}`,
        ].join(",\n    ")
      : [
          `duration: ${(token.durationMs / 1000).toFixed(3)}`,
          `delay: ${(token.delayMs / 1000).toFixed(3)}`,
          `ease: [${toFramerEasing(token.easing).join(", ")}]`,
        ].join(",\n    ");

    const improved = {
      framerMotion: [
        `const ${motionName} = {`,
        `  initial: { opacity: ${token.opacityStart}, y: ${token.yOffset}, scale: ${token.scaleStart} },`,
        `  animate: { opacity: 1, y: 0, scale: 1 },`,
        `  transition: {`,
        `    ${transitionBlock}`,
        `  },`,
        `};`,
        "",
        `// usage: <motion.div {...${motionName}} />`,
      ].join("\n"),
      css: [
        `:root {`,
        `  --motion-${slug}-duration: ${token.durationMs}ms;`,
        `  --motion-${slug}-delay: ${token.delayMs}ms;`,
        `  --motion-${slug}-ease: ${token.easing};`,
        `}`,
        "",
        raw.css,
        "",
        `/* Usage */`,
        `<div class=\"animate-${slug} is-active\">`,
        `  <!-- content -->`,
        `</div>`,
      ].join("\n"),
      tailwind: [
        `const classes = [`,
        ...tailwindClassList.map((cls) => `  "${cls}",`),
        `].join(" ");`,
        "",
        `<div className={classes} data-state=\"active\">`,
        `  {/* content */}`,
        `</div>`,
      ].join("\n"),
      json: JSON.stringify(
        {
          name: token.name,
          category: token.category,
          generatedAt: new Date().toISOString(),
          initial: {
            opacity: token.opacityStart,
            y: token.yOffset,
            scale: token.scaleStart,
          },
          animate: { opacity: 1, y: 0, scale: 1 },
          transition: token.isSpring
            ? {
                type: "spring",
                stiffness: token.springStiffness,
                damping: token.springDamping,
                mass: token.springMass,
              }
            : {
                type: "timed",
                durationMs: token.durationMs,
                delayMs: token.delayMs,
                easing: token.easing,
                easingCurve: toFramerEasing(token.easing),
              },
        },
        null,
        2,
      ),
    };

    if (!relativeUnits) return improved;

    const yRem = Number((token.yOffset / 16).toFixed(3));
    return {
      ...improved,
      css: improved.css.replace(`translateY(${token.yOffset}px)`, `translateY(${yRem}rem)`),
      tailwind: improved.tailwind.replace(`translate-y-[${token.yOffset}px]`, `translate-y-[${yRem}rem]`),
      json: improved.json.replace(`"y": ${token.yOffset}`, `"y": "${yRem}rem"`),
    };
  }, [token, relativeUnits]);

  const activeCode = exportCode[exportFormat];

  async function copyExport(format: "json" | "tailwind" | "css" | "framerMotion") {
    const code = exportCode[format];
    if (!code) return;
    await navigator.clipboard.writeText(code);
    const label =
      format === "framerMotion"
        ? "Framer"
        : format === "tailwind"
          ? "Tailwind"
          : format.toUpperCase();
    toast.success(`${label} code copied`);
  }

  async function saveToken() {
    if (!token || !canEditTokens || !workspaceId || saving) return;
    setSaving(true);
    try {
      await flushWorkspaceTokenPatches(workspaceId, useTokenStore.getState);
      toast.success("Token saved");
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return (
      <main className="flex min-w-0 flex-1 items-center justify-center bg-[#f8f8f6]">
        <p className="text-sm text-[#8b8a83]">Select a token to open the motion lab</p>
      </main>
    );
  }

  return (
    <main className="flex min-w-[620px] flex-1 flex-col border-r border-[#dfded8] bg-[#f5f5f3]">
      <div className="border-b border-[#dfded8] px-6 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b8a83]">
          Motion Lab / {token.name}
        </p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="text-[34px] font-semibold tracking-tight text-[#151515]">Motion Editor</h1>
          <button
            type="button"
            onClick={() => {
              void saveToken();
            }}
            disabled={!canEditTokens || !workspaceId || saving}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Token"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 px-6 pb-6 pt-4">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[#ddddd7] bg-white">
          <div
            className="relative min-h-0 flex-1"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(50,50,50,0.05) 1px, transparent 0)",
              backgroundSize: "20px 20px",
            }}
          >
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-10">
                <motion.div
                  key={replayKey}
                  initial={{
                    opacity: additiveMotion ? token.opacityStart : 1,
                    y: additiveMotion ? token.yOffset : 0,
                    scale: additiveMotion ? token.scaleStart : 1,
                  }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={tokenTransition(token)}
                  className="flex h-[98px] w-[98px] items-center justify-center rounded-xl bg-[#4c3dc9] text-[44px] font-bold leading-none text-white shadow-[0_18px_35px_-22px_rgba(31,28,86,0.8)]"
                >
                  tk
                </motion.div>

                <Button
                  type="button"
                  onClick={replay}
                  className="h-11 rounded-full border border-[#ddddd7] bg-white px-7 text-sm font-semibold text-[#171717] shadow-sm hover:bg-[#f6f6f4]"
                >
                  <Play className="mr-2 h-3.5 w-3.5" />
                  Preview Animation
                </Button>
              </div>
            </div>

            <div className="absolute bottom-4 left-4 rounded-lg border border-[#ddddd7] bg-white/90 px-3 py-2 text-[11px] text-[#56554e] backdrop-blur">
              <p className="font-semibold uppercase tracking-[0.1em] text-[#8f8e87]">Status</p>
              <p className="font-medium text-[#2f257f]">
                {token.pendingSync ? "Sync pending" : "Live sync active"}
              </p>
            </div>

            <div className="absolute bottom-4 right-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setExportOpen(true)}
                className="h-9 rounded-md border border-[#ddddd7] bg-white px-3 text-xs font-semibold text-[#2f257f] hover:bg-[#f6f6f4]"
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="w-[min(960px,calc(100vw-2rem))] max-w-none overflow-hidden sm:max-w-[960px]">
          <DialogHeader>
            <DialogTitle>Export Animation Code</DialogTitle>
            <DialogDescription>
              Choose a format and copy ready-to-use code.
            </DialogDescription>
          </DialogHeader>

          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: "json", label: "JSON" },
                { key: "tailwind", label: "Tailwind" },
                { key: "css", label: "CSS" },
                { key: "framerMotion", label: "Framer" },
              ].map((tab) => (
                <Button
                  key={tab.key}
                  type="button"
                  variant="ghost"
                  onClick={() => setExportFormat(tab.key as "json" | "tailwind" | "css" | "framerMotion")}
                  className={cn(
                    "h-8 rounded-md px-3 text-xs font-semibold uppercase",
                    exportFormat === tab.key
                      ? "bg-[#ecebfa] text-[#2f257f] hover:bg-[#ecebfa]"
                      : "bg-[#f3f2ed] text-[#666359] hover:bg-[#e9e7e0]",
                  )}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            <pre className="h-[360px] w-full min-w-0 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-[#dddcd7] bg-[#101416] p-4 font-mono text-[12px] leading-6 text-[#d8dfdf]">
              <code>{activeCode}</code>
            </pre>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                void copyExport(exportFormat);
              }}
            >
              Copy Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function PropertiesPanel({
  additiveMotion,
  setAdditiveMotion,
  relativeUnits,
  setRelativeUnits,
}: {
  additiveMotion: boolean;
  setAdditiveMotion: (next: boolean) => void;
  relativeUnits: boolean;
  setRelativeUnits: (next: boolean) => void;
}) {
  const {
    tokens,
    workspaceRole,
    updateToken,
    nameFocusTargetId,
    nameFocusSelectAll,
    clearNameFocusRequest,
  } = useTokenStore();

  const token = useSelectedToken();
  const canEditTokens = workspaceRole === "owner" || workspaceRole === "editor";
  const [nameDraft, setNameDraft] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [customApplying, setCustomApplying] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (token) setNameDraft(token.name);
  }, [token]);

  const normalizedNameDraft = useMemo(() => {
    if (!token) return "";
    return normalizeTokenNameInput(nameDraft, token.category);
  }, [token, nameDraft]);

  const nameConflict = useMemo(() => {
    if (!token || !normalizedNameDraft) return false;
    const next = normalizedNameDraft;
    return tokens.some((t) => t.id !== token.id && t.name === next);
  }, [tokens, token, normalizedNameDraft]);

  const nameDirty = !!token && normalizedNameDraft !== (token.name || "").trim();
  const nameValidationError = useMemo(() => {
    if (!normalizedNameDraft) return null;
    return getTokenNameValidationError(normalizedNameDraft);
  }, [normalizedNameDraft]);

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
      <aside className="flex w-[320px] shrink-0 items-center justify-center bg-[#f3f3f1] p-5">
        <p className="text-xs text-[#84837c]">No token selected</p>
      </aside>
    );
  }

  const tokenId = token.id;

  function update(patch: Partial<MotionTokenItem>) {
    if (!canEditTokens) return;
    updateToken(tokenId, patch);
  }

  async function commitTokenName() {
    if (!canEditTokens) return;
    if (!token || !nameDirty) return;
    const nextName = normalizeTokenNameInput(nameDraft, token.category);
    const validationError = getTokenNameValidationError(nextName);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (nameConflict) {
      toast.error("Token name already exists");
      return;
    }

    setNameDraft(nextName);
    setNameSaving(true);
    try {
      await saveTokenNameAction(tokenId, nextName);
      toast.success("Name saved");
    } catch {
      // saveTokenNameAction already shows a toast for validation/server errors.
    } finally {
      setNameSaving(false);
    }
  }

  function applyFrontendPreset(patch: Partial<MotionTokenItem>) {
    update(patch);
    toast.success("Preset applied");
  }

  async function applyCustomAnimationPrompt() {
    if (!canEditTokens) return;
    const prompt = customPrompt.trim();
    if (!prompt) {
      toast.error("Add animation requirements first");
      return;
    }

    setCustomApplying(true);
    try {
      const patch = buildAnimationPatchFromPrompt(prompt);
      update(patch);
      setCustomOpen(false);
      setCustomPrompt("");
      toast.success("Custom animation created");
    } finally {
      setCustomApplying(false);
    }
  }

  return (
    <aside className="flex w-[320px] shrink-0 flex-col overflow-auto bg-[#f3f3f1] p-6">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f8e87]">Draft alpha</p>
        <span className="text-[11px] font-semibold text-[#2f257f]">Inspector</span>
      </div>

      <div className="mb-5">
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a897f]">Token</label>
        <div className="flex gap-2">
          <Input
            ref={nameInputRef}
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={() => {
              if (!token) return;
              setNameDraft(normalizeTokenNameInput(nameDraft, token.category));
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void commitTokenName();
              }
            }}
            disabled={!canEditTokens}
            className={cn(
              "h-9 rounded-md border bg-white px-2.5 font-mono text-xs",
              nameConflict ? "border-red-400" : "border-[#d8d6cf]",
            )}
          />
          <Button
            type="button"
            onClick={() => void commitTokenName()}
            disabled={!canEditTokens || !nameDirty || nameConflict || nameSaving}
            className="h-9 rounded-md bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90"
          >
            {nameSaving ? "..." : "Save"}
          </Button>
        </div>
        {nameValidationError ? (
          <p className="mt-1 text-[10px] text-red-600">{nameValidationError}</p>
        ) : null}
        {!nameValidationError && nameConflict ? (
          <p className="mt-1 text-[10px] text-red-600">Name already exists</p>
        ) : null}
        <p className="mt-1 text-[10px] text-[#7b796f]">Format: category.descriptor (e.g. enter.default)</p>
      </div>

      <div className="mb-6 rounded-xl border border-[#dbd9d2] bg-[#f8f8f6] p-4">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a897f]">Animation Presets</p>
        <p className="mb-3 text-[11px] text-[#6f6d64]">6 trending presets used in modern product interfaces.</p>
        <div className="grid grid-cols-2 gap-2">
          {FRONTEND_ANIMATION_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => applyFrontendPreset(preset.patch)}
              disabled={!canEditTokens}
              className="rounded-lg border border-[#d8d6cf] bg-white px-2.5 py-2 text-left transition hover:bg-[#f2f1ed] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <p className="text-[11px] font-semibold text-[#2b2a25]">{preset.label}</p>
              <p className="mt-0.5 text-[10px] text-[#76746b]">{preset.description}</p>
            </button>
          ))}
        </div>
        <Button
          type="button"
          onClick={() => setCustomOpen(true)}
          disabled={!canEditTokens}
          className="mt-3 h-8 w-full rounded-md bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Add Custom Animation
        </Button>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a897f]">Spring mode</p>
        <SwitchPill enabled={token.isSpring} onToggle={() => update({ isSpring: !token.isSpring })} />
      </div>

      <div className="space-y-4">
        <Slider
          label="Mass"
          value={token.springMass}
          min={0.1}
          max={10}
          step={0.1}
          onChange={(value) => update({ springMass: value })}
          disabled={!canEditTokens}
        />
        <Slider
          label="Damping"
          value={token.springDamping}
          min={1}
          max={100}
          step={1}
          onChange={(value) => update({ springDamping: value })}
          disabled={!canEditTokens}
        />
        <Slider
          label="Stiffness"
          value={token.springStiffness}
          min={1}
          max={500}
          step={1}
          onChange={(value) => update({ springStiffness: value })}
          disabled={!canEditTokens}
        />
        <Slider
          label="Duration (ms)"
          value={token.durationMs}
          min={0}
          max={1000}
          step={10}
          onChange={(value) => update({ durationMs: value })}
          disabled={!canEditTokens}
        />
        <Slider
          label="Delay (ms)"
          value={token.delayMs}
          min={0}
          max={500}
          step={10}
          onChange={(value) => update({ delayMs: value })}
          disabled={!canEditTokens}
        />
        <Slider
          label="Y Offset"
          value={token.yOffset}
          min={-120}
          max={120}
          step={1}
          onChange={(value) => update({ yOffset: value })}
          disabled={!canEditTokens}
        />
        <Slider
          label="Scale"
          value={token.scaleStart}
          min={0.5}
          max={1.5}
          step={0.01}
          onChange={(value) => update({ scaleStart: value })}
          disabled={!canEditTokens}
        />
        <Slider
          label="Opacity"
          value={token.opacityStart}
          min={0}
          max={1}
          step={0.05}
          onChange={(value) => update({ opacityStart: value })}
          disabled={!canEditTokens}
        />
      </div>

      <div className="mt-5 rounded-xl border border-[#dbd9d2] bg-[#f8f8f6] p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a897f]">Easing</p>
          {token.isSpring ? <span className="text-[10px] text-[#7b796f]">Switch to timing to use easing</span> : null}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {EASING_PRESETS.map((preset) => (
            <Button
              key={preset}
              type="button"
              variant="ghost"
              onClick={() => update({ isSpring: false, easing: preset })}
              className={cn(
                "h-7 rounded-md px-2 text-[11px] font-semibold",
                normalizeEasing(token.easing) === normalizeEasing(preset) && !token.isSpring
                  ? "bg-[#dcdaf6] text-[#332983] hover:bg-[#dcdaf6]"
                  : "bg-[#ecebe6] text-[#5e5c53] hover:bg-[#e5e4de]",
              )}
            >
              {preset}
            </Button>
          ))}
        </div>
        <Input
          value={token.easing.startsWith("cubic-bezier") ? token.easing : ""}
          onChange={(event) => update({ isSpring: false, easing: event.target.value })}
          placeholder="cubic-bezier(0.42, 0, 0.58, 1)"
          disabled={!canEditTokens}
          className="mt-2 h-8 rounded-md border-[#d8d6cf] bg-white px-2 font-mono text-[10px]"
        />
      </div>

      <div className="mt-5 space-y-3">
        <ToggleRow label="Additive Motion" enabled={additiveMotion} onToggle={setAdditiveMotion} />
        <ToggleRow label="Relative Units" enabled={relativeUnits} onToggle={setRelativeUnits} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => void duplicateTokenAction(token.id)}
          disabled={!canEditTokens}
          className="h-9 rounded-md border border-[#d5d3cc] bg-white text-xs font-medium text-[#1e1d18] hover:bg-[#f8f8f5]"
        >
          <Copy className="mr-1.5 h-3.5 w-3.5" />
          Duplicate
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => void deleteTokenAction(token.id)}
          disabled={!canEditTokens}
          className="h-9 rounded-md border border-[#e5c6c6] bg-[#fff4f4] text-xs font-medium text-[#b44646] hover:bg-[#ffeaea]"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
      </div>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Animation</DialogTitle>
            <DialogDescription>
              Describe what you want, for example: &quot;smooth page transition, ease-in-out, 320ms, slight upward motion&quot;.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#58564d]">Animation Requirements</label>
            <Textarea
              value={customPrompt}
              onChange={(event) => setCustomPrompt(event.target.value)}
              placeholder="e.g. snappy modal pop with spring bounce, 240ms, no delay"
              className="min-h-24 bg-white"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                void applyCustomAnimationPrompt();
              }}
              disabled={customApplying || !canEditTokens}
            >
              {customApplying ? "Creating..." : "Create Animation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

function ToggleRow({
  label,
  enabled,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-[#4a483f]">{label}</span>
      <SwitchPill enabled={enabled} onToggle={() => onToggle(!enabled)} />
    </div>
  );
}

function SwitchPill({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      className={cn(
        "relative h-5 w-9 rounded-full border transition",
        enabled ? "border-primary bg-primary" : "border-border bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          enabled ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const display = step < 1 ? value.toFixed(step < 0.1 ? 2 : 1) : String(value);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a897f]">{label}</span>
        <span className="rounded bg-[#ebeae5] px-2 py-0.5 font-mono text-[11px] text-[#343228]">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        onInput={(event) => onChange(Number((event.target as HTMLInputElement).value))}
        disabled={disabled}
        className="pointer-events-auto h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#dedcd5] accent-[#4c3dc9]"
      />
    </div>
  );
}
