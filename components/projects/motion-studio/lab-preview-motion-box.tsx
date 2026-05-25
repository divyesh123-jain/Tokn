"use client";

import { motion } from "framer-motion";

import type { MotionTokenItem } from "@/lib/tokn-constants";

import { tokenTransition } from "./shared";

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
  if (
    ["modal", "dialog", "sheet", "drawer", "popover", "dropdown-menu", "sidebar", "context-menu", "navigation-menu", "menubar"].some(
      (word) => descriptor.includes(word),
    )
  ) {
    return "modal" as const;
  }
  if (category === "feedback") return "toast" as const;
  if (category === "spring") return "dot" as const;
  if (category === "exit") return "exit" as const;
  return "enter" as const;
}

export function LabPreviewMotionBox({
  token,
  motionKey,
  additiveMotion,
  label,
}: {
  token: MotionTokenItem;
  motionKey: number;
  additiveMotion: boolean;
  label?: string;
}) {
  const previewKind = getPreviewKind(token.name, token.category);

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-3">
      {label ? (
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      ) : null}
      <motion.div
        key={motionKey}
        initial={{
          opacity: additiveMotion ? token.opacityStart : 1,
          y: additiveMotion ? token.yOffset : 0,
          scale: additiveMotion ? token.scaleStart : 1,
        }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={tokenTransition(token)}
        className="flex h-32 w-32 items-center justify-center"
      >
        {previewKind === "button" ? (
          <div className="rounded-md border border-[#4c3dc9]/25 bg-white px-4 py-2 text-[13px] font-semibold text-[#372d89] shadow-[0_10px_24px_-16px_rgba(31,28,86,0.4)]">
            Continue
          </div>
        ) : previewKind === "card" ? (
          <div className="w-28 rounded-lg border border-border bg-white p-3 shadow-[0_16px_30px_-24px_rgba(31,28,86,0.35)]">
            <div className="h-2 w-12 rounded bg-[#4c3dc9]/18" />
            <div className="mt-2 h-1.5 w-18 rounded bg-muted" />
            <div className="mt-1.5 h-1.5 w-14 rounded bg-muted" />
          </div>
        ) : previewKind === "modal" ? (
          <div className="relative h-28 w-32 rounded-xl bg-black/8 p-2">
            <div className="absolute inset-0 rounded-xl bg-black/14 backdrop-blur-[1px]" />
            <div className="relative mx-auto mt-4 w-24 rounded-lg border border-border bg-white p-3 shadow-[0_18px_30px_-24px_rgba(31,28,86,0.45)]">
              <div className="h-2 w-12 rounded bg-[#4c3dc9]/18" />
              <div className="mt-2 h-1.5 w-16 rounded bg-muted" />
            </div>
          </div>
        ) : previewKind === "toast" ? (
          <div className="w-28 rounded-lg border border-[#4c3dc9]/15 bg-[#111827] px-3 py-2 text-left text-[11px] text-white shadow-[0_18px_30px_-22px_rgba(31,28,86,0.65)]">
            <p className="font-semibold">Saved</p>
            <p className="mt-0.5 text-white/70">Your changes were applied.</p>
          </div>
        ) : previewKind === "dot" ? (
          <div className="h-12 w-12 rounded-xl bg-[#4c3dc9]" />
        ) : previewKind === "exit" ? (
          <div className="h-1.5 w-20 rounded-full bg-[#7a7891]" />
        ) : (
          <div className="h-9 w-9 rounded-xl border-2 border-[#4c3dc9] bg-transparent" />
        )}
      </motion.div>
    </div>
  );
}
