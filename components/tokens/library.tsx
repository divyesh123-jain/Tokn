"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, ExternalLink, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  categoryConfig,
  categoryOrder,
  motionCategories,
  type MotionTokenCategory,
  type MotionTokenItem,
} from "@/lib/tokn-constants";
import { trackProductEvent } from "@/lib/analytics";
import { getTokenNameValidationError } from "@/lib/token-name";
import { useSelectedToken, useTokenStore } from "@/lib/token-store";
import { deleteTokenAction, saveTokenNameAction } from "@/lib/token-actions";
import { transformToken } from "@/lib/codegen";
import { buildWorkspacePreviewSlug } from "@/lib/workspace-slug";
import { workspaceApiFetchInit } from "@/lib/workspace-fetch";

const EASING_MAP: Record<string, [number, number, number, number]> = {
  "ease-out": [0, 0, 0.58, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
  linear: [0, 0, 1, 1],
};

function toFramerEasing(raw: string): [number, number, number, number] {
  if (raw.startsWith("cubic-bezier(")) {
    const nums = raw.replace(/cubic-bezier\(|\)/g, "").split(",").map(Number);
    if (nums.length === 4 && nums.every((n) => Number.isFinite(n))) {
      return nums as [number, number, number, number];
    }
  }
  return EASING_MAP[raw] ?? EASING_MAP["ease-out"];
}

function tokenTransition(token: MotionTokenItem) {
  if (token.isSpring) {
    return {
      type: "spring" as const,
      stiffness: token.springStiffness,
      damping: token.springDamping,
      mass: token.springMass,
    };
  }
  return {
    duration: token.durationMs / 1000,
    delay: token.delayMs / 1000,
    ease: toFramerEasing(token.easing),
  };
}

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

export function TokenLibrary() {
  const {
    tokens,
    workspaceId,
    searchQuery,
    setSearch,
    selectedId,
    selectToken,
    updateToken,
  } = useTokenStore();
  const selectedToken = useSelectedToken();
  const [nameDraft, setNameDraft] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<MotionTokenCategory | "all">(
    "all",
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const [sdkCopied, setSdkCopied] = useState(false);
  const [sdkCopying, setSdkCopying] = useState(false);

  useEffect(() => {
    if (selectedToken) setNameDraft(selectedToken.name);
    else setNameDraft("");
  }, [selectedToken?.id]);

  const nameConflict = useMemo(() => {
    if (!selectedToken || !nameDraft.trim()) return false;
    const next = nameDraft.trim();
    return tokens.some((t) => t.id !== selectedToken.id && t.name === next);
  }, [tokens, selectedToken, nameDraft]);

  const nameValidationError = useMemo(() => {
    if (!selectedToken) return null;
    return getTokenNameValidationError(nameDraft);
  }, [selectedToken, nameDraft]);

  const nameDirty =
    !!selectedToken &&
    nameDraft.trim() !== (selectedToken.name || "").trim();

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tokens.filter((token) => {
      const matchesQuery =
        query.length === 0 ||
        token.name.toLowerCase().includes(query) ||
        token.easing.toLowerCase().includes(query);
      const matchesCategory =
        activeCategory === "all" || token.category === activeCategory;
      return matchesQuery && matchesCategory;
    });
  }, [tokens, searchQuery, activeCategory]);

  const grouped = useMemo(
    () =>
      categoryOrder
        .map((category) => ({
          category,
          items: filtered.filter((token) => token.category === category),
        }))
        .filter((group) => group.items.length > 0),
    [filtered],
  );

  const latestPublishedVersion = useMemo(() => {
    const published = tokens.filter((t) => !t.deprecated && t.publishedVersion && t.publishedAt);
    if (published.length === 0) return null;
    const latest = [...published].sort((a, b) => {
      const aMs = new Date(a.publishedAt as string).getTime();
      const bMs = new Date(b.publishedAt as string).getTime();
      return bMs - aMs;
    })[0];
    return latest.publishedVersion ?? null;
  }, [tokens]);

  async function copyToken(token: MotionTokenItem) {
    await navigator.clipboard.writeText(transformToken(token).framerMotion);
    setCopiedTokenId(token.id);
    window.setTimeout(() => setCopiedTokenId(null), 1300);
  }

  async function shareLibrary() {
    const base =
      typeof window !== "undefined" ? window.location.origin : "https://tokn.app";
    const workspaceId = useTokenStore.getState().workspaceId;
    let url = `${base}/preview`;
    if (workspaceId) {
      const workspaceRes = await fetch(`/api/workspaces/${workspaceId}`, workspaceApiFetchInit);
      const workspaceJson = (await workspaceRes.json().catch(() => null)) as
        | { workspace?: { id: string; name: string; slug?: string } }
        | null;
      const workspace = workspaceJson?.workspace;
      if (workspace) {
        const slug = workspace.slug || buildWorkspacePreviewSlug(workspace.name, workspace.id);
        url = `${base}/preview/${slug}`;
      }
    }
    await navigator.clipboard.writeText(url);
    setShared(true);
    window.setTimeout(() => setShared(false), 1500);
  }

  async function copyWorkspaceSdk() {
    if (!workspaceId) {
      toast.error("Open a workspace project to export SDK");
      return;
    }
    if (!latestPublishedVersion) {
      toast.error("Publish this workspace first to export a versioned SDK");
      return;
    }

    setSdkCopying(true);
    try {
      const version = encodeURIComponent(latestPublishedVersion);
      const res = await fetch(
        `/api/workspaces/${workspaceId}/sdk/${version}?format=typescript`,
        workspaceApiFetchInit,
      );
      const json = (await res.json().catch(() => null)) as
        | { content?: string; error?: string }
        | null;
      if (!res.ok || !json?.content) {
        toast.error(json?.error ?? "Could not export SDK");
        return;
      }
      await navigator.clipboard.writeText(json.content);
      setSdkCopied(true);
      window.setTimeout(() => setSdkCopied(false), 1500);
      toast.success(`SDK copied for ${latestPublishedVersion}`);
      void trackProductEvent({
        eventName: "sdk_export_copied",
        workspaceId,
        payload: {
          version: latestPublishedVersion,
          format: "typescript",
          source: "token_library",
        },
      });
    } finally {
      setSdkCopying(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-5">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Token Library</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Browse, preview, and copy shared motion tokens.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={shareLibrary}>
                {shared ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-600" />
                    Shared
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-3.5 w-3.5" />
                    Share library
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={() => void copyWorkspaceSdk()} disabled={sdkCopying}>
                {sdkCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-600" />
                    SDK copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    {sdkCopying ? "Exporting..." : "Copy SDK"}
                  </>
                )}
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={activeCategory === "all" ? "default" : "secondary"}
                onClick={() => setActiveCategory("all")}
              >
                All
              </Button>
              {motionCategories.map((category) => (
                <Button
                  key={category.key}
                  size="sm"
                  variant={activeCategory === category.key ? "default" : "secondary"}
                  onClick={() => setActiveCategory(category.key as MotionTokenCategory)}
                >
                  {category.label}
                </Button>
              ))}
            </div>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={searchQuery}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by token name or easing"
              />
            </div>
          </CardHeader>
        </Card>

        {grouped.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                No tokens match your current filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          grouped.map((group) => (
            <div key={group.category} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  {group.category}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {group.items.length} tokens
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.items.map((token) => {
                  const category = categoryConfig[token.category];
                  const selected = selectedId === token.id;
                  const previewKind = getPreviewKind(token);
                  return (
                    <Card
                      key={token.id}
                      onMouseEnter={() => setHoveredId(token.id)}
                      onMouseLeave={() => setHoveredId((current) =>
                        current === token.id ? null : current,
                      )}
                      className={`transition ${
                        selected ? "ring-2 ring-primary/30" : "hover:border-primary/30"
                      }`}
                    >
                      <CardContent className="pt-5">
                        <div className="flex items-start justify-between gap-2">
                          <button
                            className="text-left"
                            onClick={() => selectToken(token.id)}
                            type="button"
                          >
                            <p className="font-mono text-sm text-foreground">
                              {token.name}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {token.isSpring
                                ? `spring ${token.springStiffness}/${token.springDamping}`
                                : `${token.durationMs}ms · ${token.easing}`}
                            </p>
                          </button>
                          <Badge
                            style={{
                              backgroundColor: category.bg,
                              color: category.color,
                              borderColor: category.bg,
                            }}
                            className="uppercase"
                          >
                            {category.label}
                          </Badge>
                        </div>

                        <div className="mt-4 h-24 rounded-lg border border-border bg-muted/50 p-3">
                          <motion.div
                            key={`${token.id}-${hoveredId === token.id ? "run" : "rest"}`}
                            initial={{
                              opacity: token.opacityStart,
                              y: token.yOffset,
                              scale: token.scaleStart,
                            }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={tokenTransition(token)}
                            className="flex h-full w-full items-center justify-center"
                          >
                            {previewKind === "button" ? (
                              <div className="w-28 rounded-md border border-primary/20 bg-background px-3 py-1.5 text-center text-[11px] font-medium text-foreground shadow-sm">
                                Continue
                              </div>
                            ) : null}
                            {previewKind === "card" ? (
                              <div className="w-30 rounded-lg border border-border bg-background p-2.5 shadow-sm">
                                <div className="h-2 w-12 rounded bg-primary/15" />
                                <div className="mt-2 h-1.5 w-18 rounded bg-muted" />
                                <div className="mt-1.5 h-1.5 w-14 rounded bg-muted" />
                              </div>
                            ) : null}
                            {previewKind === "modal" ? (
                              <div className="relative h-full w-full max-w-28 rounded-md bg-black/5 p-1.5">
                                <div className="absolute inset-0 rounded-md bg-black/10" />
                                <div className="relative mx-auto mt-2.5 w-22 rounded-md border border-border bg-background p-2 shadow-sm">
                                  <div className="h-1.5 w-10 rounded bg-primary/15" />
                                  <div className="mt-1.5 h-1.5 w-16 rounded bg-muted" />
                                </div>
                              </div>
                            ) : null}
                            {previewKind === "dot" ? (
                              <div className="h-10 w-10 rounded-md bg-primary/30" />
                            ) : null}
                            {previewKind === "line" ? (
                              <div className="h-1 w-16 rounded-full bg-primary/40" />
                            ) : null}
                            {previewKind === "exit" ? (
                              <div className="h-1 w-20 rounded-full bg-muted-foreground/60" />
                            ) : null}
                            {previewKind === "enter" ? (
                              <div className="h-9 w-9 rounded-md border-2 border-primary/40 bg-transparent" />
                            ) : null}
                          </motion.div>
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => selectToken(token.id)}
                          >
                            Open
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToken(token)}
                          >
                            {copiedTokenId === token.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-green-600" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </section>

      <aside className="lg:sticky lg:top-6 lg:h-[calc(100vh-7rem)]">
        <Card className="h-full overflow-auto">
          <CardHeader>
            <CardTitle>Token Detail</CardTitle>
            <p className="text-sm text-muted-foreground">
              Edit the selected token inline.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedToken ? (
              <p className="text-sm text-muted-foreground">
                Select a token to view details.
              </p>
            ) : (
              <>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Name</span>
                  <div className="flex gap-2">
                    <Input
                      className="flex-1"
                      value={nameDraft}
                      onChange={(event) => setNameDraft(event.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void (async () => {
                            if (!selectedToken || nameConflict || !nameDirty) return;
                            if (nameValidationError) return;
                            setNameSaving(true);
                            try {
                              await saveTokenNameAction(selectedToken.id, nameDraft);
                              toast.success("Name saved");
                            } finally {
                              setNameSaving(false);
                            }
                          })();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="shrink-0"
                      disabled={!nameDirty || nameConflict || Boolean(nameValidationError) || nameSaving}
                      onClick={() =>
                        void (async () => {
                          if (!selectedToken || nameConflict || nameValidationError) return;
                          setNameSaving(true);
                          try {
                            await saveTokenNameAction(selectedToken.id, nameDraft);
                            toast.success("Name saved");
                          } finally {
                            setNameSaving(false);
                          }
                        })()
                      }
                    >
                      {nameSaving ? "…" : "Save"}
                    </Button>
                  </div>
                  {nameConflict && (
                    <p className="text-[11px] text-red-500">Name already taken</p>
                  )}
                  {nameValidationError && (
                    <p className="text-[11px] text-red-500">{nameValidationError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <Select
                    value={selectedToken.category}
                    onValueChange={(value) =>
                      updateToken(selectedToken.id, {
                        category: value as MotionTokenCategory,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {motionCategories.map((category) => (
                        <SelectItem key={category.key} value={category.key}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedToken.isSpring ? (
                  <>
                    <NumberField
                      label="Stiffness"
                      value={selectedToken.springStiffness}
                      onChange={(value) =>
                        updateToken(selectedToken.id, { springStiffness: value })
                      }
                    />
                    <NumberField
                      label="Damping"
                      value={selectedToken.springDamping}
                      onChange={(value) =>
                        updateToken(selectedToken.id, { springDamping: value })
                      }
                    />
                    <NumberField
                      label="Mass"
                      value={selectedToken.springMass}
                      step={0.1}
                      onChange={(value) =>
                        updateToken(selectedToken.id, { springMass: value })
                      }
                    />
                  </>
                ) : (
                  <>
                    <NumberField
                      label="Duration (ms)"
                      value={selectedToken.durationMs}
                      onChange={(value) =>
                        updateToken(selectedToken.id, { durationMs: value })
                      }
                    />
                    <label className="block space-y-1">
                      <span className="text-xs text-muted-foreground">Easing</span>
                      <Input
                        value={selectedToken.easing}
                        onChange={(event) =>
                          updateToken(selectedToken.id, {
                            easing: event.target.value,
                          })
                        }
                      />
                    </label>
                  </>
                )}

                <NumberField
                  label="Y offset"
                  value={selectedToken.yOffset}
                  onChange={(value) =>
                    updateToken(selectedToken.id, { yOffset: value })
                  }
                />
                <NumberField
                  label="Scale"
                  value={selectedToken.scaleStart}
                  step={0.01}
                  onChange={(value) =>
                    updateToken(selectedToken.id, { scaleStart: value })
                  }
                />
                <NumberField
                  label="Opacity"
                  value={selectedToken.opacityStart}
                  step={0.1}
                  onChange={(value) =>
                    updateToken(selectedToken.id, { opacityStart: value })
                  }
                />

                <label className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                  <span className="text-xs text-muted-foreground">Deprecated</span>
                  <input
                    type="checkbox"
                    checked={selectedToken.deprecated}
                    onChange={(event) =>
                      updateToken(selectedToken.id, {
                        deprecated: event.target.checked,
                      })
                    }
                    className="h-4 w-4"
                  />
                </label>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full text-red-600"
                    onClick={() => void deleteTokenAction(selectedToken.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete token
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function NumberField({
  label,
  value,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input
        type="number"
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
