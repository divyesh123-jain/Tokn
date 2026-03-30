import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { users, workspaceMembers } from "@/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function getSessionUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user?.email) return null;

  const db = getDb();
  const now = new Date();
  await db
    .insert(users)
    .values({ id: user.id, email: user.email, createdAt: now })
    .onConflictDoNothing({ target: users.email });

  const ensured = await db.select({ id: users.id }).from(users).where(eq(users.email, user.email));
  if (ensured.length === 0) {
    return null;
  }

  return { userId: ensured[0].id, email: user.email };
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
