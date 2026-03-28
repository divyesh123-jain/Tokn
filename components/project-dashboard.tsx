"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Share2 } from "lucide-react";

import { MotionStudio } from "@/components/motion-studio";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThemePicker } from "@/components/theme-picker";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/lib/project-store";

export function ProjectDashboard({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const done = () => setHydrated(true);
    if (useProjectStore.persist.hasHydrated()) {
      done();
      return;
    }
    return useProjectStore.persist.onFinishHydration(done);
  }, []);

  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId));

  React.useEffect(() => {
    if (!hydrated) return;
    if (!project) router.replace("/projects");
  }, [hydrated, project, router]);

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!project) {
    return null;
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
          <span className="truncate text-sm font-semibold">{project.name}</span>
          <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-foreground">
            {project.kind === "team" ? "Team" : "Individual"}
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
