import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  try {
    await supabase.auth.signOut();
  } catch (e) {
    const err = e as { code?: string; message?: string };
    const msg = err?.message?.toLowerCase() ?? "";
    if (!(err?.code === "refresh_token_not_found" || msg.includes("refresh token"))) {
      throw e;
    }
  }
  return NextResponse.json({ ok: true, redirectTo: "/signin" });
}
