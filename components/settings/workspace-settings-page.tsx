"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { scheduleRouterAction } from "@/lib/safe-router";
import { sanitizeWorkspaceSlug } from "@/lib/workspace-slug";
import { workspaceApiFetchInit } from "@/lib/workspace-fetch";
import type { WorkspaceSummary } from "@/lib/workspace-types";

type WorkspaceDetail = WorkspaceSummary;

export function WorkspaceSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [nameDraft, setNameDraft] = useState("");
  const [slugDraft, setSlugDraft] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingSlug, setSavingSlug] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const targetWorkspaceId = searchParams.get("workspaceId");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const listRes = await fetch("/api/workspaces", workspaceApiFetchInit);
      if (listRes.status === 401) {
        scheduleRouterAction(() => router.push("/signin"));
        return;
      }
      const listJson = (await listRes.json().catch(() => null)) as
        | { workspaces?: WorkspaceSummary[] }
        | null;
      const all = listJson?.workspaces ?? [];
      const individual = all.filter((w) => w.kind === "individual");
      if (cancelled) return;
      setWorkspaces(individual);

      const selected =
        individual.find((w) => w.id === targetWorkspaceId) ?? individual[0] ?? null;
      if (!selected) {
        setWorkspace(null);
        setLoading(false);
        return;
      }

      const detailRes = await fetch(`/api/workspaces/${selected.id}`, workspaceApiFetchInit);
      if (detailRes.status === 401) {
        scheduleRouterAction(() => router.push("/signin"));
        return;
      }
      if (!detailRes.ok) {
        toast.error("Could not load workspace settings");
        setLoading(false);
        return;
      }

      const detailJson = (await detailRes.json().catch(() => null)) as
        | { workspace?: WorkspaceDetail }
        | null;
      if (!detailJson?.workspace) {
        setLoading(false);
        return;
      }

      if (cancelled) return;
      setWorkspace(detailJson.workspace);
      setNameDraft(detailJson.workspace.name);
      setSlugDraft(detailJson.workspace.slug);
      setConfirmName("");
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router, targetWorkspaceId]);

  const slugPreview = useMemo(
    () => `${typeof window !== "undefined" ? window.location.origin : "https://tokn.so"}/preview/${sanitizeWorkspaceSlug(slugDraft)}`,
    [slugDraft],
  );

  const canDelete = Boolean(workspace) && confirmName.trim() === (workspace?.name ?? "");

  function switchWorkspace(nextWorkspaceId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("workspaceId", nextWorkspaceId);
    scheduleRouterAction(() => router.replace(`/settings?${params.toString()}`));
  }

  async function saveName() {
    if (!workspace || savingName) return;
    setSavingName(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
        ...workspaceApiFetchInit,
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: nameDraft.trim() }),
      });
      const json = (await res.json().catch(() => null)) as
        | { workspace?: WorkspaceDetail; error?: string }
        | null;
      if (!res.ok || !json?.workspace) {
        toast.error(json?.error ?? "Could not rename workspace");
        return;
      }
      setWorkspace(json.workspace);
      setNameDraft(json.workspace.name);
      toast.success("Workspace renamed");
    } finally {
      setSavingName(false);
    }
  }

  async function saveSlug() {
    if (!workspace || savingSlug) return;
    const normalized = sanitizeWorkspaceSlug(slugDraft);
    if (normalized.length < 2) {
      toast.error("Slug must be at least 2 characters");
      return;
    }
    setSavingSlug(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
        ...workspaceApiFetchInit,
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: normalized }),
      });
      const json = (await res.json().catch(() => null)) as
        | { workspace?: WorkspaceDetail; error?: string }
        | null;
      if (!res.ok || !json?.workspace) {
        toast.error(json?.error ?? "Could not update slug");
        return;
      }
      setWorkspace(json.workspace);
      setSlugDraft(json.workspace.slug);
      toast.success("Workspace slug updated");
    } finally {
      setSavingSlug(false);
    }
  }

  async function deleteWorkspace() {
    if (!workspace || deleting || !canDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
        ...workspaceApiFetchInit,
        method: "DELETE",
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(json?.error ?? "Could not delete workspace");
        return;
      }
      toast.success("Workspace deleted");
      scheduleRouterAction(() => router.push("/projects"));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Settings" description="Manage workspace details and destructive actions.">
        <p className="text-sm text-muted-foreground">Loading workspace settings...</p>
      </AppShell>
    );
  }

  if (!workspace) {
    return (
      <AppShell title="Settings" description="Manage workspace details and destructive actions.">
        <p className="text-sm text-muted-foreground">No individual workspace found.</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Settings" description="Individual workspace configuration.">
      <div className="space-y-4">
        {workspaces.length > 1 ? (
          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold text-foreground">Workspace</h3>
            <p className="mt-1 text-sm text-muted-foreground">Select an individual workspace to configure.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {workspaces.map((item) => (
                <Button
                  key={item.id}
                  variant={item.id === workspace.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => switchWorkspace(item.id)}
                >
                  {item.name}
                </Button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-lg font-semibold text-foreground">Workspace details</h3>
          <p className="mt-1 text-sm text-muted-foreground">Rename your workspace.</p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[260px] flex-1 space-y-1.5">
              <Label htmlFor="workspace-name">Workspace name</Label>
              <Input
                id="workspace-name"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="Workspace name"
              />
            </div>
            <Button onClick={() => void saveName()} disabled={savingName}>
              {savingName ? "Saving..." : "Save name"}
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-lg font-semibold text-foreground">Workspace slug</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Change the URL identifier used for public preview links.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[260px] flex-1 space-y-1.5">
              <Label htmlFor="workspace-slug">Slug</Label>
              <Input
                id="workspace-slug"
                value={slugDraft}
                onChange={(e) => setSlugDraft(sanitizeWorkspaceSlug(e.target.value))}
                placeholder="my-motion-system"
              />
              <p className="text-xs text-muted-foreground">Preview URL: {slugPreview}</p>
            </div>
            <Button onClick={() => void saveSlug()} disabled={savingSlug}>
              {savingSlug ? "Saving..." : "Save slug"}
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-red-300 bg-red-50/40 p-5">
          <h3 className="text-lg font-semibold text-red-700">Danger zone</h3>
          <p className="mt-1 text-sm text-red-700/90">
            Delete workspace permanently. This removes all tokens and history.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[280px] flex-1 space-y-1.5">
              <Label htmlFor="delete-confirm">Type workspace name to confirm</Label>
              <Input
                id="delete-confirm"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={workspace.name}
              />
            </div>
            <Button
              variant="destructive"
              onClick={() => void deleteWorkspace()}
              disabled={!canDelete || deleting}
            >
              {deleting ? "Deleting..." : "Delete workspace"}
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
