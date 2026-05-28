"use client";

import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { workspaceKindLabel, workspaceRoleLabel } from "@/lib/workspace-identity";
import type { WorkspaceSummary } from "@/lib/workspace-types";
import { cn } from "@/lib/utils";

type WorkspaceSwitcherProps = {
  workspaces: WorkspaceSummary[];
  current: WorkspaceSummary;
  onSelect: (workspaceId: string) => void;
  className?: string;
};

export function WorkspaceSwitcher({
  workspaces,
  current,
  onSelect,
  className,
}: WorkspaceSwitcherProps) {
  if (workspaces.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "h-8 max-w-[min(100%,280px)] gap-1.5 border-2 border-primary/50 bg-background font-semibold shadow-sm",
              className,
            )}
            aria-label={`Switch workspace. Current: ${current.name}`}
          >
            <span className="truncate">{current.name}</span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-[min(100vw-2rem,320px)]">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Switch workspace</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((item) => {
          const active = item.id === current.id;
          return (
            <DropdownMenuItem
              key={item.id}
              className={cn(
                "flex cursor-pointer flex-col items-stretch gap-0.5 py-2",
                active && "bg-primary/10 focus:bg-primary/15",
              )}
              onSelect={() => {
                if (!active) onSelect(item.id);
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={cn("truncate font-semibold", active && "text-primary")}>
                  {item.name}
                </span>
                {active ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
              </div>
              <span className="truncate font-mono text-[10px] text-muted-foreground">{item.slug}</span>
              <div className="flex flex-wrap gap-1 pt-0.5">
                <span className="rounded border border-border px-1 py-0 text-[9px] font-semibold uppercase">
                  {workspaceKindLabel[item.kind]}
                </span>
                <span className="rounded border border-border px-1 py-0 text-[9px] font-semibold uppercase">
                  {workspaceRoleLabel[item.role]}
                </span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
