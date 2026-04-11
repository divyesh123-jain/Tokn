"use client";

import { type FormEvent, useMemo, useState } from "react";

import {
  initialMotionTokens,
  motionCategories,
  type MotionTokenItem,
  type MotionTokenCategory,
  categoryConfig,
  TOKEN_DEFAULTS,
} from "@/lib/tokn-constants";

type DraftToken = Omit<MotionTokenItem, "id">;

export function TokenEditor() {
  const [tokens, setTokens] = useState<MotionTokenItem[]>(initialMotionTokens);
  const [draft, setDraft] = useState<DraftToken>({ ...TOKEN_DEFAULTS });
  const [editingId, setEditingId] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => draft.name.trim().length > 0,
    [draft.name],
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    if (editingId) {
      setTokens((cur) =>
        cur.map((t) => (t.id === editingId ? { ...t, ...draft } : t)),
      );
      setEditingId(null);
      setDraft({ ...TOKEN_DEFAULTS });
      return;
    }

    setTokens((cur) => [...cur, { id: crypto.randomUUID(), ...draft }]);
    setDraft({ ...TOKEN_DEFAULTS });
  }

  function handleEdit(token: MotionTokenItem) {
    setEditingId(token.id);
    const { id, ...rest } = token;
    setDraft(rest);
  }

  function handleDelete(id: string) {
    setTokens((cur) => cur.filter((t) => t.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setDraft({ ...TOKEN_DEFAULTS });
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({ ...TOKEN_DEFAULTS });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <form
        onSubmit={handleSubmit}
        className="h-fit rounded-xl border border-border bg-card p-5"
      >
        <h3 className="text-lg font-semibold text-foreground">
          {editingId ? "Edit Token" : "Create Token"}
        </h3>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs text-muted-foreground">Token name</span>
            <input
              value={draft.name}
              onChange={(e) =>
                setDraft((d) => ({ ...d, name: e.target.value }))
              }
              placeholder="enter.default"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs text-muted-foreground">Category</span>
            <select
              value={draft.category}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  category: e.target.value as MotionTokenCategory,
                }))
              }
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
            >
              {motionCategories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-muted-foreground">
                Duration (ms)
              </span>
              <input
                type="number"
                value={draft.durationMs}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    durationMs: Number(e.target.value),
                  }))
                }
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Easing</span>
              <input
                value={draft.easing}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, easing: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs text-muted-foreground">Y Offset</span>
              <input
                type="number"
                value={draft.yOffset}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    yOffset: Number(e.target.value),
                  }))
                }
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Scale</span>
              <input
                type="number"
                step="0.01"
                value={draft.scaleStart}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    scaleStart: Number(e.target.value),
                  }))
                }
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Opacity</span>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={draft.opacityStart}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    opacityStart: Number(e.target.value),
                  }))
                }
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {editingId ? "Save changes" : "Add token"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <section className="space-y-3">
        {tokens.map((token) => {
          const cfg = categoryConfig[token.category];
          return (
            <article
              key={token.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-sm text-primary">{token.name}</p>
                <span
                  className="rounded px-2 py-0.5 text-[10px] font-bold"
                  style={{ backgroundColor: cfg.bg, color: cfg.color }}
                >
                  {cfg.label}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs text-muted-foreground md:grid-cols-4">
                <p>duration: {token.durationMs}ms</p>
                <p>easing: {token.easing}</p>
                <p>y: {token.yOffset}px</p>
                <p>
                  scale: {token.scaleStart} / op: {token.opacityStart}
                </p>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(token)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(token.id)}
                  className="rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-500"
                >
                  Delete
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
