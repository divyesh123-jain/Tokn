"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

export function ToknLandingReveal({ children }: { children: ReactNode }) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12 },
    );

    for (const el of els) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <>{children}</>;
}

