"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const STORAGE_KEY = "tokn.accent";
const ACCENTS = [
  { id: "purple", label: "Purple", primary: "#534AB7" },
  { id: "coral", label: "Coral", primary: "#E07B6C" },
  { id: "teal", label: "Teal", primary: "#3BA89E" },
  { id: "amber", label: "Amber", primary: "#D4993D" },
] as const;

type AccentId = (typeof ACCENTS)[number]["id"];

type ThemePickerVariant = "full" | "compact";

export function ThemePicker({
  className,
  variant = "full",
}: {
  className?: string;
  variant?: ThemePickerVariant;
}) {
  const { theme, setTheme } = useTheme();
  const [accent, setAccent] = React.useState<AccentId>("purple");

  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const next = saved && ACCENTS.some((a) => a.id === saved) ? (saved as AccentId) : "purple";
    setAccent(next);
  }, []);

  React.useEffect(() => {
    document.documentElement.dataset.accent = accent;
    localStorage.setItem(STORAGE_KEY, accent);
  }, [accent]);

  function applyAccent(next: AccentId) {
    setAccent(next);
  }

  const isDark = theme === "dark";
  const activeAccent = ACCENTS.find((a) => a.id === accent) ?? ACCENTS[0];

  if (variant === "compact") {
    return (
      <Popover>
        <PopoverTrigger
          type="button"
          aria-label="Theme settings"
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/60 backdrop-blur transition hover:bg-card",
            "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            className,
          )}
        >
          <span
            className="h-3.5 w-3.5 rounded-full"
            style={{ backgroundColor: activeAccent.primary }}
          />
        </PopoverTrigger>

        <PopoverContent className="w-64">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Theme</div>
              <div className="text-xs text-muted-foreground">
                Accent: {activeAccent.label}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label="Toggle dark mode"
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card transition hover:bg-muted",
                "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              )}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {ACCENTS.map((a) => {
              const selected = accent === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  title={a.label}
                  aria-label={`Set ${a.label} accent`}
                  aria-pressed={selected}
                  onClick={() => applyAccent(a.id)}
                  className={cn(
                    "flex items-center justify-center rounded-lg border border-border bg-card transition",
                    selected ? "ring-2 ring-ring/60" : "hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "h-3.5 w-3.5 rounded-full",
                      selected ? "scale-110" : "scale-100",
                    )}
                    style={{ backgroundColor: a.primary }}
                  />
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="rounded-xl border border-border bg-card/60 p-1 backdrop-blur">
        <div className="flex items-center gap-1">
          {ACCENTS.map((a) => {
            const selected = accent === a.id;
            return (
              <button
                key={a.id}
                type="button"
                title={a.label}
                aria-label={`Set ${a.label} theme`}
                aria-pressed={selected}
                onClick={() => applyAccent(a.id)}
                className={cn(
                  "relative inline-flex h-9 w-9 items-center justify-center rounded-lg transition",
                  selected ? "bg-primary/15" : "hover:bg-muted/60",
                )}
              >
                <span
                  className={cn(
                    "h-3.5 w-3.5 rounded-full shadow-[0_0_0_2px_rgba(255,255,255,0.8)]",
                    selected ? "scale-110" : "scale-100",
                  )}
                  style={{ backgroundColor: a.primary }}
                />
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label="Toggle dark mode"
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/60 transition hover:bg-muted",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </div>
  );
}

