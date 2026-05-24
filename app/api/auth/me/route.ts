import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] | null = null;
  let error: Awaited<ReturnType<typeof supabase.auth.getUser>>["error"] | null = null;

  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
    error = result.error;
  } catch (e) {
    const err = e as { code?: string; message?: string };
    const msg = err?.message?.toLowerCase() ?? "";
    if (err?.code === "refresh_token_not_found" || msg.includes("refresh token")) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    throw e;
  }

  if (error || !user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const meta = user.user_metadata ?? {};
  const fullName =
    typeof meta.full_name === "string" ? meta.full_name.trim() : "";

  const avatarUrl =
    typeof meta.avatar_url === "string" && meta.avatar_url.trim()
      ? meta.avatar_url.trim()
      : typeof meta.picture === "string" && meta.picture.trim()
        ? meta.picture.trim()
        : null;

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email ?? "",
      fullName: fullName || null,
      avatarUrl,
      emailVerified: Boolean(user.email_confirmed_at),
    },
  });
}
