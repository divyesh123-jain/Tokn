import type { MotionPreset } from "@/lib/workspace-presets";

const WIZARD_KEY = "tokn:onboarding-wizard:v1";
const FIRST_EDIT_KEY_PREFIX = "tokn:first-edit-tour:";

export type OnboardingWizardState = {
  step: 1 | 2 | 3;
  workspaceName: string;
  preset: MotionPreset;
};

export function readOnboardingWizard(): OnboardingWizardState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WIZARD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnboardingWizardState>;
    if (parsed.step !== 1 && parsed.step !== 2 && parsed.step !== 3) return null;
    const preset =
      parsed.preset === "apple-smooth" || parsed.preset === "linear-snappy" || parsed.preset === "minimal"
        ? parsed.preset
        : "minimal";
    return {
      step: parsed.step,
      workspaceName: typeof parsed.workspaceName === "string" ? parsed.workspaceName : "",
      preset,
    };
  } catch {
    return null;
  }
}

export function writeOnboardingWizard(state: OnboardingWizardState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WIZARD_KEY, JSON.stringify(state));
  } catch {}
}

export function clearOnboardingWizard() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(WIZARD_KEY);
  } catch {}
}

export type FirstEditTourState = {
  step: 0 | 1 | 2;
};

export function readFirstEditTour(workspaceId: string): FirstEditTourState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(FIRST_EDIT_KEY_PREFIX + workspaceId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { step?: number };
    if (parsed.step !== 0 && parsed.step !== 1 && parsed.step !== 2) return null;
    return { step: parsed.step as 0 | 1 | 2 };
  } catch {
    return null;
  }
}

export function writeFirstEditTour(workspaceId: string, state: FirstEditTourState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FIRST_EDIT_KEY_PREFIX + workspaceId, JSON.stringify(state));
  } catch {}
}

export function clearFirstEditTour(workspaceId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(FIRST_EDIT_KEY_PREFIX + workspaceId);
  } catch {}
}
