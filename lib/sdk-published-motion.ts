import type { MotionTokenCategory, MotionTokenItem } from "@/lib/tokn-constants";

type SdkSpringTransition = { type: "spring"; stiffness: number; damping: number; mass: number };
type SdkTimingTransition = {
  type: "timing" | "timed";
  durationMs: number;
  delayMs: number;
  easing: string;
};

type SdkTransition = SdkSpringTransition | SdkTimingTransition | Record<string, unknown>;

export type SdkTokenJson = {
  name: string;
  category: MotionTokenCategory;
  deprecated: boolean;
  initial: { opacity: number; y: number; scale: number };
  transition: SdkTransition;
};

export type WorkspaceSdkSnapshot = {
  version?: string;
  tokens: Record<string, SdkTokenJson>;
};

export function parseWorkspaceSdkSnapshotJson(raw: string): WorkspaceSdkSnapshot | null {
  try {
    const data = JSON.parse(raw) as { tokens?: unknown; version?: string };
    if (!data.tokens || typeof data.tokens !== "object") return null;
    return {
      version: typeof data.version === "string" ? data.version : undefined,
      tokens: data.tokens as Record<string, SdkTokenJson>,
    };
  } catch {
    return null;
  }
}

export function sdkTokenJsonToMotionPatch(sdk: SdkTokenJson): Partial<MotionTokenItem> {
  const initial = sdk.initial ?? { opacity: 0, y: 0, scale: 1 };
  const y = typeof initial.y === "number" ? initial.y : 0;
  const patch: Partial<MotionTokenItem> = {
    category: sdk.category,
    deprecated: Boolean(sdk.deprecated),
    opacityStart: typeof initial.opacity === "number" ? initial.opacity : 0,
    yOffset: y,
    scaleStart: typeof initial.scale === "number" ? initial.scale : 1,
  };

  const tr = sdk.transition;
  if (!tr || typeof tr !== "object" || !("type" in tr)) return patch;

  if (tr.type === "spring") {
    const s = tr as SdkSpringTransition;
    return {
      ...patch,
      isSpring: true,
      springStiffness: s.stiffness,
      springDamping: s.damping,
      springMass: s.mass,
    };
  }

  if (tr.type === "timing" || tr.type === "timed") {
    const t = tr as SdkTimingTransition;
    return {
      ...patch,
      isSpring: false,
      durationMs: t.durationMs,
      delayMs: t.delayMs,
      easing: t.easing,
    };
  }

  return patch;
}
