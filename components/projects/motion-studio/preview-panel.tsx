"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Copy, Play } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { transformToken } from "@/lib/codegen";
import { useSelectedToken, useTokenStore } from "@/lib/token-store";
import { flushWorkspaceTokenPatches } from "@/lib/workspace-token-sync";

import { toFramerEasing, tokenTransition } from "./shared";

type PreviewPanelProps = {
  additiveMotion: boolean;
  relativeUnits: boolean;
};

function getTokenDescriptor(tokenName: string) {
  const parts = tokenName.toLowerCase().split(".");
  return parts[1] ?? "";
}

function getPreviewKind(tokenName: string, category: string) {
  const descriptor = getTokenDescriptor(tokenName);

  if (["button", "toggle", "switch", "checkbox", "radio", "tabs"].some((word) => descriptor.includes(word))) {
    return "button" as const;
  }
  if (["card", "accordion"].some((word) => descriptor.includes(word))) {
    return "card" as const;
  }
  if (["modal", "dialog", "sheet", "drawer", "popover", "dropdown-menu"].some((word) => descriptor.includes(word))) {
    return "modal" as const;
  }
  if (category === "feedback") return "toast" as const;
  if (category === "spring") return "dot" as const;
  if (category === "exit") return "exit" as const;
  return "enter" as const;
}

