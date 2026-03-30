"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  Clock,
  Globe,
  HelpCircle,
  Inbox,
  LayoutGrid,
  LogOut,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Share2,
  Sparkles,
  Trash2,
  User,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { scheduleRouterAction } from "@/lib/safe-router";
import { workspaceApiFetchInit } from "@/lib/workspace-fetch";
import { cn } from "@/lib/utils";
import { useUiPrefs } from "@/lib/ui-prefs";
import type { WorkspaceKind, WorkspaceSummary } from "@/lib/workspace-types";

type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
};

const NAV = [
  { key: "all", label: "All projects", icon: LayoutGrid },
  { key: "recents", label: "Recents", icon: Clock },
  { key: "community", label: "Community", icon: Globe },
  { key: "drafts", label: "Drafts", icon: Inbox },
  { key: "teams", label: "Teams", icon: Users },
] as const;

function initialsFromLabel(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "T";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function ProjectsHome() {
  const router = useRouter();
  const workspaceLabel = useUiPrefs((s) => s.workspaceLabel);
  const setWorkspaceLabel = useUiPrefs((s) => s.setWorkspaceLabel);

  const [workspaces, setWorkspaces] = React.useState<WorkspaceSummary[]>([]);
  const [listLoading, setListLoading] = React.useState(true);
  const [nav, setNav] = React.useState<(typeof NAV)[number]["key"]>("all");
  const [query, setQuery] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [kind, setKind] = React.useState<WorkspaceKind>("individual");
  const [creating, setCreating] = React.useState(false);
  const [authUser, setAuthUser] = React.useState<AuthUser | null>(null);
  const [loggingOut, setLoggingOut] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const res = await fetch("/api/workspaces", workspaceApiFetchInit);
    if (res.status === 401) {
      scheduleRouterAction(() => router.push("/signin"));
      return;
    }
    if (!res.ok) {
      toast.error("Could not load projects");
      return;
    }
    const data = (await res.json()) as { workspaces: WorkspaceSummary[] };
    setWorkspaces(data.workspaces ?? []);
  }, [router]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setListLoading(true);
      await refresh();
      if (!cancelled) setListLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadAuthUser() {
      const res = await fetch("/api/auth/me", workspaceApiFetchInit);
      if (cancelled) return;
      if (res.status === 401) {
        scheduleRouterAction(() => router.push("/signin"));
        return;
      }
      if (!res.ok) return;
      const data = (await res.json().catch(() => null)) as { user?: AuthUser } | null;
      if (!data?.user) return;
      setAuthUser(data.user);
    }

    void loadAuthUser();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const filtered = React.useMemo(() => {
    let list = workspaces;
    if (nav === "teams") {
      list = list.filter((w) => w.kind === "team");
    }
    if (nav === "recents") {
      list = [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    if (nav === "community" || nav === "drafts") {
      list = [];
    }
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => p.name.toLowerCase().includes(q));
  }, [workspaces, nav, query]);

  async function submitCreate() {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/workspaces", {
        ...workspaceApiFetchInit,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: newName.trim() || "Untitled project",
          kind,
        }),
      });
      if (res.status === 401) {
        scheduleRouterAction(() => router.push("/signin"));
        return;
      }
      const json = (await res.json().catch(() => null)) as
        | { workspace?: { id: string }; error?: string }
        | null;
      if (!res.ok || !json?.workspace) {
        toast.error(json?.error ?? "Could not create project");
        return;
      }
      const newId = json.workspace.id;
      setCreateOpen(false);
      setNewName("");
      setKind("individual");
      await refresh();
      scheduleRouterAction(() => router.push(`/projects/${newId}`));
    } finally {
      setCreating(false);
    }
  }

  async function deleteWorkspace(id: string) {
    if (!window.confirm("Delete this project? This cannot be undone.")) return;
    const res = await fetch(`/api/workspaces/${id}`, {
      ...workspaceApiFetchInit,
      method: "DELETE",
    });
    if (res.status === 401) {
      scheduleRouterAction(() => router.push("/signin"));
      return;
    }
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      toast.error(json?.error ?? "Could not delete project");
      return;
    }
    toast.success("Project deleted");
    await refresh();
  }

  async function signOut() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/signout", {
        ...workspaceApiFetchInit,
        method: "POST",
      });
    } finally {
      window.location.assign("/signin");
    }
  }

  const displayName = authUser?.fullName?.trim() || authUser?.email || workspaceLabel;

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
        <div className="border-b border-sidebar-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold hover:bg-sidebar-accent/80"
              aria-label="Open account menu"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {initialsFromLabel(displayName)}
              </span>
              <span className="min-w-0 flex-1 truncate">{displayName}</span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={8} className="w-64 min-w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="truncate text-sm font-semibold text-foreground">{displayName}</span>
                    {authUser?.email ? (
                      <span className="truncate text-xs text-muted-foreground">{authUser.email}</span>
                    ) : null}
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => scheduleRouterAction(() => router.push("/projects"))}>
                <Check className="h-4 w-4" />
                Projects
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => scheduleRouterAction(() => router.push("/settings"))}>
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => scheduleRouterAction(() => router.push("/signup"))}>
                <User className="h-4 w-4" />
                Add account
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={loggingOut}
                onClick={() => {
                  void signOut();
                }}
              >
                <LogOut className="h-4 w-4" />
                {loggingOut ? "Logging out..." : "Log out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects…"
              className="h-9 border-sidebar-border bg-background/80 pl-8 text-xs"
            />
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 p-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = nav === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setNav(item.key)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/90 hover:bg-sidebar-accent/60",
                )}
              >
                <Icon className={cn("h-4 w-4", active ? "text-primary" : "opacity-70")} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className="text-xs font-semibold">Upgrade</div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Unlimited projects and shared libraries when you are ready.
            </p>
            <Button size="sm" className="mt-3 w-full rounded-lg" variant="default">
              View plans
            </Button>
          </div>
          <div className="mt-2 flex gap-1">
            <Link
              href="/settings"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs text-muted-foreground hover:bg-muted"
            >
              <Settings className="h-3.5 w-3.5" />
              Settings
            </Link>
            <a
              href="/contact"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs text-muted-foreground hover:bg-muted"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Help
            </a>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">
        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-8 py-5 backdrop-blur supports-backdrop-filter:bg-background/80">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight">{workspaceLabel}</h1>
            <button
              type="button"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              aria-label="Rename workspace"
              onClick={() => {
                const next = window.prompt("Workspace name", workspaceLabel);
                if (next != null && next.trim()) setWorkspaceLabel(next.trim());
              }}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-lg gap-1.5">
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
            <Button
              size="sm"
              className="rounded-lg gap-1.5 shadow-sm"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New project
            </Button>
          </div>
        </header>

        <div className="px-8 pb-12 pt-6">
          {listLoading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading projects…
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onOpen={() =>
                    scheduleRouterAction(() => router.push(`/projects/${p.id}`))
                  }
                  onDelete={() => void deleteWorkspace(p.id)}
                  canDelete={p.role === "owner"}
                />
              ))}
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20 text-muted-foreground transition hover:border-primary/40 hover:bg-muted/40 hover:text-foreground"
              >
                <Plus className="mb-2 h-8 w-8 opacity-70" />
                <span className="text-sm font-medium">Create new project</span>
              </button>
            </div>
          )}
        </div>
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 pt-1">
            <div className="grid gap-2">
              <Label htmlFor="proj-name">Name</Label>
              <Input
                id="proj-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Motion system"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submitCreate();
                }}
              />
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Type</span>
              <div className="grid gap-2 sm:grid-cols-2">
                <TypeCard
                  active={kind === "individual"}
                  onSelect={() => setKind("individual")}
                  title="Individual"
                  description="Personal drafts and libraries."
                  icon={User}
                />
                <TypeCard
                  active={kind === "team"}
                  onSelect={() => setKind("team")}
                  title="Team"
                  description="Shared with your workspace."
                  icon={Users}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={creating} onClick={() => void submitCreate()}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create and open"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TypeCard({
  active,
  onSelect,
  title,
  description,
  icon: Icon,
}: {
  active: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "rounded-xl border p-3 text-left transition",
        active
          ? "border-primary bg-accent shadow-sm ring-1 ring-primary/20"
          : "border-border bg-card hover:bg-muted/50",
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
    </button>
  );
}

function ProjectCard({
  project,
  onOpen,
  onDelete,
  canDelete,
}: {
  project: WorkspaceSummary;
  onOpen: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const tone =
    project.kind === "team"
      ? "from-primary/25 via-accent to-secondary"
      : "from-[#534ab7]/20 via-muted to-background";

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className={cn("relative h-[120px] bg-gradient-to-br", tone)}>
        <div className="absolute inset-0 opacity-40 mix-blend-overlay [background-image:radial-gradient(circle_at_30%_20%,white,transparent_55%),radial-gradient(circle_at_80%_80%,rgba(83,74,183,0.5),transparent_50%)]" />
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur">
          <Sparkles className="h-3 w-3 text-primary" />
          {project.kind === "team" ? "Team" : "Individual"}
        </div>
      </div>
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{project.name}</div>
          <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            motion · library
          </div>
        </div>
        {canDelete ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="relative z-10 h-8 w-8 text-muted-foreground opacity-0 transition hover:bg-muted group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}
