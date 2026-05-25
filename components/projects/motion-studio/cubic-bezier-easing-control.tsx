"use client";

import { useEffect, useState } from "react";

import { isValidTokenEasingString } from "@/lib/token-easing";
import { cn } from "@/lib/utils";

import { EASING_PRESETS, normalizeEasing } from "./shared";

function parseBezier(raw: string): [number, number, number, number] | null {
  const m = raw.trim().match(/cubic-bezier\(\s*([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(",").map((x) => Number(x.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  return parts as [number, number, number, number];
}

function fmt(n: number) {
  return Number(n.toFixed(3));
}

export function CubicBezierEasingControl({
  easing,
  disabled,
  onChange,
}: {
  easing: string;
  disabled?: boolean;
  onChange: (next: string) => void;
}) {
  const fallback: [number, number, number, number] = [0.42, 0, 0.58, 1];
  const initial = parseBezier(easing) ?? fallback;
  const [x1, setX1] = useState(initial[0]);
  const [y1, setY1] = useState(initial[1]);
  const [x2, setX2] = useState(initial[2]);
  const [y2, setY2] = useState(initial[3]);

  useEffect(() => {
    const p = parseBezier(easing);
    if (p) {
      setX1(p[0]);
      setY1(p[1]);
      setX2(p[2]);
      setY2(p[3]);
    }
  }, [easing]);

  const curve = `M 0 100 C ${x1 * 100} ${(1 - y1) * 100}, ${x2 * 100} ${(1 - y2) * 100}, 100 0`;
  const validCustom = isValidTokenEasingString(easing);
  const isNamedPreset = EASING_PRESETS.some((p) => normalizeEasing(p) === normalizeEasing(easing));

  function applySliders(nx1: number, ny1: number, nx2: number, ny2: number) {
    const s = `cubic-bezier(${fmt(nx1)}, ${fmt(ny1)}, ${fmt(nx2)}, ${fmt(ny2)})`;
    onChange(s);
  }

  return (
    <div className={cn("space-y-2 rounded-lg border border-border bg-muted/40 p-2", disabled && "opacity-50")}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Curve</p>
        {!validCustom && !isNamedPreset ? (
          <span className="text-[10px] font-medium text-red-600">Invalid easing</span>
        ) : (
          <span className="text-[10px] text-muted-foreground">Live CSS</span>
        )}
      </div>
      <svg viewBox="0 0 100 100" className="h-24 w-full overflow-visible rounded border border-border bg-background">
        <line x1="0" y1="100" x2="100" y2="0" stroke="currentColor" className="text-border" strokeWidth="0.5" />
        <path d={curve} fill="none" stroke="currentColor" className="text-primary" strokeWidth="1.5" />
        <circle cx={x1 * 100} cy={(1 - y1) * 100} r="3" className="fill-primary" />
        <circle cx={x2 * 100} cy={(1 - y2) * 100} r="3" className="fill-primary" />
      </svg>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "x1", v: x1, set: setX1, min: 0, max: 1 },
          { label: "y1", v: y1, set: setY1, min: -0.5, max: 1.5 },
          { label: "x2", v: x2, set: setX2, min: 0, max: 1 },
          { label: "y2", v: y2, set: setY2, min: -0.5, max: 1.5 },
        ].map((row) => (
          <label key={row.label} className="flex flex-col gap-0.5">
            <span className="text-[9px] font-semibold uppercase text-muted-foreground">{row.label}</span>
            <input
              type="range"
              min={row.min}
              max={row.max}
              step={0.01}
              value={row.v}
              disabled={disabled}
              onChange={(e) => {
                const nv = Number(e.target.value);
                row.set(nv);
                const nx1 = row.label === "x1" ? nv : x1;
                const ny1 = row.label === "y1" ? nv : y1;
                const nx2 = row.label === "x2" ? nv : x2;
                const ny2 = row.label === "y2" ? nv : y2;
                applySliders(nx1, ny1, nx2, ny2);
              }}
              className="h-1.5 w-full accent-primary"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
