"use client";

import { motion } from "framer-motion";
import { Play } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { useSelectedToken, useTokenStore, type PreviewComponent } from "@/lib/token-store";
import type { MotionTokenItem } from "@/lib/motif";

const previewTargets: {
  component: PreviewComponent;
  what: string;
  howItWorks: string;
  whyItMatters: string;
}[] = [
  {
    component: "button",
    what: "Button",
    howItWorks: "Most common interaction surface with frequent press + hover state transitions.",
    whyItMatters: "Checks small-scale response and catches abrupt timing immediately.",
  },
  {
    component: "card",
    what: "Card",
    howItWorks: "Heavier element that should feel grounded and natural during enter motion.",
    whyItMatters: "Validates mid-size component timing and easing quality.",
  },
  {
    component: "modal",
    what: "Modal",
    howItWorks: "Large surface; too-fast values feel jarring, too-slow values feel blocked.",
    whyItMatters: "Confirms large-scale transitions still feel intentional.",
  },
  {
    component: "toast",
    what: "Toast",
    howItWorks: "Ephemeral feedback that must read fast and not distract.",
    whyItMatters: "Validates short-lived UI and perceived responsiveness.",
  },
  {
    component: "list",
    what: "List item",
    howItWorks: "Used as repeated elements where staggered flow and rhythm are visible.",
    whyItMatters: "Exposes sequence issues and spring/timing mismatch.",
  },
];

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

function PreviewComponentCard({ type }: { type: PreviewComponent }) {
  switch (type) {
    case "button":
      return (
        <button className="rounded-lg bg-[#534AB7] px-6 py-2.5 text-sm font-medium text-white shadow-sm">
          Get started
        </button>
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
          <p className="mt-2 text-xs text-gray-500">This action cannot be undone.</p>
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

export default function PreviewPage() {
  const { previewComponent, setPreviewComponent, replayKey, replay } = useTokenStore();
  const token = useSelectedToken();

  if (!token) {
    return (
      <AppShell
        title="Preview Lab"
        description="Validate token motion on real components before publish."
      >
        <p className="text-sm text-muted-foreground">No token selected.</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Feature 04 · Live Component Preview"
      description="Real components animate with your exact token values as you edit."
    >
      <section className="space-y-6">
        <article className="rounded-xl border border-border bg-muted/50 p-4">
          <h3 className="text-xl font-semibold text-foreground">Overview</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            The preview panel renders canonical UI components and replays motion using current
            token values. Slider updates in the editor trigger immediate remount/replay, so value
            changes are visible within one frame.
          </p>
        </article>

        <article className="rounded-xl border border-border bg-background p-4">
          <div className="flex flex-wrap items-center gap-2">
            {previewTargets.map((item) => (
              <button
                key={item.component}
                type="button"
                onClick={() => setPreviewComponent(item.component)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  previewComponent === item.component
                    ? "bg-[#EEEDFE] text-[#3C3489]"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.what}
              </button>
            ))}
            <div className="flex-1" />
            <button
              type="button"
              onClick={replay}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
            >
              <Play className="h-3.5 w-3.5" />
              Replay
            </button>
          </div>

          <div className="mt-4 flex min-h-[260px] items-center justify-center rounded-xl bg-[#F1EFE8] p-6">
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
              <PreviewComponentCard type={previewComponent} />
            </motion.div>
          </div>
        </article>

        <article className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[740px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="border-b border-border px-3 py-2 font-semibold text-foreground">
                  What
                </th>
                <th className="border-b border-border px-3 py-2 font-semibold text-foreground">
                  How it works
                </th>
                <th className="border-b border-border px-3 py-2 font-semibold text-foreground">
                  Why it matters
                </th>
              </tr>
            </thead>
            <tbody>
              {previewTargets.map((item) => (
                <tr key={`row-${item.component}`} className="align-top">
                  <td className="border-b border-border px-3 py-2 font-medium text-foreground">
                    {item.what}
                  </td>
                  <td className="border-b border-border px-3 py-2 text-muted-foreground">
                    {item.howItWorks}
                  </td>
                  <td className="border-b border-border px-3 py-2 text-muted-foreground">
                    {item.whyItMatters}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="rounded-xl border border-border bg-background p-4">
          <h3 className="text-xl font-semibold text-foreground">Success metric</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Users adjust any token value and the selected preview updates and replays in under
            16ms, with no perceptible lag between control input and rendered motion.
          </p>
        </article>
      </section>
    </AppShell>
  );
}
