"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import {
  categoryConfig,
  categoryOrder,
  type MotionTokenCategory,
  type MotionTokenItem,
} from "@/lib/tokn-constants";

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

function tokenKeyValues(token: MotionTokenItem) {
  if (token.isSpring) {
    return [
      `Spring: ${token.springStiffness}/${token.springDamping}/${token.springMass}`,
      `Start: y ${token.yOffset}, scale ${token.scaleStart}, opacity ${token.opacityStart}`,
    ];
  }
  return [
    `${token.durationMs}ms • ${token.easing} • delay ${token.delayMs}ms`,
    `Start: y ${token.yOffset}, scale ${token.scaleStart}, opacity ${token.opacityStart}`,
  ];
}

export function PublicPreviewView({
  workspaceName,
  version,
  publishedAtIso,
  workspaceSlug,
  tokens,
  pinned,
  isLiveDraft,
}: {
  workspaceName: string;
  version: string;
  publishedAtIso: string;
  workspaceSlug: string;
  tokens: MotionTokenItem[];
  pinned: boolean;
  isLiveDraft: boolean;
}) {
  const [activeCategory, setActiveCategory] = useState<MotionTokenCategory | "all">("all");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const categories = useMemo(
    () => categoryOrder.filter((category) => tokens.some((t) => t.category === category)),
    [tokens],
  );

  const filtered = useMemo(() => {
    if (activeCategory === "all") return tokens;
    return tokens.filter((t) => t.category === activeCategory);
  }, [tokens, activeCategory]);

  const publishedAtLabel = new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(publishedAtIso));

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Tokn public preview</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {workspaceName}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border bg-muted px-2.5 py-1 font-medium text-foreground">
                  {isLiveDraft ? "Live draft" : `Published ${version}`}
                </span>
                <span>{isLiveDraft ? `Last updated ${publishedAtLabel}` : `Published ${publishedAtLabel}`}</span>
                {!pinned && !isLiveDraft ? (
                  <Link
                    href={`/preview/${workspaceSlug}/v/${encodeURIComponent(version)}`}
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Pin this version
                  </Link>
                ) : pinned ? (
                  <span className="text-foreground">Version pinned</span>
                ) : null}
              </div>
            </div>

            <Link
              href="/signup"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Sign up to edit
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                activeCategory === "all"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:border-primary/40"
              }`}
              onClick={() => setActiveCategory("all")}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium uppercase transition ${
                  activeCategory === category
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:border-primary/40"
                }`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((token) => {
            const category = categoryConfig[token.category];
            const values = tokenKeyValues(token);
            return (
              <article
                key={token.id}
                onMouseEnter={() => setHoveredId(token.id)}
                onMouseLeave={() => setHoveredId((current) => (current === token.id ? null : current))}
                className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-mono text-sm text-foreground">{token.name}</h2>
                    {token.intent?.trim() ? (
                      <p className="mt-1 text-xs text-muted-foreground">{token.intent.trim()}</p>
                    ) : null}
                  </div>
                  <span
                    className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase"
                    style={{
                      color: category.color,
                      backgroundColor: category.bg,
                      borderColor: category.bg,
                    }}
                  >
                    {token.category}
                  </span>
                </div>

                <div className="mt-4 h-24 rounded-lg border border-border bg-muted/40 p-3">
                  <motion.div
                    key={`${token.id}-${hoveredId === token.id ? "run" : "rest"}`}
                    initial={{
                      opacity: token.opacityStart,
                      y: token.yOffset,
                      scale: token.scaleStart,
                    }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={tokenTransition(token)}
                    className="h-full w-full rounded-md bg-primary/20"
                  />
                </div>

                <div className="mt-4 space-y-1">
                  <p className="text-xs text-muted-foreground">{values[0]}</p>
                  <p className="text-xs text-muted-foreground">{values[1]}</p>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
