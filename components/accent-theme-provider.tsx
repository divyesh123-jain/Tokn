"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

const STORAGE_KEY = "tokn.accent";
const DEFAULT_ACCENT = "purple";
const ACCENTS = ["purple", "coral", "teal", "amber"] as const;
type AccentId = (typeof ACCENTS)[number];

export function AccentThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const accent = saved && (ACCENTS as readonly string[]).includes(saved)
      ? (saved as AccentId)
      : (DEFAULT_ACCENT as AccentId);

    document.documentElement.dataset.accent = accent;
  }, []);

  return <>{children}</>;
}

