"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Share2 } from "lucide-react";
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
import type { MotionTokenItem } from "@/lib/motif";
import { scheduleRouterAction } from "@/lib/safe-router";
import { workspaceApiFetchInit } from "@/lib/workspace-fetch";
import { buildWorkspacePreviewSlug } from "@/lib/workspace-slug";
import { cn } from "@/lib/utils";
import type { WorkspaceSummary } from "@/lib/workspace-types";

export function ProjectDashboard({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [workspace, setWorkspace] = React.useState<WorkspaceSummary | null>(null);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [version, setVersion] = React.useState("1.0.0");
  const [publishing, setPublishing] = React.useState(false);
  const tokensHydrating = useTokenStore((s) => s.tokensHydrating);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      useTokenStore.setState({
        workspaceId: projectId,
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
      const wJson = (await wRes.json()) as { workspace?: WorkspaceSummary };
      const tJson = (await tRes.json()) as { tokens: MotionTokenItem[] };
      if (!wJson.workspace) {
        scheduleRouterAction(() => router.replace("/projects"));
        return;
      }
      const ws = wJson.workspace;
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
    const slug = buildWorkspacePreviewSlug(workspace.name, workspace.id);
    const url = `${base}/preview/${slug}`;
    await navigator.clipboard.writeText(url);
    toast.success("Public preview URL copied");
  }

  async function publishWorkspace() {
    if (!workspace || publishing) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/publish`, {
        ...workspaceApiFetchInit,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ version }),
      });
      const json = (await res.json().catch(() => null)) as
        | { publishedVersion?: string; error?: string }
        | null;
      if (!res.ok || !json?.publishedVersion) {
        toast.error(json?.error ?? "Could not publish this workspace");
        return;
      }

      const base =
        typeof window !== "undefined" ? window.location.origin : "https://tokn.so";
      const slug = buildWorkspacePreviewSlug(workspace.name, workspace.id);
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
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="hidden gap-1.5 sm:inline-flex"
            onClick={() => setPublishOpen(true)}
          >
            Publish
          </Button>
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
          <ThemePicker variant="compact" />
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <MotionStudio embedded />
      </div>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Motion System</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="publish-version">Version</Label>
            <Input
              id="publish-version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.2.0"
            />
            <p className="text-xs text-muted-foreground">
              Publishing sets the public version badge and enables pinned preview URLs.
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
