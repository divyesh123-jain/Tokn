import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getDb } from "@/db";
import { users, workspaceMembers } from "@/db/schema";
import { eq } from "drizzle-orm";

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(100),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const parsed = signinSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      const verifyPath = `/signup/verify?email=${encodeURIComponent(email)}`;
      return NextResponse.json({ ok: true, redirectTo: verifyPath });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data.session) {
    return NextResponse.json({ error: "No active session" }, { status: 401 });
  }

  if (!data.user?.email_confirmed_at) {
    const verifyPath = `/signup/verify?email=${encodeURIComponent(email)}`;
    return NextResponse.json({ ok: true, redirectTo: verifyPath });
  }

  const userEmail = data.user?.email;
  const userId = data.user?.id;
  if (userEmail && userId) {
    try {
      const pg = getDb();
      const now = new Date();
      await pg
        .insert(users)
        .values({ id: userId, email: userEmail, createdAt: now })
        .onConflictDoNothing({ target: users.email });
    } catch (e) {
      console.error("Postgres user upsert failed (non-blocking)", e);
    }
  }

  if (!userId) {
    return NextResponse.json({ ok: true, redirectTo: "/projects" });
  }

  const pg = getDb();
  const workspaceRows = await pg
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  const redirectTo = workspaceRows.length === 0 ? "/onboarding?step=1" : "/projects";
  return NextResponse.json({ ok: true, redirectTo });
}

