"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { MotionTokenItem } from "@/lib/tokn-constants";
import { getTokenNameValidationError } from "@/lib/token-name";
import { useSelectedToken, useTokenStore } from "@/lib/token-store";
import {
  deleteTokenAction,
  duplicateTokenAction,
  revertTokenToPublishedMotionAction,
  saveTokenNameAction,
} from "@/lib/token-actions";
import { cn } from "@/lib/utils";

import {
  buildAnimationPatchFromPrompt,
  EASING_PRESETS,
  FRONTEND_ANIMATION_PRESETS,
  normalizeEasing,
  normalizeTokenNameInput,
  toFramerEasing,
} from "./shared";
import { CubicBezierEasingControl } from "./cubic-bezier-easing-control";
import { isValidTokenEasingString } from "@/lib/token-easing";
import { Slider, SwitchPill, ToggleRow } from "./ui-controls";

type PropertiesPanelProps = {
  additiveMotion: boolean;
  setAdditiveMotion: (next: boolean) => void;
  relativeUnits: boolean;
  setRelativeUnits: (next: boolean) => void;
};

export function PropertiesPanel({
  additiveMotion,
  setAdditiveMotion,
  relativeUnits,
  setRelativeUnits,
}: PropertiesPanelProps) {
  const {
    tokens,
    workspaceRole,
    updateToken,
    nameFocusTargetId,
    nameFocusSelectAll,
    clearNameFocusRequest,
  } = useTokenStore();

  const token = useSelectedToken();
  const canEditTokens = workspaceRole === "owner" || workspaceRole === "editor";
  const [nameDraft, setNameDraft] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [customApplying, setCustomApplying] = useState(false);
  const [intentDraft, setIntentDraft] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (token) setIntentDraft(token.intent ?? "");
  }, [token?.id, token?.intent]);

  useEffect(() => {
    if (token) setNameDraft(token.name);
  }, [token]);

  const normalizedNameDraft = useMemo(() => {
    if (!token) return "";
    return normalizeTokenNameInput(nameDraft, token.category);
  }, [token, nameDraft]);

  const nameConflict = useMemo(() => {
    if (!token || !normalizedNameDraft) return false;
    const next = normalizedNameDraft;
    return tokens.some((t) => t.id !== token.id && t.name === next);
  }, [tokens, token, normalizedNameDraft]);

  const nameDirty = !!token && normalizedNameDraft !== (token.name || "").trim();
  const nameValidationError = useMemo(() => {
    if (!normalizedNameDraft) return null;
    return getTokenNameValidationError(normalizedNameDraft);
  }, [normalizedNameDraft]);

  useEffect(() => {
    if (!token || !nameInputRef.current) return;
    if (token.name === "") {
      nameInputRef.current.focus();
      return;
    }
    if (nameFocusTargetId === token.id) {
      nameInputRef.current.focus();
      if (nameFocusSelectAll) {
        nameInputRef.current.select();
      }
      clearNameFocusRequest();
    }
  }, [token, nameFocusTargetId, nameFocusSelectAll, clearNameFocusRequest]);

  if (!token) {
    return (
      <aside className="flex w-[320px] shrink-0 items-center justify-center bg-muted/30 p-5">
        <p className="text-xs text-muted-foreground">No token selected</p>
      </aside>
    );
  }

  const tokenId = token.id;

  function update(patch: Partial<MotionTokenItem>) {
    if (!canEditTokens) return;
    updateToken(tokenId, patch);
  }

  async function commitTokenName() {
    if (!canEditTokens) return;
    if (!token || !nameDirty) return;
    const nextName = normalizeTokenNameInput(nameDraft, token.category);
    const validationError = getTokenNameValidationError(nextName);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (nameConflict) {
      toast.error("Token name already exists");
      return;
    }

    setNameDraft(nextName);
    setNameSaving(true);
    try {
      await saveTokenNameAction(tokenId, nextName);
      toast.success("Name saved");
    } catch {
      // saveTokenNameAction already shows a toast for validation/server errors.
    } finally {
      setNameSaving(false);
    }
  }

  function applyFrontendPreset(patch: Partial<MotionTokenItem>) {
    update(patch);
    toast.success("Preset applied");
  }

  async function applyCustomAnimationPrompt() {
    if (!canEditTokens) return;
    const prompt = customPrompt.trim();
    if (!prompt) {
      toast.error("Add animation requirements first");
      return;
    }

    setCustomApplying(true);
    try {
      const patch = buildAnimationPatchFromPrompt(prompt);
      update(patch);
      setCustomOpen(false);
      setCustomPrompt("");
      toast.success("Custom animation created");
    } finally {
      setCustomApplying(false);
    }
  }

  return (
    <aside className="flex w-[320px] shrink-0 flex-col overflow-auto bg-muted/30 p-6">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Draft alpha</p>
        <span className="text-[11px] font-semibold text-primary">Inspector</span>
      </div>

      <div className="mb-5">
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Token</label>
        <div className="flex gap-2">
          <Input
            ref={nameInputRef}
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={() => {
              if (!token) return;
              setNameDraft(normalizeTokenNameInput(nameDraft, token.category));
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void commitTokenName();
              }
            }}
            disabled={!canEditTokens}
            className={cn(
              "h-9 rounded-md border bg-background px-2.5 font-mono text-xs",
              nameConflict ? "border-red-400" : "border-border",
            )}
          />
          <Button
            type="button"
            onClick={() => void commitTokenName()}
            disabled={!canEditTokens || !nameDirty || nameConflict || nameSaving}
            className="h-9 rounded-md bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90"
          >
            {nameSaving ? "..." : "Save"}
          </Button>
        </div>
        {nameValidationError ? (
          <p className="mt-1 text-[10px] text-red-600">{nameValidationError}</p>
        ) : null}
        {!nameValidationError && nameConflict ? (
          <p className="mt-1 text-[10px] text-red-600">Name already exists</p>
        ) : null}
        <p className="mt-1 text-[10px] text-muted-foreground">Format: category.descriptor (e.g. enter.default)</p>
      </div>

      <div className="mb-5">
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Intent
        </label>
        <Textarea
          value={intentDraft}
          onChange={(event) => setIntentDraft(event.target.value)}
          onBlur={() => {
            const next = intentDraft.trim();
            if (next !== (token.intent ?? "").trim()) update({ intent: next });
          }}
          disabled={!canEditTokens}
          rows={3}
          placeholder="Why this token exists — for your team and reviewers."
          className="resize-none bg-background text-xs"
        />
      </div>

      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Animation Presets</p>
        <p className="mb-3 text-[11px] text-muted-foreground">6 trending presets used in modern product interfaces.</p>
        <div className="grid grid-cols-2 gap-2">
          {FRONTEND_ANIMATION_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => applyFrontendPreset(preset.patch)}
              disabled={!canEditTokens}
              className="rounded-lg border border-border bg-background px-2.5 py-2 text-left transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              <p className="text-[11px] font-semibold text-foreground">{preset.label}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{preset.description}</p>
            </button>
          ))}
        </div>
        <Button
          type="button"
          onClick={() => setCustomOpen(true)}
          disabled={!canEditTokens}
          className="mt-3 h-8 w-full rounded-md bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Add Custom Animation
        </Button>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Spring mode</p>
        <SwitchPill enabled={token.isSpring} onToggle={() => update({ isSpring: !token.isSpring })} />
      </div>

      <div className="space-y-4">
        <Slider
          label="Mass"
          value={token.springMass}
          min={0.1}
          max={10}
          step={0.1}
          onChange={(value) => update({ springMass: value })}
          disabled={!canEditTokens}
        />
        <Slider
          label="Damping"
          value={token.springDamping}
          min={1}
          max={100}
          step={1}
          onChange={(value) => update({ springDamping: value })}
          disabled={!canEditTokens}
        />
        <Slider
          label="Stiffness"
          value={token.springStiffness}
          min={1}
          max={500}
          step={1}
          onChange={(value) => update({ springStiffness: value })}
          disabled={!canEditTokens}
        />
        <Slider
          label="Duration (ms)"
          value={token.durationMs}
          min={0}
          max={1000}
          step={10}
          onChange={(value) => update({ durationMs: value })}
          disabled={!canEditTokens}
        />
        <Slider
          label="Delay (ms)"
          value={token.delayMs}
          min={0}
          max={500}
          step={10}
          onChange={(value) => update({ delayMs: value })}
          disabled={!canEditTokens}
        />
        <Slider
          label="Y Offset"
          value={token.yOffset}
          min={-120}
          max={120}
          step={1}
          onChange={(value) => update({ yOffset: value })}
          disabled={!canEditTokens}
        />
        <Slider
          label="Scale"
          value={token.scaleStart}
          min={0.5}
          max={1.5}
          step={0.01}
          onChange={(value) => update({ scaleStart: value })}
          disabled={!canEditTokens}
        />
        <Slider
          label="Opacity"
          value={token.opacityStart}
          min={0}
          max={1}
          step={0.05}
          onChange={(value) => update({ opacityStart: value })}
          disabled={!canEditTokens}
        />
      </div>

      <div className="mt-5 rounded-xl border border-border bg-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Easing</p>
          {token.isSpring ? <span className="text-[10px] text-muted-foreground">Switch to timing to use easing</span> : null}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {EASING_PRESETS.map((preset) => (
            <Button
              key={preset}
              type="button"
              variant="ghost"
              onClick={() => update({ isSpring: false, easing: preset })}
              className={cn(
                "h-7 rounded-md px-2 text-[11px] font-semibold",
                normalizeEasing(token.easing) === normalizeEasing(preset) && !token.isSpring
                  ? "bg-accent text-accent-foreground hover:bg-accent"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {preset}
            </Button>
          ))}
        </div>
        {!token.isSpring ? (
          <>
            <Button
              type="button"
              variant="secondary"
              className="mt-2 h-7 w-full text-[10px]"
              disabled={!canEditTokens}
              onClick={() => {
                const [a, b, c, d] = toFramerEasing(token.easing);
                update({ isSpring: false, easing: `cubic-bezier(${a}, ${b}, ${c}, ${d})` });
              }}
            >
              Edit as cubic-bezier curve
            </Button>
            {token.easing.trim().toLowerCase().startsWith("cubic-bezier") ? (
              <div className="mt-2">
                <CubicBezierEasingControl
                  easing={token.easing}
                  disabled={!canEditTokens}
                  onChange={(easing) => update({ isSpring: false, easing })}
                />
              </div>
            ) : null}
            <Input
              value={token.easing}
              onChange={(event) => update({ isSpring: false, easing: event.target.value })}
              placeholder="easing or cubic-bezier(...)"
              disabled={!canEditTokens}
              className={cn(
                "mt-2 h-8 rounded-md bg-background px-2 font-mono text-[10px]",
                !token.isSpring && !isValidTokenEasingString(token.easing)
                  ? "border border-red-500"
                  : "border border-border",
              )}
            />
          </>
        ) : null}
      </div>

      {token.publishedVersion ? (
        <div className="mt-4">
          <Button
            type="button"
            variant="secondary"
            className="h-8 w-full text-xs"
            disabled={!canEditTokens}
            onClick={() => void revertTokenToPublishedMotionAction(token.id)}
          >
            Revert motion to latest release
          </Button>
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        <ToggleRow label="Additive Motion" enabled={additiveMotion} onToggle={setAdditiveMotion} />
        <ToggleRow label="Relative Units" enabled={relativeUnits} onToggle={setRelativeUnits} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => void duplicateTokenAction(token.id)}
          disabled={!canEditTokens}
          className="h-9 rounded-md border border-border bg-background text-xs font-medium text-foreground hover:bg-muted"
        >
          <Copy className="mr-1.5 h-3.5 w-3.5" />
          Duplicate
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => void deleteTokenAction(token.id)}
          disabled={!canEditTokens}
          className="h-9 rounded-md border border-destructive/30 bg-destructive/10 text-xs font-medium text-destructive hover:bg-destructive/20"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
      </div>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Animation</DialogTitle>
            <DialogDescription>
              Describe what you want, for example: &quot;smooth page transition, ease-in-out, 320ms, slight upward motion&quot;.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Animation Requirements</label>
            <Textarea
              value={customPrompt}
              onChange={(event) => setCustomPrompt(event.target.value)}
              placeholder="e.g. snappy modal pop with spring bounce, 240ms, no delay"
              className="min-h-24 bg-background"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                void applyCustomAnimationPrompt();
              }}
              disabled={customApplying || !canEditTokens}
            >
              {customApplying ? "Creating..." : "Create Animation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
