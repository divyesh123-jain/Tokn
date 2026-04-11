import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase-server";

const resendSchema = z.object({
  email: z.string().email(),
  inviteToken: z.string().uuid().optional(),
});

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

export async function POST(req: Request) {
  const parsed = resendSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const origin = getAppOrigin(req);
  const redirectUrl = new URL("/api/auth/callback", origin);
  redirectUrl.searchParams.set("flow", "signup");
  if (parsed.data.inviteToken) {
    redirectUrl.searchParams.set("invite", parsed.data.inviteToken);
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: {
      emailRedirectTo: redirectUrl.toString(),
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
