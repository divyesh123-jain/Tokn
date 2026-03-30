import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getDb } from "@/db";
import { users } from "@/db/schema";

function getAppOrigin(req: Request): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost ?? req.headers.get("host");
  const forwardedProto = req.headers.get("x-forwarded-proto");
  if (host) {
    const proto = forwardedProto ?? (host.includes("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return new URL(req.url).origin;
}

function mapSignupError(message: string) {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("already registered") ||
    normalized.includes("already exists") ||
    normalized.includes("user already")
  ) {
    return "Email already exists. Please sign in.";
  }
  return message;
}

const signupSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export async function POST(req: Request) {
  const db = await createSupabaseServerClient();
  const origin = getAppOrigin(req);

  const parsed = signupSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { name, email, password } = parsed.data;

  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: name ? { full_name: name } : {},
      emailRedirectTo: `${origin}/api/auth/callback?flow=signup`,
    },
  });

  if (error) {
    const mappedMessage = mapSignupError(error.message);
    return NextResponse.json({ error: mappedMessage }, { status: 400 });
  }

  if (data.session) {
    const email = data.user?.email;
    const userId = data.user?.id;
    if (email && userId) {
      try {
        const db = getDb();
        const now = new Date();
        await db
          .insert(users)
          .values({ id: userId, email, createdAt: now })
          .onConflictDoNothing({ target: users.email });
      } catch (e) {
        console.error("Postgres user upsert failed (non-blocking)", e);
      }
    }
    return NextResponse.json({ ok: true, redirectTo: "/onboarding?step=1" });
  }

  const verifyUrl = new URL("/signup/verify", req.url);
  verifyUrl.searchParams.set("email", email);
  return NextResponse.json({ ok: true, redirectTo: verifyUrl.pathname + verifyUrl.search });
}

