"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Share2 } from "lucide-react";

import { MotionStudio } from "@/components/projects/motion-studio";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThemePicker } from "@/components/theme/theme-picker";
import {
  hasPendingPatches,
  leaveWorkspaceSession,
  useTokenStore,
} from "@/lib/token-store";
import type { MotionTokenItem } from "@/lib/motif";
import { scheduleRouterAction } from "@/lib/safe-router";
import { workspaceApiFetchInit } from "@/lib/workspace-fetch";
import { cn } from "@/lib/utils";
import type { WorkspaceSummary } from "@/lib/workspace-types";

export function ProjectDashboard({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [workspace, setWorkspace] = React.useState<WorkspaceSummary | null>(null);
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
          <Button variant="outline" size="sm" className="hidden gap-1.5 sm:inline-flex">
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
          <ThemePicker variant="compact" />
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <MotionStudio embedded />
      </div>
    </div>
  );
}
