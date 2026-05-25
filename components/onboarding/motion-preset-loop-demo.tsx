"use client";

import { motion } from "framer-motion";

import type { MotionPreset } from "@/lib/workspace-presets";
import { cn } from "@/lib/utils";

function loopTransition(preset: MotionPreset) {
  if (preset === "apple-smooth") {
    return {
      duration: 2.4,
      repeat: Infinity,
      ease: [0.22, 1, 0.36, 1] as const,
      repeatType: "mirror" as const,
    };
  }
  if (preset === "linear-snappy") {
    return {
      duration: 0.85,
      repeat: Infinity,
      ease: "linear" as const,
      repeatType: "mirror" as const,
    };
  }
  return {
    duration: 1.6,
    repeat: Infinity,
    ease: [0.4, 0, 0.2, 1] as const,
    repeatType: "mirror" as const,
  };
}

export function MotionPresetLoopDemo({
  preset,
  className,
  compact,
}: {
  preset: MotionPreset;
  className?: string;
  compact?: boolean;
}) {
  const w = compact ? 72 : 100;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border border-border/80 bg-muted/40",
        compact ? "h-10" : "h-12",
        className,
      )}
    >
      <motion.div
        key={preset}
        className="absolute left-1 top-1/2 h-5 w-5 -translate-y-1/2 rounded-sm bg-primary shadow-sm"
        initial={{ x: 0 }}
        animate={{ x: w - 12 }}
        transition={loopTransition(preset)}
      />
    </div>
  );
}
