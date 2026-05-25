"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Box,
  CircleHelp,
  Loader2,
  Sparkles,
  UserRound,
  UsersRound,
  Waves,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MotionPresetLoopDemo } from "@/components/onboarding/motion-preset-loop-demo";
import {
  clearOnboardingWizard,
  readOnboardingWizard,
  writeOnboardingWizard,
} from "@/lib/onboarding-client";
import { workspaceApiFetchInit } from "@/lib/workspace-fetch";
import {
  MOTION_PRESET_LABELS,
  MOTION_PRESETS,
  type MotionPreset,
} from "@/lib/workspace-presets";
import type { WorkspaceKind } from "@/lib/workspace-types";
import { cn } from "@/lib/utils";

type OnboardingFlowProps = {
  initialStep: 1 | 2 | 3;
  initialWorkspaceName: string;
  initialPresetParam?: string;
};

const STEP_COUNT = 3;

const PRESET_SUMMARIES: Record<MotionPreset, string> = {
  "apple-smooth": "Fluid, 80% damping, 1.2s duration",
  "linear-snappy": "Precise, 0% damping, 0.4s duration",
  minimal: "Subtle, 40% damping, 0.8s duration",
};

function parseStep(value: string | undefined): 1 | 2 | 3 {
  const numeric = Number(value ?? "1");
  if (numeric >= 1 && numeric <= STEP_COUNT) {
    return numeric as 1 | 2 | 3;
  }
  return 1;
}

function parsePreset(value: string | undefined): MotionPreset | null {
  if (value && MOTION_PRESETS.includes(value as MotionPreset)) {
    return value as MotionPreset;
  }
  return null;
}

function presetFromParam(value: string | undefined): MotionPreset {
  const p = parsePreset(value);
  return p ?? "minimal";
}

