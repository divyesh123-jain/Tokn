"use client";

import { cn } from "@/lib/utils";

type ToggleRowProps = {
  label: string;
  enabled: boolean;
  onToggle: (next: boolean) => void;
};

export function ToggleRow({ label, enabled, onToggle }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-foreground">{label}</span>
      <SwitchPill enabled={enabled} onToggle={() => onToggle(!enabled)} />
    </div>
  );
}

type SwitchPillProps = {
  enabled: boolean;
  onToggle: () => void;
};

export function SwitchPill({ enabled, onToggle }: SwitchPillProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      className={cn(
        "relative h-5 w-9 rounded-full border transition",
        enabled ? "border-primary bg-primary" : "border-border bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform",
          enabled ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  disabled?: boolean;
};

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  disabled,
}: SliderProps) {
  const display = step < 1 ? value.toFixed(step < 0.1 ? 2 : 1) : String(value);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
        <span className="rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-foreground">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        onInput={(event) => onChange(Number((event.target as HTMLInputElement).value))}
        disabled={disabled}
        className="pointer-events-auto h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
      />
    </div>
  );
}
