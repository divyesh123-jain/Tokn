"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Settings, Share2, Users } from "lucide-react";
import { toast } from "sonner";

import { MotionStudio } from "@/components/projects/motion-studio";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemePicker } from "@/components/theme/theme-picker";
import {
  hasPendingPatches,
  leaveWorkspaceSession,
  useTokenStore,
} from "@/lib/token-store";
import type { MotionTokenItem } from "@/lib/tokn-constants";
import { scheduleRouterAction } from "@/lib/safe-router";
import { workspaceApiFetchInit } from "@/lib/workspace-fetch";
import { buildWorkspacePreviewSlug } from "@/lib/workspace-slug";
import { cn } from "@/lib/utils";
import type { WorkspaceSummary } from "@/lib/workspace-types";

export function ProjectDashboard({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [workspace, setWorkspace] = React.useState<WorkspaceSummary | null>(null);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [publishMode, setPublishMode] = React.useState<"existing" | "new">("new");
  const [version, setVersion] = React.useState("1.0.0");
  const [publishing, setPublishing] = React.useState(false);
  const tokensHydrating = useTokenStore((s) => s.tokensHydrating);
  const tokens = useTokenStore((s) => s.tokens);
  const canPublish = workspace?.role === "owner";

  const publishState = React.useMemo(() => {
    const active = tokens.filter((t) => !t.deprecated);
    if (active.length === 0) {
      return {
        hasPublished: false,
        isDirty: false,
        currentVersion: null as string | null,
        publishedAtIso: null as string | null,
      };
    }

    const published = active.filter((t) => t.publishedVersion && t.publishedAt);
    if (published.length === 0) {
      return {
        hasPublished: false,
        isDirty: true,
        currentVersion: null as string | null,
        publishedAtIso: null as string | null,
      };
    }

    const latest = [...published].sort((a, b) => {
      const aMs = new Date(a.publishedAt as string).getTime();
      const bMs = new Date(b.publishedAt as string).getTime();
      return bMs - aMs;
    })[0];

    const currentVersion = latest.publishedVersion as string;
    const publishedAtIso = latest.publishedAt as string;
    const publishedAtMs = new Date(publishedAtIso).getTime();

    const isDirty = active.some((token) => {
      if (!token.publishedAt || !token.publishedVersion) return true;
      if (token.publishedVersion !== currentVersion) return true;
      const updatedMs = new Date(token.updatedAt ?? token.publishedAt).getTime();
      if (Number.isNaN(updatedMs)) return true;
      return updatedMs > publishedAtMs;
    });

    return {
      hasPublished: true,
      isDirty,
      currentVersion,
      publishedAtIso,
    };
  }, [tokens]);

  const publishedDateLabel = React.useMemo(() => {
    if (!publishState.publishedAtIso) return "";
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
    }).format(new Date(publishState.publishedAtIso));
  }, [publishState.publishedAtIso]);

  React.useEffect(() => {
    let cancelled = false;

    async function safeJson<T>(res: Response): Promise<T | null> {
      const text = await res.text().catch(() => "");
      if (!text) return null;
      try {
        return JSON.parse(text) as T;
      } catch {
        return null;
      }
    }

    async function run() {
      useTokenStore.setState({
        workspaceId: projectId,
        workspaceRole: null,
        tokensHydrating: true,
        tokens: [],
        selectedId: null,
      });
      const [wRes, tRes] = await Promise.all([
        fetch(`/api/workspaces/${projectId}`, workspaceApiFetchInit),
        fetch(`/api/workspaces/${projectId}/tokens`, workspaceApiFetchInit),
      ]);
      if (cancelled) return;
      if (wRes.status === 401 || tRes.status === 401) {
        scheduleRouterAction(() => router.push("/signin"));
        return;
      }
      if (wRes.status === 404) {
        scheduleRouterAction(() => router.replace("/projects"));
        return;
      }
      if (tRes.status === 403 || tRes.status === 404) {
        scheduleRouterAction(() => router.replace("/projects"));
        return;
      }

      if (!wRes.ok || !tRes.ok) {
        toast.error("Could not load project. Please refresh and try again.");
        scheduleRouterAction(() => router.replace("/projects"));
        return;
      }

      const wJson = await safeJson<{ workspace?: WorkspaceSummary }>(wRes);
      const tJson = await safeJson<{ tokens?: MotionTokenItem[] }>(tRes);
      if (!wJson?.workspace || !Array.isArray(tJson?.tokens)) {
        toast.error("Could not load project data.");
        scheduleRouterAction(() => router.replace("/projects"));
        return;
      }

      const ws = wJson.workspace;
      useTokenStore.getState().setWorkspaceContext(projectId, ws.role);
      useTokenStore.getState().replaceTokens(tJson.tokens, tJson.tokens[0]?.id ?? null);
      setWorkspace(ws);
    }
    void run();
    return () => {
      cancelled = true;
      void leaveWorkspaceSession(projectId);
    };
  }, [projectId, router]);

  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasPendingPatches(projectId)) return;
      e.preventDefault();
      e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [projectId]);

  if (!workspace || tokensHydrating) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 bg-background text-sm text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Loading project…</span>
      </div>
    );
  }

  async function sharePublicPreview() {
    if (!workspace) return;
    const base =
      typeof window !== "undefined" ? window.location.origin : "https://tokn.so";
    const slug = workspace.slug || buildWorkspacePreviewSlug(workspace.name, workspace.id);
    const url = `${base}/preview/${slug}`;
    await navigator.clipboard.writeText(url);
    toast.success("Public preview URL copied");
  }

  async function publishWorkspace() {
    if (!workspace || publishing || workspace.role !== "owner") return;
    setPublishing(true);
    try {
      const body =
        publishMode === "existing"
          ? { mode: "existing" as const }
          : { mode: "new" as const, version };

      const res = await fetch(`/api/workspaces/${workspace.id}/publish`, {
        ...workspaceApiFetchInit,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as
        | { publishedVersion?: string; publishedAt?: string; error?: string }
        | null;
      if (!res.ok || !json?.publishedVersion || !json.publishedAt) {
        toast.error(json?.error ?? "Could not publish this workspace");
        return;
      }

      useTokenStore.setState((state) => ({
        tokens: state.tokens.map((token) =>
          token.deprecated
            ? token
            : {
                ...token,
                pendingSync: false,
                publishedVersion: json.publishedVersion,
                publishedAt: json.publishedAt,
                updatedAt: json.publishedAt,
              },
        ),
      }));

      const base =
        typeof window !== "undefined" ? window.location.origin : "https://tokn.so";
      const slug = workspace.slug || buildWorkspacePreviewSlug(workspace.name, workspace.id);
      const pinnedUrl = `${base}/preview/${slug}/v/${encodeURIComponent(json.publishedVersion)}`;
      await navigator.clipboard.writeText(pinnedUrl);
      toast.success(`Published ${json.publishedVersion}. Pinned URL copied.`);
      setPublishOpen(false);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/projects"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5 px-2")}
          >
            <ArrowLeft className="h-4 w-4" />
            Projects
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="truncate text-sm font-semibold">{workspace.name}</span>
          <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-foreground">
            {workspace.kind === "team" ? "Team" : "Individual"}
          </span>
          <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
            {workspace.role}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {publishState.hasPublished && (!canPublish || !publishState.isDirty) ? (
            <div className="hidden rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground sm:inline-flex">
              Published {publishState.currentVersion}
              {publishedDateLabel ? ` · ${publishedDateLabel}` : ""}
              {!canPublish && publishState.isDirty ? " · pending updates" : ""}
            </div>
          ) : canPublish ? (
            <Button
              variant="default"
              size="sm"
              className="hidden gap-1.5 sm:inline-flex"
              onClick={() => {
                setPublishMode(
                  publishState.hasPublished && publishState.currentVersion ? "existing" : "new",
                );
                if (publishState.currentVersion) {
                  setVersion(publishState.currentVersion.replace(/^v/, ""));
                }
                setPublishOpen(true);
              }}
            >
              {publishState.hasPublished ? "Publish changes" : "Publish"}
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            className="hidden gap-1.5 sm:inline-flex"
            onClick={() => {
              void sharePublicPreview();
            }}
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
          <Link
            href={`/settings?workspaceId=${workspace.id}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "hidden gap-1.5 sm:inline-flex",
            )}
          >
            {workspace.kind === "team" ? (
              <Users className="h-3.5 w-3.5" />
            ) : (
              <Settings className="h-3.5 w-3.5" />
            )}
            {workspace.kind === "team" ? "Team" : "Settings"}
          </Link>
          <ThemePicker variant="compact" />
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <MotionStudio embedded workspaceName={workspace.name} />
      </div>

      <Dialog open={publishOpen && canPublish} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Motion System</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {publishState.hasPublished && publishState.currentVersion ? (
              <div className="space-y-2">
                <Label>Publish target</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={publishMode === "existing" ? "default" : "outline"}
                    onClick={() => setPublishMode("existing")}
                  >
                    Update {publishState.currentVersion}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={publishMode === "new" ? "default" : "outline"}
                    onClick={() => setPublishMode("new")}
                  >
                    Create new version
                  </Button>
                </div>
              </div>
            ) : null}

            {publishMode === "new" ? (
              <div className="space-y-2">
                <Label htmlFor="publish-version">Version</Label>
                <Input
                  id="publish-version"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="1.2.0"
                />
              </div>
            ) : null}

            <p className="text-xs text-muted-foreground">
              Publishing updates public preview metadata and copies the pinned preview URL.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)} disabled={publishing}>
              Cancel
            </Button>
            <Button onClick={() => void publishWorkspace()} disabled={publishing}>
              {publishing ? "Publishing..." : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
