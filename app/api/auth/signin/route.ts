import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getDb } from "@/db";
import { users, workspaceMembers } from "@/db/schema";
import { eq } from "drizzle-orm";

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(100),
  inviteToken: z.string().uuid().optional(),
});

function getErrorCode(error: unknown): string | undefined {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code ?? e?.cause?.code;
}

function isConnectivityError(error: unknown): boolean {
  const code = getErrorCode(error);
  if (
    code === "ENOTFOUND" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "EAI_AGAIN" ||
    code === "ECONNRESET"
  ) {
    return true;
  }

  const message = (error as { message?: string })?.message?.toLowerCase() ?? "";
  return (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("getaddrinfo")
  );
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const parsed = signinSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email, password, inviteToken } = parsed.data;

  let data: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["data"];
  let error: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["error"];

  try {
    const result = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    data = result.data;
    error = result.error;
  } catch (e) {
    if (isConnectivityError(e)) {
      return NextResponse.json(
        { error: "Authentication service is temporarily unavailable. Please try again." },
        { status: 503 },
      );
    }
    throw e;
  }

  if (error) {
    if (isConnectivityError(error)) {
      return NextResponse.json(
        { error: "Authentication service is temporarily unavailable. Please try again." },
        { status: 503 },
      );
    }
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
    if (inviteToken) {
      return NextResponse.json({ ok: true, redirectTo: `${verifyPath}&invite=${encodeURIComponent(inviteToken)}` });
    }
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
    return NextResponse.json({ ok: true, redirectTo: inviteToken ? `/invite/${inviteToken}` : "/projects" });
  }

  let workspaceRows: Array<{ workspaceId: string }> = [];
  try {
    const pg = getDb();
    workspaceRows = await pg
      .select({ workspaceId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, userId))
      .limit(1);
  } catch (e) {
    console.warn("Workspace membership lookup failed after signin", e);
  }

  const redirectTo = inviteToken
    ? `/invite/${inviteToken}`
    : workspaceRows.length === 0
      ? "/onboarding?step=1"
      : "/projects";
  return NextResponse.json({ ok: true, redirectTo });
}

