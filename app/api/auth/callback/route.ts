import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUserState, getUserWorkspaces } from "@/lib/auth-helpers";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { acceptWorkspaceInviteByToken } from "@/lib/workspace-invites";

const querySchema = z.object({
  code: z.string().optional(),
  flow: z.string().optional(),
  invite: z.string().uuid().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    code: url.searchParams.get("code") ?? undefined,
    flow: url.searchParams.get("flow") ?? undefined,
    invite: url.searchParams.get("invite") ?? undefined,
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

  const sessionState = await getSessionUserState();
  if (!sessionState.user) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  if (!sessionState.emailVerified) {
    const verifyUrl = new URL("/signup/verify", req.url);
    if (sessionState.email) {
      verifyUrl.searchParams.set("email", sessionState.email);
    }
    return NextResponse.redirect(verifyUrl);
  }

  if (parsed.data.flow === "signup") {
    if (parsed.data.invite && sessionState.user) {
      const inviteResult = await acceptWorkspaceInviteByToken({
        token: parsed.data.invite,
        userId: sessionState.user.userId,
        userEmail: sessionState.user.email,
      });

      if (inviteResult.ok) {
        return NextResponse.redirect(new URL(`/projects/${inviteResult.workspace.id}`, req.url));
      }

      return NextResponse.redirect(new URL(`/invite/${parsed.data.invite}`, req.url));
    }

    return NextResponse.redirect(new URL("/onboarding?step=1", req.url));
  }

  if (parsed.data.invite) {
    return NextResponse.redirect(new URL(`/invite/${parsed.data.invite}`, req.url));
  }

  const workspaces = await getUserWorkspaces(sessionState.user.userId);
  if (workspaces.length === 0) {
    return NextResponse.redirect(new URL("/onboarding?step=1", req.url));
  }

  return NextResponse.redirect(new URL("/projects", req.url));
}

