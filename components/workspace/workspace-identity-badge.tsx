"use client";

import { Users, User } from "lucide-react";

import { workspaceKindLabel, workspaceRoleLabel } from "@/lib/workspace-identity";
import type { WorkspaceSummary } from "@/lib/workspace-types";
import { cn } from "@/lib/utils";

type WorkspaceIdentityBadgeProps = {
  workspace: Pick<WorkspaceSummary, "name" | "slug" | "kind" | "role">;
  showSlug?: boolean;
  className?: string;
  compact?: boolean;
};

export function WorkspaceIdentityBadge({
  workspace,
  showSlug = true,
  className,
  compact = false,
}: WorkspaceIdentityBadgeProps) {
  const KindIcon = workspace.kind === "team" ? Users : User;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-1.5",
        compact ? "text-xs" : "text-sm",
        className,
      )}
      title={`${workspace.name} · ${workspace.slug}`}
    >
      <span className={cn("truncate font-semibold text-foreground", compact ? "max-w-[140px]" : "max-w-[200px]")}>
        {workspace.name}
      </span>
      {showSlug ? (
        <span className="truncate font-mono text-[11px] text-muted-foreground">{workspace.slug}</span>
      ) : null}
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground",
          workspace.kind === "team" && "border-primary/40 bg-primary/10 text-primary",
        )}
      >
        <KindIcon className="h-3 w-3 shrink-0" aria-hidden />
        {workspaceKindLabel[workspace.kind]}
      </span>
      <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {workspaceRoleLabel[workspace.role]}
      </span>
    </div>
  );
}
