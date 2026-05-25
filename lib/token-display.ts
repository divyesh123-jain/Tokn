import { categoryConfig, type MotionTokenCategory, type MotionTokenItem } from "@/lib/tokn-constants";

export function tokenDescriptorFromName(name: string): string {
  const parts = name.toLowerCase().trim().split(".");
  return parts[1] ?? "";
}

export function humanizeTokenDescriptor(descriptor: string): string {
  const d = descriptor.trim();
  if (!d) return "General";
  return d
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const OVERLAY_HINTS = [
  "dialog",
  "sheet",
  "drawer",
  "popover",
  "dropdown-menu",
  "hover-card",
  "sidebar",
  "context-menu",
  "navigation-menu",
  "menubar",
];
const CONTROL_HINTS = [
  "button",
  "input",
  "select",
  "switch",
  "textarea",
  "checkbox",
  "radio",
  "toggle",
  "slider",
  "tabs",
  "form",
];
const SURFACE_HINTS = ["card", "accordion"];
const NOTIFY_HINTS = ["toast", "sonner", "alert"];

export function inferTokenUiTags(name: string, category: MotionTokenCategory): string[] {
  const d = tokenDescriptorFromName(name);
  const tags = new Set<string>();
  if (OVERLAY_HINTS.some((h) => d.includes(h))) tags.add("Overlay");
  if (CONTROL_HINTS.some((h) => d.includes(h))) tags.add("Control");
  if (SURFACE_HINTS.some((h) => d.includes(h))) tags.add("Surface");
  if (NOTIFY_HINTS.some((h) => d.includes(h))) tags.add("Notification");
  if (tags.size === 0 && (category === "spring" || category === "exit")) {
    tags.add(category === "spring" ? "Spring" : "Exit");
  }
  return [...tags];
}

export function tokenSearchHaystack(token: MotionTokenItem): string {
  const desc = tokenDescriptorFromName(token.name);
  const human = humanizeTokenDescriptor(desc);
  const tags = inferTokenUiTags(token.name, token.category);
  const catLabel = categoryConfig[token.category].label;
  return [
    token.name,
    token.category,
    catLabel,
    desc,
    human,
    ...tags,
    token.easing,
    token.isSpring ? "spring" : "",
    (token.intent ?? "").trim(),
  ]
    .join(" ")
    .toLowerCase();
}

export function tokenMatchesSearch(token: MotionTokenItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return tokenSearchHaystack(token).includes(q);
}
