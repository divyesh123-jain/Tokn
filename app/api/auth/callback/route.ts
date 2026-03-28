import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase-server";

const querySchema = z.object({
  code: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    code: url.searchParams.get("code") ?? undefined,
    error: url.searchParams.get("error") ?? undefined,
    error_description: url.searchParams.get("error_description") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  if (parsed.data.error) {
    const redirectUrl = new URL("/signin", req.url);
    redirectUrl.searchParams.set("error", parsed.data.error_description ?? parsed.data.error);
    return NextResponse.redirect(redirectUrl);
  }

  const code = parsed.data.code;
  if (!code) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  return NextResponse.redirect(new URL("/projects", req.url));
}

