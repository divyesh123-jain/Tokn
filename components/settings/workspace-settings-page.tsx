"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { scheduleRouterAction } from "@/lib/safe-router";
import { sanitizeWorkspaceSlug } from "@/lib/workspace-slug";
import { workspaceApiFetchInit } from "@/lib/workspace-fetch";
import type {
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceSummary,
} from "@/lib/workspace-types";

type WorkspaceDetail = WorkspaceSummary;

type AuthUser = {
  id: string;
};

const roleLabel: Record<WorkspaceRole, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
};

export function WorkspaceSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  const [nameDraft, setNameDraft] = useState("");
  const [slugDraft, setSlugDraft] = useState("");
  const [confirmName, setConfirmName] = useState("");

  const [savingName, setSavingName] = useState(false);
  const [savingSlug, setSavingSlug] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("editor");
  const [inviting, setInviting] = useState(false);
  const [memberUpdatingId, setMemberUpdatingId] = useState<string | null>(null);
  const [memberRemovingId, setMemberRemovingId] = useState<string | null>(null);

  const targetWorkspaceId = searchParams.get("workspaceId");

  const canManageWorkspace = workspace?.role === "owner";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const [authRes, listRes] = await Promise.all([
        fetch("/api/auth/me", workspaceApiFetchInit),
        fetch("/api/workspaces", workspaceApiFetchInit),
      ]);

      if (authRes.status === 401 || listRes.status === 401) {
        scheduleRouterAction(() => router.push("/signin"));
        return;
      }

      const authJson = (await authRes.json().catch(() => null)) as
        | { user?: AuthUser }
        | null;
      if (!cancelled && authJson?.user) {
        setAuthUser(authJson.user);
      }

      const listJson = (await listRes.json().catch(() => null)) as
        | { workspaces?: WorkspaceSummary[] }
        | null;
      const all = listJson?.workspaces ?? [];
      if (cancelled) return;
      setWorkspaces(all);

      const selected =
        all.find((w) => w.id === targetWorkspaceId) ?? all[0] ?? null;
      if (!selected) {
        setWorkspace(null);
        setMembers([]);
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

      const loadedWorkspace = detailJson.workspace;
      if (cancelled) return;
      setWorkspace(loadedWorkspace);
      setNameDraft(loadedWorkspace.name);
      setSlugDraft(loadedWorkspace.slug);
      setConfirmName("");

      if (loadedWorkspace.kind === "team") {
        const membersRes = await fetch(
          `/api/workspaces/${loadedWorkspace.id}/members`,
          workspaceApiFetchInit,
        );
        const membersJson = (await membersRes.json().catch(() => null)) as
          | { members?: WorkspaceMember[]; error?: string }
          | null;
        if (!membersRes.ok) {
          toast.error(membersJson?.error ?? "Could not load team members");
          setMembers([]);
        } else {
          setMembers(membersJson?.members ?? []);
        }
      } else {
        setMembers([]);
      }

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

  const canDelete =
    Boolean(workspace) &&
    canManageWorkspace &&
    confirmName.trim() === (workspace?.name ?? "");

  function switchWorkspace(nextWorkspaceId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("workspaceId", nextWorkspaceId);
    scheduleRouterAction(() => router.replace(`/settings?${params.toString()}`));
  }

  async function saveName() {
    if (!workspace || savingName || !canManageWorkspace) return;
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
    if (!workspace || savingSlug || !canManageWorkspace) return;
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

  async function inviteMember() {
    if (!workspace || workspace.kind !== "team" || !canManageWorkspace || inviting) return;
    if (!inviteEmail.trim()) {
      toast.error("Enter an email");
      return;
    }

    setInviting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/members`, {
        ...workspaceApiFetchInit,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { member?: WorkspaceMember; error?: string }
        | null;
      if (!res.ok || !json?.member) {
        toast.error(json?.error ?? "Could not invite member");
        return;
      }

      setMembers((current) => {
        const idx = current.findIndex((m) => m.id === json.member?.id);
        if (idx === -1) return [...current, json.member as WorkspaceMember];
        const next = [...current];
        next[idx] = json.member as WorkspaceMember;
        return next;
      });
      setInviteEmail("");
      setInviteRole("editor");
      toast.success("Member added");
    } finally {
      setInviting(false);
    }
  }

  async function updateMemberRole(memberId: string, role: WorkspaceRole) {
    if (!workspace || workspace.kind !== "team" || !canManageWorkspace) return;
    setMemberUpdatingId(memberId);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/members/${memberId}`, {
        ...workspaceApiFetchInit,
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const json = (await res.json().catch(() => null)) as
        | { member?: WorkspaceMember; error?: string }
        | null;
      if (!res.ok || !json?.member) {
        toast.error(json?.error ?? "Could not update role");
        return;
      }

      setMembers((current) =>
        current.map((member) =>
          member.id === memberId
            ? json.member as WorkspaceMember
            : json.member?.role === "owner" && member.role === "owner"
              ? { ...member, role: "editor" }
              : member,
        ),
      );

      if (authUser?.id && json.member.userId === authUser.id && workspace.role !== json.member.role) {
        const nextRole = json.member.role;
        setWorkspace((current) => (current ? { ...current, role: nextRole } : current));
        setWorkspaces((current) =>
          current.map((item) =>
            item.id === workspace.id ? { ...item, role: nextRole } : item,
          ),
        );
      }

      toast.success("Member role updated");
    } finally {
      setMemberUpdatingId(null);
    }
  }

  async function removeMember(memberId: string) {
    if (!workspace || workspace.kind !== "team" || !canManageWorkspace) return;
    setMemberRemovingId(memberId);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/members/${memberId}`, {
        ...workspaceApiFetchInit,
        method: "DELETE",
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(json?.error ?? "Could not remove member");
        return;
      }
      setMembers((current) => current.filter((member) => member.id !== memberId));
      toast.success("Member removed");
    } finally {
      setMemberRemovingId(null);
    }
  }

  if (loading) {
    return (
      <AppShell title="Settings" description="Manage workspace details, roles, and destructive actions.">
        <p className="text-sm text-muted-foreground">Loading workspace settings...</p>
      </AppShell>
    );
  }

  if (!workspace) {
    return (
      <AppShell title="Settings" description="Manage workspace details, roles, and destructive actions.">
        <p className="text-sm text-muted-foreground">No workspace found.</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Settings" description="Workspace configuration and access control.">
      <div className="space-y-4">
        {workspaces.length > 1 ? (
          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold text-foreground">Workspace</h3>
            <p className="mt-1 text-sm text-muted-foreground">Select a workspace to configure.</p>
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
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">Workspace details</h3>
            <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
              {workspace.kind}
            </span>
            <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
              {workspace.role}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Rename your workspace. Only owners can save changes.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[260px] flex-1 space-y-1.5">
              <Label htmlFor="workspace-name">Workspace name</Label>
              <Input
                id="workspace-name"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="Workspace name"
                disabled={!canManageWorkspace}
              />
            </div>
            <Button onClick={() => void saveName()} disabled={savingName || !canManageWorkspace}>
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
                disabled={!canManageWorkspace}
              />
              <p className="text-xs text-muted-foreground">Preview URL: {slugPreview}</p>
            </div>
            <Button onClick={() => void saveSlug()} disabled={savingSlug || !canManageWorkspace}>
              {savingSlug ? "Saving..." : "Save slug"}
            </Button>
          </div>
        </section>

        {workspace.kind === "team" ? (
          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold text-foreground">Team members</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Owners can invite members, remove members, and change roles.
            </p>

            {canManageWorkspace ? (
              <div className="mt-4 grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[1fr_170px_auto]">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-email">Invite by email</Label>
                  <Input
                    id="invite-email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(value) => setInviteRole(value as WorkspaceRole)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={() => void inviteMember()} disabled={inviting}>
                    {inviting ? "Inviting..." : "Invite"}
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="mt-4 space-y-2">
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No team members yet.</p>
              ) : (
                members.map((member) => {
                  const isSelf = authUser?.id === member.userId;
                  const disableRoleChange =
                    !canManageWorkspace || member.role === "owner" || memberUpdatingId === member.id;
                  const disableRemove =
                    !canManageWorkspace || member.role === "owner" || memberRemovingId === member.id;

                  return (
                    <div
                      key={member.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {member.email}
                          {isSelf ? " (you)" : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(member.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={member.role}
                          disabled={disableRoleChange}
                          onValueChange={(value) =>
                            void updateMemberRole(member.id, value as WorkspaceRole)
                          }
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">{roleLabel.owner}</SelectItem>
                            <SelectItem value="editor">{roleLabel.editor}</SelectItem>
                            <SelectItem value="viewer">{roleLabel.viewer}</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="outline"
                          onClick={() => void removeMember(member.id)}
                          disabled={disableRemove}
                        >
                          {memberRemovingId === member.id ? "Removing..." : "Remove"}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        ) : null}

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
                disabled={!canManageWorkspace}
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
