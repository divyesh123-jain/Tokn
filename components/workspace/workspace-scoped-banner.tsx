"use client";

import { AlertTriangle } from "lucide-react";

import { WorkspaceIdentityBadge } from "@/components/workspace/workspace-identity-badge";
import type { WorkspaceSummary } from "@/lib/workspace-types";
import { cn } from "@/lib/utils";

type WorkspaceScopedBannerProps = {
  workspace: Pick<WorkspaceSummary, "name" | "slug" | "kind" | "role">;
  actionLabel: string;
  variant?: "default" | "destructive";
  className?: string;
};

export function WorkspaceScopedBanner({
  workspace,
  actionLabel,
  variant = "default",
  className,
}: WorkspaceScopedBannerProps) {
  const destructive = variant === "destructive";

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5",
        destructive
          ? "border-destructive/40 bg-destructive/5"
          : "border-primary/30 bg-primary/5",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        {destructive ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
        ) : null}
        <div className="min-w-0 flex-1 space-y-1">
          <p className={cn("text-xs font-medium", destructive ? "text-destructive" : "text-foreground")}>
            {actionLabel}
          </p>
          <WorkspaceIdentityBadge workspace={workspace} compact />
        </div>
      </div>
    </div>
  );
}
