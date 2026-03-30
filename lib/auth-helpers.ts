import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { users, workspaceMembers } from "@/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type SessionUser = {
  userId: string;
  email: string;
  fullName: string | null;
};

export type SessionUserState = {
  user: SessionUser | null;
  email: string | null;
  emailVerified: boolean;
};

export type WorkspaceRole = "viewer" | "editor" | "owner";

const WORKSPACE_ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  viewer: 0,
  editor: 1,
  owner: 2,
};

export class WorkspaceRoleError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function getSessionUserState(): Promise<SessionUserState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user?.email) {
    return { user: null, email: null, emailVerified: false };
  }

  const db = getDb();
  const now = new Date();
  await db
    .insert(users)
    .values({ id: user.id, email: user.email, createdAt: now })
    .onConflictDoNothing({ target: users.email });

  const ensured = await db.select({ id: users.id }).from(users).where(eq(users.email, user.email));
  if (ensured.length === 0) {
    return { user: null, email: user.email, emailVerified: Boolean(user.email_confirmed_at) };
  }

  const fullNameRaw =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const fullName = fullNameRaw.trim();

  return {
    user: { userId: ensured[0].id, email: user.email, fullName: fullName || null },
    email: user.email,
    emailVerified: Boolean(user.email_confirmed_at),
  };
}

export async function getSessionUser() {
  const state = await getSessionUserState();
  if (!state.user || !state.emailVerified) {
    return null;
  }
  return state.user;
}

export async function getWorkspaceMemberRole(userId: string, workspaceId: string) {
  const db = getDb();
  const rows = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    );
  return rows[0]?.role ?? null;
}

export async function requireWorkspaceRole(
  userId: string,
  workspaceId: string,
  minimumRole: WorkspaceRole,
) {
  const role = await getWorkspaceMemberRole(userId, workspaceId);
  if (!role) {
    throw new WorkspaceRoleError(403, "Not a workspace member");
  }

  const memberLevel = WORKSPACE_ROLE_HIERARCHY[role as WorkspaceRole];
  const requiredLevel = WORKSPACE_ROLE_HIERARCHY[minimumRole];
  if (memberLevel < requiredLevel) {
    throw new WorkspaceRoleError(403, `Requires ${minimumRole} role or higher`);
  }

  return role as WorkspaceRole;
}

export async function getUserWorkspaces(userId: string) {
  const db = getDb();
  return db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId));
}
