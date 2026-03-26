"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";
import { AccentThemeProvider } from "@/components/accent-theme-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AccentThemeProvider>{children}</AccentThemeProvider>
      <Toaster richColors position="bottom-right" />
    </ThemeProvider>
  );
}
