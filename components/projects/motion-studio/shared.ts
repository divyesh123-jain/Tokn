import type { MotionTokenCategory, MotionTokenItem } from "@/lib/tokn-constants";

export type StudioSection = "library" | "physics-lab" | "inspector" | "manifest";

export const EASING_MAP: Record<string, [number, number, number, number]> = {
  "ease-out": [0, 0, 0.58, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
  linear: [0, 0, 1, 1],
  easein: [0.42, 0, 1, 1],
  easeout: [0, 0, 0.58, 1],
  easeinout: [0.42, 0, 0.58, 1],
};

export const EASING_PRESETS = ["ease-out", "ease-in-out", "linear", "ease-in"];

export const FRONTEND_ANIMATION_PRESETS: Array<{
  key: string;
  label: string;
  description: string;
  patch: Partial<MotionTokenItem>;
}> = [
  {
    key: "modal-pop",
    label: "Modal Pop",
    description: "Dialog and popup entrances",
    patch: {
      isSpring: true,
      springStiffness: 230,
      springDamping: 20,
      springMass: 0.9,
      yOffset: 12,
      scaleStart: 0.96,
      opacityStart: 0,
    },
  },
  {
    key: "toast-rise",
    label: "Toast Rise",
    description: "Notifications and alerts",
    patch: {
      isSpring: false,
      durationMs: 220,
      delayMs: 0,
      easing: "ease-out",
      yOffset: 14,
      scaleStart: 0.98,
      opacityStart: 0,
    },
  },
  {
    key: "sheet-slide",
    label: "Sheet Slide",
    description: "Drawers and side sheets",
    patch: {
      isSpring: false,
      durationMs: 260,
      delayMs: 0,
      easing: "ease-in-out",
      yOffset: 0,
      scaleStart: 1,
      opacityStart: 0,
    },
  },
  {
    key: "list-stagger",
    label: "List Stagger",
    description: "Cards, feed and table rows",
    patch: {
      isSpring: false,
      durationMs: 180,
      delayMs: 40,
      easing: "ease-out",
      yOffset: 10,
      scaleStart: 1,
      opacityStart: 0,
    },
  },
  {
    key: "page-transition",
    label: "Page Transition",
    description: "Route and tab switching",
    patch: {
      isSpring: false,
      durationMs: 300,
      delayMs: 0,
      easing: "ease-in-out",
      yOffset: 14,
      scaleStart: 1,
      opacityStart: 0,
    },
  },
  {
    key: "button-press",
    label: "Button Press",
    description: "Button/CTA micro interactions",
    patch: {
      isSpring: true,
      springStiffness: 320,
      springDamping: 24,
      springMass: 0.6,
      yOffset: 0,
      scaleStart: 0.94,
      opacityStart: 1,
    },
  },
];

export function buildAnimationPatchFromPrompt(prompt: string): Partial<MotionTokenItem> {
  const text = prompt.toLowerCase();
  const durationMsMatch = text.match(/(\d+)\s*ms/);
  const durationSMatch = text.match(/(\d+(?:\.\d+)?)\s*s\b/);
  const delayMatch = text.match(/delay\s*(?:of|:|=)?\s*(\d+)\s*ms/);
  const yMatch = text.match(/(?:y|offset|move\s*up|move\s*down)\s*(?:to|:|=)?\s*(-?\d+)/);
  const opacityMatch = text.match(/opacity\s*(?:to|:|=)?\s*(0(?:\.\d+)?|1(?:\.0+)?)/);
  const scaleMatch = text.match(/scale\s*(?:to|:|=)?\s*(0(?:\.\d+)?|1(?:\.\d+)?|2(?:\.0+)?)/);

  const durationMs = durationMsMatch
    ? Number(durationMsMatch[1])
    : durationSMatch
      ? Math.round(Number(durationSMatch[1]) * 1000)
      : text.includes("fast")
        ? 160
        : text.includes("slow")
          ? 420
          : 260;

  const delayMs = delayMatch ? Number(delayMatch[1]) : text.includes("stagger") ? 40 : 0;
  const yOffset = yMatch ? Number(yMatch[1]) : text.includes("slide") ? 14 : 8;
  const opacityStart = opacityMatch ? Number(opacityMatch[1]) : 0;
  const scaleStart = scaleMatch ? Number(scaleMatch[1]) : text.includes("zoom") ? 0.96 : 1;

  const easing = text.includes("linear")
    ? "linear"
    : text.includes("ease in out") || text.includes("ease-in-out")
      ? "ease-in-out"
      : text.includes("ease in") || text.includes("ease-in")
        ? "ease-in"
        : text.includes("ease out") || text.includes("ease-out")
          ? "ease-out"
          : "ease-out";

  const wantsSpring =
    text.includes("spring") ||
    text.includes("bounce") ||
    text.includes("snappy") ||
    text.includes("physics");

  if (wantsSpring) {
    return {
      isSpring: true,
      springStiffness: text.includes("snappy") ? 320 : text.includes("soft") ? 140 : 220,
      springDamping: text.includes("bouncy") ? 14 : text.includes("soft") ? 24 : 20,
      springMass: text.includes("heavy") ? 1.3 : 0.9,
      yOffset,
      scaleStart,
      opacityStart,
      durationMs,
      delayMs,
      easing,
    };
  }

  return {
    isSpring: false,
    durationMs,
    delayMs,
    easing,
    yOffset,
    scaleStart,
    opacityStart,
  };
}

export function normalizeEasing(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, "").replace(/_/g, "-");
}

export function toFramerEasing(raw: string): [number, number, number, number] {
  const normalized = normalizeEasing(raw);
  if (normalized.startsWith("cubic-bezier(")) {
    const nums = raw
      .replace(/cubic-bezier\(|\)/g, "")
      .split(",")
      .map(Number);
    if (nums.length === 4 && nums.every((n) => Number.isFinite(n))) {
      return nums as [number, number, number, number];
    }
    return EASING_MAP["ease-out"];
  }
  return EASING_MAP[normalized] ?? EASING_MAP["ease-out"];
}

export function tokenTransition(t: MotionTokenItem) {
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

export function normalizeTokenNameInput(raw: string, fallbackCategory: MotionTokenCategory) {
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned) return "";

  const [left, ...rest] = cleaned.split(".");
  const hasDot = rest.length > 0;
  const categoryRaw = hasDot ? left : fallbackCategory;
  const descriptorRaw = hasDot ? rest.join(".") : left;

  const category = categoryRaw.replace(/[^a-z0-9]/g, "");
  const descriptor = descriptorRaw
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  const safeCategory = /^[a-z][a-z0-9]*$/.test(category) ? category : fallbackCategory;
  const safeDescriptor = descriptor || "default";

  return `${safeCategory}.${safeDescriptor}`;
}
