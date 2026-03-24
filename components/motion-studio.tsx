"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Play, Plus, Search } from "lucide-react";

import {
  type MotionTokenItem,
  type MotionTokenCategory,
  categoryConfig,
  categoryOrder,
  motionCategories,
} from "@/lib/motif";
import {
  useTokenStore,
  useSelectedToken,
  type PreviewComponent,
  type CodeFormat,
} from "@/lib/token-store";
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
    return nums as [number, number, number, number];
  }
  return EASING_MAP[raw] ?? EASING_MAP["ease-out"];
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

const PREVIEW_TABS: { key: PreviewComponent; label: string }[] = [
  { key: "button", label: "Button" },
  { key: "card", label: "Card" },
  { key: "modal", label: "Modal" },
  { key: "toast", label: "Toast" },
  { key: "list", label: "List item" },
];

const EASING_PRESETS = ["ease-out", "ease-in-out", "linear", "ease-in"];

const CODE_TABS: { key: CodeFormat; label: string }[] = [
  { key: "framerMotion", label: "Framer Motion" },
  { key: "css", label: "CSS" },
  { key: "tailwind", label: "Tailwind CSS" },
  { key: "json", label: "JSON" },
];

export function MotionStudio() {
  return (
    <div className="flex h-screen">
      <TokenListPanel />
      <PreviewPanel />
      <PropertiesPanel />
    </div>
  );
}

