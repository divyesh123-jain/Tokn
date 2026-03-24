"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, ExternalLink, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  categoryConfig,
  categoryOrder,
  motionCategories,
  type MotionTokenCategory,
  type MotionTokenItem,
} from "@/lib/motif";
import { useSelectedToken, useTokenStore } from "@/lib/token-store";
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

export function TokenLibrary() {
  const {
    tokens,
    searchQuery,
    setSearch,
    selectedId,
    selectToken,
    updateToken,
    deleteToken,
  } = useTokenStore();
  const selectedToken = useSelectedToken();
  const [activeCategory, setActiveCategory] = useState<MotionTokenCategory | "all">(
    "all",
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [shared, setShared] = useState(false);

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

  async function copyToken(token: MotionTokenItem) {
    await navigator.clipboard.writeText(transformToken(token).framerMotion);
    setCopiedTokenId(token.id);
    window.setTimeout(() => setCopiedTokenId(null), 1300);
  }

  async function shareLibrary() {
    const base =
      typeof window !== "undefined" ? window.location.origin : "https://tokn.app";
    const url = `${base}/preview?view=token-library`;
    await navigator.clipboard.writeText(url);
    setShared(true);
    window.setTimeout(() => setShared(false), 1500);
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
                            className="h-full w-full rounded-md bg-primary/15"
                          />
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
                <label className="block space-y-1">
                  <span className="text-xs text-muted-foreground">Name</span>
                  <Input
                    value={selectedToken.name}
                    onChange={(event) =>
                      updateToken(selectedToken.id, { name: event.target.value })
                    }
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs text-muted-foreground">Category</span>
                  <select
                    value={selectedToken.category}
                    onChange={(event) =>
                      updateToken(selectedToken.id, {
                        category: event.target.value as MotionTokenCategory,
                      })
                    }
                    className="h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none"
                  >
                    {motionCategories.map((category) => (
                      <option key={category.key} value={category.key}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>

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
                    onClick={() => deleteToken(selectedToken.id)}
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
