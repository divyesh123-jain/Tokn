"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { clearFirstEditTour, readFirstEditTour, writeFirstEditTour } from "@/lib/onboarding-client";
import { cn } from "@/lib/utils";

type FirstEditTourProps = {
  workspaceId: string;
  active: boolean;
  onRequestClose: () => void;
};

const STEPS = [
  {
    title: "Your first token",
    body: "Motion Lab is where you tune tokens and preview them on sample UI. Pick a token on the left to start.",
  },
  {
    title: "Publish",
    body: "Publish creates a versioned snapshot of your motion system and updates the public preview link you can share.",
  },
  {
    title: "Exports",
    body: "After you publish, Export SDK gives you a pinned TypeScript or JSON package you can copy or download for production code.",
  },
] as const;

export function FirstEditTour({ workspaceId, active, onRequestClose }: FirstEditTourProps) {
  const [step, setStep] = React.useState<0 | 1 | 2>(0);

  React.useEffect(() => {
    if (!active) return;
    const saved = readFirstEditTour(workspaceId);
    if (saved) setStep(saved.step);
  }, [active, workspaceId]);

  React.useEffect(() => {
    if (!active) return;
    writeFirstEditTour(workspaceId, { step });
  }, [active, workspaceId, step]);

  React.useEffect(() => {
    if (!active) return;
    const el =
      step === 1
        ? document.getElementById("project-header-publish")
        : step === 2
          ? document.getElementById("project-header-export")
          : null;
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active, step]);

  if (!active) return null;

  const copy = STEPS[step];
  const isLast = step >= 2;

  function dismiss() {
    clearFirstEditTour(workspaceId);
    onRequestClose();
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-end sm:justify-end sm:p-6"
      aria-live="polite"
    >
      <div
        className={cn(
          "pointer-events-auto w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-lg",
          "sm:max-w-sm",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Quick tour {step + 1}/{STEPS.length}
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-sm font-semibold text-foreground">{copy.title}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={dismiss}>
            Finish later
          </Button>
          {!isLast ? (
            <Button type="button" size="sm" onClick={() => setStep((s) => (s < 2 ? ((s + 1) as 0 | 1 | 2) : s))}>
              Next
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                clearFirstEditTour(workspaceId);
                onRequestClose();
              }}
            >
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
