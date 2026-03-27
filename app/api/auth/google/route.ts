import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const flow = url.searchParams.get("flow") ?? "signin";
  const origin = url.origin;

  (await cookies()).set("auth-flow", flow, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  const supabase = await createSupabaseServerClient();
  const redirectTo = `${origin}/api/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error || !data?.url) {
    return NextResponse.json({ error: error?.message ?? "OAuth error" }, { status: 500 });
  }

  return NextResponse.redirect(data.url);
}

