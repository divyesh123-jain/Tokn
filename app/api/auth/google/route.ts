import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const flow = url.searchParams.get("flow") ?? "signin";
  const inviteToken = url.searchParams.get("invite");
  const origin = url.origin;

  (await cookies()).set("auth-flow", flow, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  const supabase = await createSupabaseServerClient();
  const redirectUrl = new URL("/api/auth/callback", origin);
  redirectUrl.searchParams.set("flow", flow);
  if (inviteToken) {
    redirectUrl.searchParams.set("invite", inviteToken);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl.toString(),
    },
  });

  if (error || !data?.url) {
    return NextResponse.json({ error: error?.message ?? "OAuth error" }, { status: 500 });
  }

  return NextResponse.redirect(data.url);
}

