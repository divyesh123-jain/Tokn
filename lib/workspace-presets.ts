import { initialMotionTokens, type MotionTokenItem } from "@/lib/motif";

export const MOTION_PRESETS = ["apple-smooth", "linear-snappy", "minimal"] as const;

export type MotionPreset = (typeof MOTION_PRESETS)[number];

export const MOTION_PRESET_LABELS: Record<MotionPreset, string> = {
  "apple-smooth": "Apple-smooth",
  "linear-snappy": "Linear-snappy",
  minimal: "Minimal",
};

export const DEFAULT_WORKSPACE_TOKEN_NAMES = [
  "enter.fast",
  "enter.default",
  "enter.slow",
  "exit.fast",
  "exit.default",
  "spring.bouncy",
  "spring.gentle",
  "feedback.success",
] as const;

export const DEFAULT_WORKSPACE_TOKEN_COUNT = DEFAULT_WORKSPACE_TOKEN_NAMES.length;

type SeedableToken = Omit<MotionTokenItem, "id" | "pendingSync" | "updatedAt">;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function stripRuntimeFields(token: MotionTokenItem): SeedableToken {
  const { id: _id, pendingSync: _pendingSync, updatedAt: _updatedAt, ...rest } = token;
  return rest;
}

function applyAppleSmoothPreset(token: SeedableToken): SeedableToken {
  if (token.isSpring) {
    return {
      ...token,
      springStiffness: Math.round(token.springStiffness * 0.85),
      springDamping: Math.round(token.springDamping * 1.25),
      springMass: Number((token.springMass * 1.2).toFixed(2)),
    };
  }

  return {
    ...token,
    durationMs: Math.round(token.durationMs * 1.2),
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  };
}

function applyLinearSnappyPreset(token: SeedableToken): SeedableToken {
  if (token.isSpring) {
    return {
      ...token,
      springStiffness: Math.round(token.springStiffness * 1.5),
      springDamping: Math.round(token.springDamping * 0.85),
      springMass: Number((token.springMass * 0.8).toFixed(2)),
    };
  }

  return {
    ...token,
    durationMs: clamp(Math.round(token.durationMs * 0.75), 90, 500),
    easing: "linear",
  };
}

function applyMotionPreset(token: SeedableToken, preset: MotionPreset): SeedableToken {
  if (preset === "apple-smooth") {
    return applyAppleSmoothPreset(token);
  }
  if (preset === "linear-snappy") {
    return applyLinearSnappyPreset(token);
  }
  return token;
}

export function seedDefaultWorkspaceTokens(preset: MotionPreset): SeedableToken[] {
  const defaultTokenNames = new Set<string>(DEFAULT_WORKSPACE_TOKEN_NAMES);

  return initialMotionTokens
    .filter((token) => defaultTokenNames.has(token.name))
    .map(stripRuntimeFields)
    .map((token) => applyMotionPreset(token, preset));
}
