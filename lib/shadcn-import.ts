import { TOKEN_NAME_MAX_LENGTH } from "@/lib/token-name";
import type { MotionTokenCategory, MotionTokenItem } from "@/lib/tokn-constants";

const KNOWN_SHADCN_COMPONENTS = [
  "accordion",
  "alert",
  "alert-dialog",
  "aspect-ratio",
  "avatar",
  "badge",
  "breadcrumb",
  "button",
  "calendar",
  "card",
  "carousel",
  "chart",
  "checkbox",
  "collapsible",
  "combobox",
  "command",
  "context-menu",
  "dialog",
  "drawer",
  "dropdown-menu",
  "form",
  "hover-card",
  "input",
  "label",
  "menubar",
  "navigation-menu",
  "pagination",
  "popover",
  "progress",
  "radio-group",
  "resizable",
  "scroll-area",
  "select",
  "separator",
  "sheet",
  "skeleton",
  "slider",
  "sonner",
  "switch",
  "table",
  "tabs",
  "textarea",
  "toast",
  "toggle",
  "toggle-group",
  "tooltip",
] as const;

const KNOWN_COMPONENT_SET = new Set<string>(KNOWN_SHADCN_COMPONENTS);

const IMPORT_PATH_REGEX = /@\/components\/ui\/([a-z0-9-]+)/gi;

function normalizeToken(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/["'`,]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseShadcnComponentNames(raw: string): string[] {
  const fromImportPath: string[] = [];
  for (const match of raw.matchAll(IMPORT_PATH_REGEX)) {
    const parsed = normalizeToken(match[1] ?? "");
    if (KNOWN_COMPONENT_SET.has(parsed)) {
      fromImportPath.push(parsed);
    }
  }

  // Parse free-form input (commands, comma lists, snippets) by extracting token-like words.
  const fromWords = (raw.toLowerCase().match(/[a-z0-9-]+/g) ?? [])
    .map((part) => normalizeToken(part))
    .filter((part) => KNOWN_COMPONENT_SET.has(part));

  const ordered = [...fromImportPath, ...fromWords];
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const name of ordered) {
    if (seen.has(name)) continue;
    seen.add(name);
    unique.push(name);
  }
  return unique;
}

function defaultTimedPreset(component: string): {
  category: MotionTokenCategory;
  patch: Partial<MotionTokenItem>;
} {
  if (["dialog", "sheet", "drawer", "popover", "dropdown-menu", "hover-card"].includes(component)) {
    return {
      category: "enter",
      patch: {
        durationMs: 240,
        easing: "ease-out",
        yOffset: 12,
        scaleStart: 0.98,
        opacityStart: 0,
        isSpring: false,
      },
    };
  }

  if (["button", "input", "select", "switch", "tabs", "textarea", "checkbox", "radio-group", "slider", "toggle", "toggle-group"].includes(component)) {
    return {
      category: "feedback",
      patch: {
        durationMs: 170,
        easing: "ease-in-out",
        yOffset: 0,
        scaleStart: 1.02,
        opacityStart: 1,
        isSpring: false,
      },
    };
  }

  if (["toast", "sonner", "alert", "alert-dialog"].includes(component)) {
    return {
      category: "feedback",
      patch: {
        durationMs: 220,
        easing: "ease-out",
        yOffset: 8,
        scaleStart: 0.97,
        opacityStart: 0,
        isSpring: false,
      },
    };
  }

  return {
    category: "enter",
    patch: {
      durationMs: 260,
      easing: "ease-out",
      yOffset: 14,
      scaleStart: 0.99,
      opacityStart: 0,
      isSpring: false,
    },
  };
}

export function createImportedShadcnToken(component: string) {
  const clean = normalizeToken(component);
  const { category, patch } = defaultTimedPreset(clean);
  const descriptor = clean || "component";
  return {
    category,
    descriptor,
    patch,
  };
}

export function nextUniqueTokenName(
  category: MotionTokenCategory,
  descriptor: string,
  taken: Set<string>,
): string {
  const normalizedDescriptor = (normalizeToken(descriptor) || "component").replace(/^[^a-z]+/, "ui-");
  const maxDescriptorLength = TOKEN_NAME_MAX_LENGTH - (category.length + 1);
  const baseDescriptor = normalizedDescriptor.slice(0, Math.max(1, maxDescriptorLength));

  let candidate = `${category}.${baseDescriptor}`;
  let index = 2;
  while (taken.has(candidate)) {
    const suffix = `-${index}`;
    const clipped = baseDescriptor.slice(0, Math.max(1, maxDescriptorLength - suffix.length));
    candidate = `${category}.${clipped}${suffix}`;
    index += 1;
  }

  taken.add(candidate);
  return candidate;
}
