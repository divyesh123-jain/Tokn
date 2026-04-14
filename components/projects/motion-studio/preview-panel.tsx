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
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
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
                  className="flex h-32 w-32 items-center justify-center"
                >
                  {(() => {
                    const previewKind = getPreviewKind(token.name, token.category);

                    if (previewKind === "button") {
                      return (
                        <div className="rounded-md border border-[#4c3dc9]/25 bg-white px-4 py-2 text-[13px] font-semibold text-[#372d89] shadow-[0_10px_24px_-16px_rgba(31,28,86,0.4)]">
                          Continue
                        </div>
                      );
                    }

                    if (previewKind === "card") {
                      return (
                        <div className="w-28 rounded-lg border border-border bg-white p-3 shadow-[0_16px_30px_-24px_rgba(31,28,86,0.35)]">
                          <div className="h-2 w-12 rounded bg-[#4c3dc9]/18" />
                          <div className="mt-2 h-1.5 w-18 rounded bg-muted" />
                          <div className="mt-1.5 h-1.5 w-14 rounded bg-muted" />
                        </div>
                      );
                    }

                    if (previewKind === "modal") {
                      return (
                        <div className="relative h-28 w-32 rounded-xl bg-black/8 p-2">
                          <div className="absolute inset-0 rounded-xl bg-black/14 backdrop-blur-[1px]" />
                          <div className="relative mx-auto mt-4 w-24 rounded-lg border border-border bg-white p-3 shadow-[0_18px_30px_-24px_rgba(31,28,86,0.45)]">
                            <div className="h-2 w-12 rounded bg-[#4c3dc9]/18" />
                            <div className="mt-2 h-1.5 w-16 rounded bg-muted" />
                          </div>
                        </div>
                      );
                    }

                    if (previewKind === "toast") {
                      return (
                        <div className="w-28 rounded-lg border border-[#4c3dc9]/15 bg-[#111827] px-3 py-2 text-left text-[11px] text-white shadow-[0_18px_30px_-22px_rgba(31,28,86,0.65)]">
                          <p className="font-semibold">Saved</p>
                          <p className="mt-0.5 text-white/70">Your changes were applied.</p>
                        </div>
                      );
                    }

                    if (previewKind === "dot") {
                      return <div className="h-12 w-12 rounded-xl bg-[#4c3dc9]" />;
                    }

                    if (previewKind === "exit") {
                      return <div className="h-1.5 w-20 rounded-full bg-[#7a7891]" />;
                    }

                    return <div className="h-9 w-9 rounded-xl border-2 border-[#4c3dc9] bg-transparent" />;
                  })()}
                </motion.div>

                <Button
                  type="button"
                  onClick={replay}
                  className="h-11 rounded-full border border-border bg-background px-7 text-sm font-semibold text-foreground shadow-sm hover:bg-muted"
                >
                  <Play className="mr-2 h-3.5 w-3.5" />
                  Preview Animation
                </Button>
              </div>
            </div>

            <div className="absolute bottom-4 left-4 rounded-lg border border-border bg-card/90 px-3 py-2 text-[11px] text-muted-foreground backdrop-blur">
              <p className="font-semibold uppercase tracking-widest text-muted-foreground">Status</p>
              <p className="font-medium text-primary">
                {token.pendingSync ? "Sync pending" : "Live sync active"}
              </p>
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