function TokenListPanel() {
  const { tokens, selectedId, searchQuery, setSearch, selectToken, createToken } =
    useTokenStore();
  const nameInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <aside className="flex w-[220px] flex-col border-r border-border bg-card">
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-[10px] font-bold text-primary-foreground">
            TK
          </div>
          <span className="text-sm font-semibold text-foreground">Tokn</span>
          <span className="text-[10px] text-muted-foreground">v1.0</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tokens…"
            className="w-full rounded-lg bg-background py-1.5 pl-8 pr-3 text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-auto px-2">
        {grouped.map((group) => (
          <div key={group.category} className="mb-3">
            <p
              className="mb-1 px-2 text-[10px] font-semibold uppercase text-[#888780]"
              style={{ letterSpacing: "0.06em" }}
            >
              {group.category}
            </p>
            {group.items.map((token) => {
              const sel = token.id === selectedId;
              const cfg = categoryConfig[token.category];
              return (
                <button
                  key={token.id}
                  onClick={() => selectToken(token.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition ${
                    sel ? "bg-[#EEEDFE]" : "hover:bg-muted"
                  }`}
                >
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: sel ? "#534AB7" : cfg.color,
                    }}
                  />
                  <span
                    className={`flex-1 truncate text-xs font-medium ${
                      sel ? "text-[#3C3489]" : "text-foreground"
                    }`}
                  >
                    {token.name || "untitled"}
                  </span>
                  <span className="shrink-0 text-[10px] font-mono text-[#888780]">
                    {token.isSpring
                      ? `stiff: ${token.springStiffness}`
                      : `${token.durationMs}ms`}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <button
          onClick={createToken}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          New token
        </button>
      </div>
    </aside>
  );
}

function PreviewPanel() {
  const { previewComponent, setPreviewComponent, replayKey, replay } =
    useTokenStore();
  const token = useSelectedToken();
  if (!token) return <main className="flex-1 bg-[#F1EFE8]" />;

  const durPercent = Math.min(100, Math.max(8, token.durationMs / 8));

  return (
    <main className="flex flex-1 flex-col overflow-auto bg-[#F1EFE8]">
      <div className="flex flex-1 items-center justify-center p-8">
        <div
          className="overflow-hidden rounded-xl bg-white shadow-lg"
          style={{ width: 320 }}
        >
          <div className="flex items-center gap-1.5 border-b border-gray-100 px-3 py-2.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#FF6058]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex min-h-[220px] items-center justify-center p-8">
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
              <PreviewComponent type={previewComponent} />
            </motion.div>
          </div>
        </div>
      </div>

      <div className="px-8 pb-5">
        <div className="flex items-center gap-2">
          {PREVIEW_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPreviewComponent(tab.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                previewComponent === tab.key
                  ? "bg-white text-foreground shadow-sm"
                  : "text-[#888780] hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={replay}
            className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-gray-50"
          >
            <Play className="h-3 w-3" />
            Replay
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-16 text-[10px] text-[#888780]">opacity</span>
            <div className="flex-1">
              <div
                className="h-1.5 rounded-full bg-[#534AB7]"
                style={{ width: `${token.opacityStart < 1 ? durPercent : 0}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-16 text-[10px] text-[#888780]">transform</span>
            <div className="flex-1">
              <div
                className="h-1.5 rounded-full bg-[#3BA89E]"
                style={{
                  width: `${token.yOffset !== 0 || token.scaleStart !== 1 ? durPercent : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function PreviewComponent({ type }: { type: PreviewComponent }) {
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
          <p className="mt-2 text-xs text-gray-500">
            This action cannot be undone.
          </p>
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

function PropertiesPanel() {
  const { tokens, selectedId, updateToken, codeFormat, setCodeFormat } =
    useTokenStore();
  const token = useSelectedToken();
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const nameConflict = useMemo(() => {
    if (!token || !token.name.trim()) return false;
    return tokens.some((t) => t.id !== token.id && t.name === token.name);
  }, [tokens, token]);

  const code = useMemo(() => {
    if (!token) return { framerMotion: "", css: "", tailwind: "", json: "" };
    return transformToken(token);
  }, [token]);

  useEffect(() => {
    if (token && token.name === "" && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [token?.id]);

  if (!token) {
    return (
      <aside className="flex w-[260px] items-center justify-center border-l border-border bg-card p-5">
        <p className="text-xs text-muted-foreground">No token selected</p>
      </aside>
    );
  }

  function update(patch: Partial<MotionTokenItem>) {
    updateToken(token!.id, patch);
  }

  function handleBlur() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(code[codeFormat]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <aside className="flex w-[260px] flex-col overflow-auto border-l border-border bg-card">
      <div className="flex-1 p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#888780]">
            Properties
          </p>
          {saved && (
            <span className="text-[10px] font-medium text-primary">Saved</span>
          )}
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-[10px] text-[#888780]">Name</label>
          <div className="relative">
            <input
              ref={nameInputRef}
              value={token.name}
              onChange={(e) => update({ name: e.target.value })}
              onBlur={handleBlur}
              placeholder="enter.default"
              className={`w-full rounded-lg border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground outline-none transition focus:ring-2 focus:ring-ring ${
                nameConflict ? "border-red-400" : "border-border"
              }`}
            />
            {token.name.trim() && !nameConflict && (
              <Check className="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-green-500" />
            )}
          </div>
          {nameConflict && (
            <p className="mt-1 text-[10px] text-red-500">
              This name is already taken
            </p>
          )}
        </div>

        <div className="mb-5">
          <label className="mb-1 block text-[10px] text-[#888780]">
            Category
          </label>
          <select
            value={token.category}
            onChange={(e) =>
              update({ category: e.target.value as MotionTokenCategory })
            }
            onBlur={handleBlur}
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            {motionCategories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-5 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#888780]">
            {token.isSpring ? "Spring physics" : "Timing"}
          </span>
          <button
            onClick={() => update({ isSpring: !token.isSpring })}
            className={`relative h-[18px] w-8 rounded-full transition ${
              token.isSpring ? "bg-primary" : "bg-muted"
            }`}
          >
            <div
              className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                token.isSpring ? "translate-x-[14px]" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {token.isSpring ? (
          <div className="space-y-4">
            <Slider
              label="Stiffness"
              value={token.springStiffness}
              min={1}
              max={500}
              step={1}
              onChange={(v) => update({ springStiffness: v })}
              onBlur={handleBlur}
            />
            <Slider
              label="Damping"
              value={token.springDamping}
              min={1}
              max={100}
              step={1}
              onChange={(v) => update({ springDamping: v })}
              onBlur={handleBlur}
            />
            <Slider
              label="Mass"
              value={token.springMass}
              min={0.1}
              max={10}
              step={0.1}
              suffix=""
              onChange={(v) => update({ springMass: v })}
              onBlur={handleBlur}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <Slider
              label="Duration"
              value={token.durationMs}
              min={0}
              max={1000}
              step={10}
              suffix="ms"
              onChange={(v) => update({ durationMs: v })}
              onBlur={handleBlur}
            />
            <Slider
              label="Delay"
              value={token.delayMs}
              min={0}
              max={500}
              step={10}
              suffix="ms"
              onChange={(v) => update({ delayMs: v })}
              onBlur={handleBlur}
            />
          </div>
        )}

        <div className="mt-4 space-y-4">
          <Slider
            label="Y Offset"
            value={token.yOffset}
            min={-100}
            max={100}
            step={1}
            suffix="px"
            onChange={(v) => update({ yOffset: v })}
            onBlur={handleBlur}
          />
          <Slider
            label="Scale"
            value={token.scaleStart}
            min={0}
            max={2}
            step={0.01}
            onChange={(v) => update({ scaleStart: v })}
            onBlur={handleBlur}
          />
          <Slider
            label="Opacity"
            value={token.opacityStart}
            min={0}
            max={1}
            step={0.1}
            onChange={(v) => update({ opacityStart: v })}
            onBlur={handleBlur}
          />
        </div>

        {!token.isSpring && (
          <div className="mt-5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#888780]">
              Easing
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {EASING_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => update({ easing: preset })}
                  className={`rounded-lg px-2 py-1.5 text-[11px] font-medium transition ${
                    token.easing === preset
                      ? "bg-[#EEEDFE] text-[#3C3489]"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              value={
                token.easing.startsWith("cubic-bezier") ? token.easing : ""
              }
              onChange={(e) => update({ easing: e.target.value })}
              onBlur={handleBlur}
              placeholder="cubic-bezier(0.4, 0, 0.2, 1)"
              className="mt-2 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-[10px] text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        <div className="mt-5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#888780]">
            Generated code
          </p>
          <div className="mb-2 flex gap-1">
            {CODE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setCodeFormat(tab.key)}
                className={`rounded px-2 py-1 text-[10px] font-medium transition ${
                  codeFormat === tab.key
                    ? "bg-[#EEEDFE] text-[#3C3489]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <pre className="max-h-[200px] overflow-auto rounded-lg bg-background p-3 font-mono text-[11px] leading-relaxed text-foreground">
            <code>{code[codeFormat]}</code>
          </pre>
        </div>
      </div>

      <div className="border-t border-border p-4">
        <button
          onClick={handleCopy}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border py-2.5 text-xs font-medium text-foreground transition hover:bg-muted"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-500" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy code
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
  onBlur,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
  onBlur?: () => void;
}) {
  const display =
    step < 1 ? value.toFixed(step < 0.1 ? 2 : 1) : String(value);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-mono text-xs font-medium text-foreground">
          {display}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onBlur}
        className="w-full"
      />
    </div>
  );
}