export function PreviewPanel({ additiveMotion, relativeUnits }: PreviewPanelProps) {
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
        ...tailwindClassList.map((cls) => `  \"${cls}\",`),
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
      json: improved.json.replace(`\"y\": ${token.yOffset}`, `\"y\": \"${yRem}rem\"`),
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
      <main className="flex min-w-0 flex-1 items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Select a token to open the motion lab</p>
      </main>
    );
  }

  const previewKind = getPreviewKind(token.name, token.category);

  return (
    <main className="flex min-w-155 flex-1 flex-col border-r border-border bg-muted/30">
      <div className="border-b border-border px-6 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Motion Lab / {token.name}
        </p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="text-[34px] font-semibold tracking-tight text-foreground">Motion Editor</h1>
          <button
            type="button"
            onClick={() => {
              void saveToken();
            }}
            disabled={!canEditTokens || !workspaceId || saving}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Token"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 px-6 pb-6 pt-4">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_18px_48px_-28px_rgba(0,0,0,0.25)]">
          <div
            className="relative min-h-0 flex-1 overflow-hidden"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(50,50,50,0.05) 1px, transparent 0), linear-gradient(180deg, rgba(255,255,255,0.95), rgba(245,247,251,0.9))",
              backgroundSize: "20px 20px, cover",
            }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.6),rgba(255,255,255,0))]" />

            <div className="relative flex h-full min-h-0 flex-col">
              <div className="flex items-center justify-between border-b border-border/70 bg-white/70 px-5 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4c3dc9] text-xs font-bold text-white shadow-sm">
                    T
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tokn Studio</p>
                    <p className="text-sm font-semibold text-foreground">Product Preview</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden h-8 min-w-52 items-center rounded-full border border-border bg-background px-3 text-[11px] text-muted-foreground md:flex">
                    Search widgets, tasks, analytics
                  </div>
                  <div className="h-8 w-8 rounded-full bg-muted" />
                  <div className="h-8 w-8 rounded-full bg-muted" />
                </div>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)]">
                <aside className="border-r border-border/70 bg-white/55 p-4 backdrop-blur-sm">
                  <div className="space-y-2">
                    {[
                      ["Overview", true],
                      ["Widgets", false],
                      ["Reports", false],
                      ["Settings", false],
                    ].map(([label, active]) => (
                      <div
                        key={String(label)}
                        className={`rounded-xl px-3 py-2 text-sm ${active ? "bg-[#4c3dc9] text-white shadow-sm" : "text-foreground"}`}
                      >
                        {label}
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border border-border bg-background p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Workspace</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">Northwind Admin</p>
                    <div className="mt-3 h-2 rounded-full bg-muted">
                      <div className="h-2 w-2/3 rounded-full bg-[#4c3dc9]" />
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">78% of preview flow complete</p>
                  </div>
                </aside>

                <section className="relative min-h-0 overflow-hidden p-5">
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Revenue</p>
                          <p className="text-2xl font-semibold text-foreground">$128k</p>
                        </div>
                        <div className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">+12.4%</div>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        {[["Orders", "3,204"], ["Customers", "18.2k"], ["Retention", "91%"]].map(([label, value]) => (
                          <div key={label} className="rounded-2xl bg-muted/40 p-3">
                            <p className="text-[11px] text-muted-foreground">{label}</p>
                            <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 h-28 rounded-2xl border border-dashed border-border/70 bg-gradient-to-br from-[#4c3dc9]/8 to-transparent p-3">
                        <div className="flex h-full items-end gap-2">
                          {[34, 52, 28, 60, 44, 72, 56, 66].map((height, index) => (
                            <div
                              key={index}
                              className="flex-1 rounded-t-md bg-[#4c3dc9]/70"
                              style={{ height: `${height}%` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Actions</p>
                      <div className="mt-4 space-y-3">
                        <div className="rounded-2xl bg-muted/40 p-3">
                          <p className="text-sm font-medium text-foreground">Approve release</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">Push the latest widget set live.</p>
                        </div>
                        <div className="rounded-2xl bg-muted/40 p-3">
                          <p className="text-sm font-medium text-foreground">Invite teammate</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">Share access to the design board.</p>
                        </div>
                      </div>

                      <motion.div
                        key={replayKey}
                        initial={{
                          opacity: additiveMotion ? token.opacityStart : 1,
                          y: additiveMotion ? token.yOffset : 0,
                          scale: additiveMotion ? token.scaleStart : 1,
                        }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={tokenTransition(token)}
                        className="mt-5"
                      >
                        {previewKind === "button" ? (
                          <div className="rounded-2xl border border-[#4c3dc9]/25 bg-gradient-to-r from-[#4c3dc9] to-[#6b5cff] px-4 py-3 text-center text-sm font-semibold text-white shadow-[0_16px_30px_-20px_rgba(76,61,201,0.65)]">
                            Continue
                          </div>
                        ) : null}

                        {previewKind === "card" ? (
                          <div className="rounded-3xl border border-border bg-background p-4 shadow-[0_16px_32px_-26px_rgba(31,28,86,0.35)]">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Widget card</p>
                                <p className="mt-1 text-base font-semibold text-foreground">Quarterly goals</p>
                              </div>
                              <div className="h-10 w-10 rounded-2xl bg-[#4c3dc9]/12" />
                            </div>
                            <div className="mt-4 grid gap-2">
                              <div className="h-2 rounded-full bg-muted" />
                              <div className="h-2 w-4/5 rounded-full bg-muted" />
                              <div className="h-2 w-2/3 rounded-full bg-muted" />
                            </div>
                          </div>
                        ) : null}

                        {previewKind === "modal" ? (
                          <div className="relative rounded-3xl border border-border bg-background p-4 shadow-[0_22px_45px_-28px_rgba(31,28,86,0.45)]">
                            <div className="absolute inset-0 rounded-3xl bg-black/35" />
                            <div className="relative mx-auto w-full max-w-72 rounded-2xl border border-border bg-white p-4 shadow-lg">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Confirm action</p>
                              <p className="mt-2 text-sm text-foreground">This widget opens on top of the dashboard like a real product dialog.</p>
                              <div className="mt-4 flex justify-end gap-2">
                                <div className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground">Cancel</div>
                                <div className="rounded-lg bg-[#4c3dc9] px-3 py-2 text-xs font-semibold text-white">Continue</div>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        {previewKind === "toast" ? (
                          <div className="rounded-2xl border border-[#4c3dc9]/15 bg-[#111827] px-4 py-3 text-left text-sm text-white shadow-[0_18px_30px_-22px_rgba(31,28,86,0.65)]">
                            <p className="font-semibold">Saved</p>
                            <p className="mt-0.5 text-white/70">Your change was published to the workspace.</p>
                          </div>
                        ) : null}

                        {previewKind === "dot" ? (
                          <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 p-3">
                            <div className="h-3 w-3 rounded-full bg-[#4c3dc9]" />
                            <div>
                              <p className="text-sm font-medium text-foreground">Live indicator</p>
                              <p className="text-[11px] text-muted-foreground">Subtle, fast, and production-ready.</p>
                            </div>
                          </div>
                        ) : null}

                        {previewKind === "exit" ? (
                          <div className="rounded-2xl border border-border bg-muted/40 p-3">
                            <div className="h-2 rounded-full bg-[#7a7891]" />
                            <p className="mt-2 text-[11px] text-muted-foreground">Exit state and dismissal motion</p>
                          </div>
                        ) : null}

                        {previewKind === "enter" ? (
                          <div className="rounded-2xl border border-dashed border-[#4c3dc9]/30 bg-[#4c3dc9]/6 p-4">
                            <div className="h-10 w-10 rounded-2xl border-2 border-[#4c3dc9]" />
                            <p className="mt-3 text-sm font-medium text-foreground">Enter state widget</p>
                          </div>
                        ) : null}
                      </motion.div>
                    </div>
                  </div>

                  <div className="absolute bottom-5 left-5 rounded-2xl border border-border bg-white/90 px-4 py-3 backdrop-blur-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Animation type</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{token.isSpring ? "Spring" : "Timed"}</p>
                  </div>
                </section>
              </div>

              <div className="absolute bottom-4 left-4 rounded-lg border border-border bg-card/90 px-3 py-2 text-[11px] text-muted-foreground backdrop-blur">
                <p className="font-semibold uppercase tracking-widest text-muted-foreground">Status</p>
                <p className="font-medium text-primary">{token.pendingSync ? "Sync pending" : "Live sync active"}</p>
              </div>

              <div className="absolute bottom-4 right-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setExportOpen(true)}
                  className="h-9 rounded-md border border-border bg-background px-3 text-xs font-semibold text-primary hover:bg-muted"
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Export
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="w-[min(960px,calc(100vw-2rem))] max-w-none overflow-hidden sm:max-w-240">
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
                  className={
                    exportFormat === tab.key
                      ? "h-8 rounded-md bg-accent px-3 text-xs font-semibold uppercase text-accent-foreground hover:bg-accent"
                      : "h-8 rounded-md bg-muted px-3 text-xs font-semibold uppercase text-muted-foreground hover:bg-muted/80"
                  }
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            <pre className="h-90 w-full min-w-0 overflow-auto whitespace-pre-wrap wrap-break-word rounded-lg border border-[#dddcd7] bg-[#101416] p-4 font-mono text-[12px] leading-6 text-[#d8dfdf]">
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
