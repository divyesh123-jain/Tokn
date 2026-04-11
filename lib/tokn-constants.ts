export type NavItem = {
  href: string;
  label: string;
  description: string;
};

export type MotionTokenCategory = "enter" | "exit" | "spring" | "feedback";

export type CategoryConfig = {
  label: string;
  color: string;
  bg: string;
};

export const categoryConfig: Record<MotionTokenCategory, CategoryConfig> = {
  enter: { label: "PURPLE", color: "#534AB7", bg: "#EEEDFE" },
  exit: { label: "CORAL", color: "#E07B6C", bg: "#FCE9E6" },
  spring: { label: "TEAL", color: "#3BA89E", bg: "#E5F5F3" },
  feedback: { label: "AMBER", color: "#D4993D", bg: "#FDF3E4" },
};

export type MotionTokenItem = {
  id: string;
  pendingSync: boolean;
  name: string;
  category: MotionTokenCategory;
  durationMs: number;
  delayMs: number;
  easing: string;
  yOffset: number;
  scaleStart: number;
  opacityStart: number;
  isSpring: boolean;
  springStiffness: number;
  springDamping: number;
  springMass: number;
  deprecated: boolean;
  /** ISO 8601 from DB or client when the token last changed */
  updatedAt?: string;
  /** User id of the last editor in team workspaces */
  updatedBy?: string | null;
  /** ISO 8601 from DB when token was last published */
  publishedAt?: string;
  /** Published semantic version tag, for example v1.2.0 */
  publishedVersion?: string;
};

export const SPRING_DEFAULTS = {
  springStiffness: 170,
  springDamping: 26,
  springMass: 1,
};

export const TOKEN_DEFAULTS: Omit<MotionTokenItem, "id"> = {
  pendingSync: false,
  name: "",
  category: "enter",
  durationMs: 300,
  delayMs: 0,
  easing: "ease-out",
  yOffset: 16,
  scaleStart: 1,
  opacityStart: 0,
  isSpring: false,
  ...SPRING_DEFAULTS,
  deprecated: false,
};

const initialMotionTokensBase: Omit<MotionTokenItem, "pendingSync">[] = [
  {
    id: "tok_01",
    name: "enter.default",
    category: "enter",
    durationMs: 300,
    delayMs: 0,
    easing: "ease-out",
    yOffset: 16,
    scaleStart: 1,
    opacityStart: 0,
    isSpring: false,
    springStiffness: 170,
    springDamping: 26,
    springMass: 1,
    deprecated: false,
  },
  {
    id: "tok_02",
    name: "enter.fast",
    category: "enter",
    durationMs: 150,
    delayMs: 0,
    easing: "linear",
    yOffset: 0,
    scaleStart: 1,
    opacityStart: 0,
    isSpring: false,
    springStiffness: 170,
    springDamping: 26,
    springMass: 1,
    deprecated: false,
  },
  {
    id: "tok_03",
    name: "enter.slow",
    category: "enter",
    durationMs: 600,
    delayMs: 0,
    easing: "ease-in-out",
    yOffset: 0,
    scaleStart: 0.9,
    opacityStart: 1,
    isSpring: false,
    springStiffness: 170,
    springDamping: 26,
    springMass: 1,
    deprecated: false,
  },
  {
    id: "tok_04",
    name: "exit.default",
    category: "exit",
    durationMs: 200,
    delayMs: 0,
    easing: "cubic-bezier(0.4, 0, 1, 1)",
    yOffset: -12,
    scaleStart: 1,
    opacityStart: 1,
    isSpring: false,
    springStiffness: 170,
    springDamping: 26,
    springMass: 1,
    deprecated: false,
  },
  {
    id: "tok_05",
    name: "exit.fast",
    category: "exit",
    durationMs: 120,
    delayMs: 0,
    easing: "ease-in",
    yOffset: 0,
    scaleStart: 1,
    opacityStart: 0,
    isSpring: false,
    springStiffness: 170,
    springDamping: 26,
    springMass: 1,
    deprecated: false,
  },
  {
    id: "tok_06",
    name: "spring.bouncy",
    category: "spring",
    durationMs: 300,
    delayMs: 0,
    easing: "ease-out",
    yOffset: 16,
    scaleStart: 1,
    opacityStart: 0,
    isSpring: true,
    springStiffness: 180,
    springDamping: 12,
    springMass: 1,
    deprecated: false,
  },
  {
    id: "tok_07",
    name: "spring.gentle",
    category: "spring",
    durationMs: 300,
    delayMs: 0,
    easing: "ease-out",
    yOffset: 16,
    scaleStart: 1,
    opacityStart: 0,
    isSpring: true,
    springStiffness: 120,
    springDamping: 14,
    springMass: 1.5,
    deprecated: false,
  },
  {
    id: "tok_08",
    name: "spring.snappy",
    category: "spring",
    durationMs: 300,
    delayMs: 0,
    easing: "ease-out",
    yOffset: 16,
    scaleStart: 1,
    opacityStart: 0,
    isSpring: true,
    springStiffness: 300,
    springDamping: 20,
    springMass: 0.5,
    deprecated: false,
  },
  {
    id: "tok_09",
    name: "feedback.success",
    category: "feedback",
    durationMs: 400,
    delayMs: 0,
    easing: "ease-out",
    yOffset: 0,
    scaleStart: 1.05,
    opacityStart: 1,
    isSpring: false,
    springStiffness: 170,
    springDamping: 26,
    springMass: 1,
    deprecated: false,
  },
  {
    id: "tok_10",
    name: "feedback.error",
    category: "feedback",
    durationMs: 300,
    delayMs: 0,
    easing: "ease-out",
    yOffset: 0,
    scaleStart: 1,
    opacityStart: 1,
    isSpring: false,
    springStiffness: 170,
    springDamping: 26,
    springMass: 1,
    deprecated: false,
  },
  {
    id: "tok_11",
    name: "feedback.warning",
    category: "feedback",
    durationMs: 350,
    delayMs: 0,
    easing: "ease-in-out",
    yOffset: 0,
    scaleStart: 1.02,
    opacityStart: 1,
    isSpring: false,
    springStiffness: 170,
    springDamping: 26,
    springMass: 1,
    deprecated: false,
  },
  {
    id: "tok_12",
    name: "feedback.info",
    category: "feedback",
    durationMs: 250,
    delayMs: 0,
    easing: "ease-out",
    yOffset: -4,
    scaleStart: 1,
    opacityStart: 0.9,
    isSpring: false,
    springStiffness: 170,
    springDamping: 26,
    springMass: 1,
    deprecated: false,
  },
];

export const initialMotionTokens: MotionTokenItem[] = initialMotionTokensBase.map(
  (token) => ({ ...token, pendingSync: false }),
);

export const categoryOrder: MotionTokenCategory[] = [
  "enter",
  "exit",
  "spring",
  "feedback",
];

export const appNav: NavItem[] = [
  { href: "/projects", label: "Projects", description: "Your motion libraries and files" },
  { href: "/tokens", label: "Tokens", description: "Define and manage motion primitives" },
  { href: "/preview", label: "Preview Lab", description: "Validate motion on canonical components" },
  { href: "/releases", label: "Releases", description: "Publish, version, and roll back safely" },
  { href: "/settings", label: "Settings", description: "Workspace rules and team preferences" },
];

export const motionCategories = [
  { key: "enter", label: "Enter" },
  { key: "exit", label: "Exit" },
  { key: "spring", label: "Spring" },
  { key: "feedback", label: "Feedback" },
];