export function OnboardingFlow({
  initialStep,
  initialWorkspaceName,
  initialPresetParam,
}: OnboardingFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = React.useState<1 | 2 | 3>(initialStep);
  const [workspaceName, setWorkspaceName] = React.useState(initialWorkspaceName);
  const [workspaceKind, setWorkspaceKind] = React.useState<WorkspaceKind>("individual");
  const [preset, setPreset] = React.useState<MotionPreset>(() => presetFromParam(initialPresetParam));
  const [creating, setCreating] = React.useState(false);
  const mergedProgressRef = React.useRef(false);

  const persistWizard = React.useCallback(
    (nextStep: 1 | 2 | 3, nextPreset: MotionPreset, name: string) => {
      writeOnboardingWizard({
        step: nextStep,
        workspaceName: name.trim() || initialWorkspaceName,
        preset: nextPreset,
      });
    },
    [initialWorkspaceName],
  );

  const replaceStepInUrl = React.useCallback(
    (nextStep: 1 | 2 | 3, nextPreset?: MotionPreset) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", String(nextStep));
      const resolvedPreset = nextPreset ?? preset;
      params.set("preset", resolvedPreset);
      if (nextPreset) {
        setPreset(nextPreset);
      }
      router.replace(`/onboarding?${params.toString()}`);
      setStep(nextStep);
      persistWizard(nextStep, nextPreset ?? preset, workspaceName);
    },
    [router, searchParams, preset, workspaceName, persistWizard],
  );

  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const fromUrl = parseStep(params.get("step") ?? undefined);
    const presetFromUrl = parsePreset(params.get("preset") ?? undefined);
    if (fromUrl !== step) {
      setStep(fromUrl);
    }
    if (presetFromUrl && presetFromUrl !== preset) {
      setPreset(presetFromUrl);
    }
  }, [preset, searchParams, step]);

  React.useEffect(() => {
    if (mergedProgressRef.current) return;
    mergedProgressRef.current = true;
    const stored = readOnboardingWizard();
    if (!stored) return;
    const params = new URLSearchParams(searchParams.toString());
    const urlStep = parseStep(params.get("step") ?? undefined);
    const urlPreset = parsePreset(params.get("preset") ?? undefined);
    const nextStep = Math.min(3, Math.max(urlStep, stored.step)) as 1 | 2 | 3;
    const nextPreset = urlPreset ?? stored.preset;
    const qs = new URLSearchParams();
    qs.set("step", String(nextStep));
    qs.set("preset", nextPreset);
    if (nextStep !== urlStep || !urlPreset) {
      router.replace(`/onboarding?${qs.toString()}`);
    }
    if (stored.workspaceName?.trim()) {
      setWorkspaceName(stored.workspaceName.trim());
    }
    setPreset(nextPreset);
    setStep(nextStep);
  }, [router, searchParams]);

  function finishLater() {
    persistWizard(step, preset, workspaceName);
    router.push("/projects");
  }

  const isFullscreenStep = step === 1 || step === 2 || step === 3;

  function chooseWorkspaceKind(kind: WorkspaceKind) {
    setWorkspaceKind(kind);
    replaceStepInUrl(3);
  }

  async function createWorkspaceFromOnboarding() {
    if (creating) return;

    setCreating(true);
    try {
      const res = await fetch("/api/workspaces", {
        ...workspaceApiFetchInit,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: workspaceName.trim() || initialWorkspaceName,
          kind: workspaceKind,
          preset,
        }),
      });

      if (res.status === 401) {
        router.replace("/signin");
        return;
      }

      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(json?.error ?? "Could not create workspace");
        return;
      }

      const json = (await res.json().catch(() => null)) as { workspace?: { id: string } } | null;
      const id = json?.workspace?.id;
      if (id) {
        clearOnboardingWizard();
        router.replace(`/projects/${id}?tour=first-edit`);
        return;
      }

      toast.error("Workspace created but response was incomplete. Open Projects from the menu.");
      router.push("/projects");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main
      className={cn(
        "min-h-screen bg-linear-to-b from-muted/20 via-background to-background text-foreground",
        isFullscreenStep ? "px-0 py-0" : "px-4 py-12",
      )}
    >
      <div
        className={cn(
          "w-full",
          isFullscreenStep ? "min-h-screen" : "mx-auto max-w-3xl",
        )}
      >
        {step === 1 ? (
          <section className="relative min-h-screen overflow-hidden bg-background">
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-muted/35 via-background to-background" />

            <header className="relative z-10 flex h-16 items-center justify-between gap-3 px-6 md:px-10">
              <Link href="/" className="inline-flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary font-mono text-[10px] font-medium uppercase tracking-tight text-primary-foreground">
                  tk
                </span>
                <span className="text-lg font-medium tracking-tight text-foreground">tokn</span>
              </Link>
              <button
                type="button"
                onClick={finishLater}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Finish later
              </button>
            </header>

            <div className="relative z-10 flex min-h-[calc(100vh-4rem)] w-full flex-col items-center px-6 pb-8 md:px-10 md:pb-10">

              <div className="mt-14 flex items-center gap-2">
                {[1, 2, 3].map((index) => (
                  <span
                    key={index}
                    className={cn(
                      "h-1 rounded-full transition-all",
                      index === 1 ? "w-9 bg-primary" : "w-9 bg-muted",
                    )}
                  />
                ))}
              </div>

              <div className="mt-14 w-full text-center">
                <h2
                  className="text-balance text-[44px] leading-[1.06] tracking-[-0.02em] text-foreground md:text-[56px]"
                  style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
                >
                  First, let&apos;s name your workspace
                </h2>

                <p className="mx-auto mt-3 max-w-md text-base text-muted-foreground">
                  Your atelier is where your team&apos;s motion logic lives.
                </p>

                <form
                  className="mx-auto mt-8 w-full max-w-md space-y-4 text-left"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (workspaceName.trim().length > 0) {
                      replaceStepInUrl(2);
                    }
                  }}
                >
                  <Input
                    id="workspace-name"
                    value={workspaceName}
                    onChange={(event) => setWorkspaceName(event.target.value)}
                    placeholder="e.g. Acme Design"
                    className="h-12 rounded-none border-border bg-background px-4 text-center text-base placeholder:text-center placeholder:text-muted-foreground/55"
                  />

                  <Button
                    type="submit"
                    disabled={workspaceName.trim().length === 0}
                    className="h-12 w-full cursor-pointer text-base font-medium disabled:cursor-not-allowed"
                  >
                    Create Workspace -&gt;
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    Press <span className="inline-flex h-5 items-center rounded-none border border-border px-1.5 font-mono text-[10px] text-foreground">Enter</span> to continue
                  </p>

                  <div className="flex w-full items-center justify-center gap-14 pt-2 text-primary/50">
                    <Sparkles className="h-4 w-4" />
                    <div className="h-px w-24 bg-border" />
                    <Box className="h-4 w-4" />
                  </div>
                </form>
              </div>
            </div>

           
          </section>
        ) : null}

        {step === 2 ? (
          <section className="relative min-h-screen overflow-hidden bg-background">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-border)_0.8px,transparent_0.8px)] bg-size-[16px_16px] opacity-60" />
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-background/20 via-background/70 to-background" />

            <header className="relative z-10 flex h-16 items-center justify-between gap-3 px-6 md:px-10">
              <Link href="/" className="text-3xl font-semibold tracking-tight text-primary" style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>
                tokn
              </Link>

              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-primary">Onboarding</span>
                <button
                  type="button"
                  onClick={finishLater}
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Finish later
                </button>
              </div>
            </header>

            <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl flex-col px-6 pb-10 pt-12 md:px-10">
              <div className="mx-auto flex items-center gap-2">
                {[1, 2, 3].map((index) => (
                  <span
                    key={index}
                    className={cn(
                      "h-1 rounded-full transition-all",
                      index <= step ? "w-13 bg-primary" : "w-13 bg-muted",
                    )}
                  />
                ))}
              </div>
              <p className="mx-auto mt-3 text-center font-mono text-[10px] tracking-[0.2em] text-muted-foreground">STEP 2 OF {STEP_COUNT}</p>

              <h2
                className="mx-auto mt-10 text-center text-balance text-[52px] leading-[1.06] tracking-[-0.02em] text-primary md:text-[66px]"
                style={{ fontFamily: "var(--font-serif), Georgia, serif", fontStyle: "italic" }}
              >
                How will you be using tokn?
              </h2>

              <div className="mx-auto mt-14 grid w-full max-w-4xl gap-6 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => chooseWorkspaceKind("individual")}
                  className={cn(
                    "group rounded-xl border bg-card p-8 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md",
                    workspaceKind === "individual" ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "border-border",
                  )}
                >
                  <div className="mb-9 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <p className="text-[36px] leading-none tracking-tight text-foreground" style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>
                    Individual project
                  </p>
                  <p className="mt-5 text-base text-muted-foreground">
                    Personal workspace for solo designers.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => chooseWorkspaceKind("team")}
                  className={cn(
                    "group rounded-xl border bg-card p-8 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md",
                    workspaceKind === "team" ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "border-border",
                  )}
                >
                  <div className="mb-9 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <UsersRound className="h-5 w-5" />
                  </div>
                  <p className="text-[36px] leading-none tracking-tight text-foreground" style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>
                    Team workspace
                  </p>
                  <p className="mt-5 text-base text-muted-foreground">
                    Collaborative environment for product teams.
                  </p>
                </button>
              </div>

              <div className="mx-auto mt-auto flex w-full max-w-4xl items-center justify-between pb-2 pt-12">
                <button
                  type="button"
                  onClick={() => replaceStepInUrl(1)}
                  className="inline-flex cursor-pointer items-center gap-2 text-base text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span aria-hidden="true">&lt;</span>
                  <span>Back</span>
                </button>
                <p className="text-sm text-muted-foreground">You can change this later in your workspace settings.</p>
              </div>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="relative min-h-screen overflow-hidden bg-background">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-border)_0.8px,transparent_0.8px)] bg-size-[16px_16px] opacity-50" />
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-background/20 via-background/65 to-background" />

            <header className="relative z-10 flex h-16 items-center justify-between gap-3 px-6 md:px-10">
              <Link href="/" className="text-3xl font-semibold tracking-tight text-primary" style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>
                tokn
              </Link>

              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-primary">Onboarding</span>
                <button
                  type="button"
                  onClick={finishLater}
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Finish later
                </button>
                <button
                  type="button"
                  aria-label="Help"
                  className="rounded-full border border-border bg-background/90 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <CircleHelp className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col px-6 pb-6 pt-8 md:px-10 md:pb-8 md:pt-9">
              <div className="mx-auto flex items-center gap-2">
                {[1, 2, 3].map((index) => (
                  <span
                    key={index}
                    className={cn(
                      "h-1 rounded-full transition-all",
                      index <= step ? "w-13 bg-primary" : "w-13 bg-muted",
                    )}
                  />
                ))}
              </div>
              <p className="mx-auto mt-3 text-center font-mono text-[10px] tracking-[0.2em] text-muted-foreground">STEP 3 OF {STEP_COUNT}</p>

              <h2
                className="mx-auto mt-6 text-center text-balance text-[46px] leading-[1.05] tracking-[-0.02em] text-foreground md:text-[58px]"
                style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
              >
                Choose your motion signature
              </h2>

              <p className="mx-auto mt-3 max-w-2xl text-center text-base text-muted-foreground md:text-lg">
                Same preview motion on each card — pick the curve that matches your product.
              </p>

              <div className="mx-auto mt-8 grid w-full max-w-5xl gap-4 md:grid-cols-3">
                {MOTION_PRESETS.map((option) => {
                  const selected = preset === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => replaceStepInUrl(3, option)}
                      className={cn(
                        "group rounded-xl border bg-card p-5 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md",
                        selected ? "border-primary ring-1 ring-primary/40" : "border-border",
                      )}
                    >
                      <div className="rounded-lg border border-border bg-muted/35 p-4">
                        <div className="mb-3 flex items-center justify-center text-primary/80">
                          {option === "apple-smooth" ? <Sparkles className="h-8 w-8" /> : null}
                          {option === "linear-snappy" ? <ArrowRight className="h-8 w-8" /> : null}
                          {option === "minimal" ? <Waves className="h-8 w-8" /> : null}
                        </div>
                        <MotionPresetLoopDemo preset={option} />
                      </div>

                      <p className={cn("mt-5 text-[32px] leading-none tracking-tight", selected ? "text-primary" : "text-foreground")} style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>
                        {MOTION_PRESET_LABELS[option]}
                      </p>
                      <p className="mt-3 text-sm text-muted-foreground md:text-base">{PRESET_SUMMARIES[option]}</p>

                      <p className={cn("mt-5 text-[10px] font-semibold tracking-[0.16em] uppercase", selected ? "text-primary" : "text-muted-foreground")}>{selected ? "Selected" : "Select Preset"}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mx-auto mt-7 flex w-full max-w-5xl flex-col items-center gap-3">
                <Button
                  onClick={() => void createWorkspaceFromOnboarding()}
                  disabled={creating}
                  className="h-12 min-w-[320px] cursor-pointer text-base font-medium disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating workspace...
                    </>
                  ) : (
                    "Confirm & Generate Tokens"
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => replaceStepInUrl(2)}
                  className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Back to Canvas Settings
                </button>
              </div>
            </div>
          </section>
        ) : null}

      </div>
    </main>
  );
}
