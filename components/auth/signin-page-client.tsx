"use client";

import * as React from "react";
import { toast } from "sonner";

import { ToknSignInMarketing } from "@/components/marketing/signin-marketing";

type SignInPageClientProps = {
  initialInviteToken: string;
};

export function SignInPageClient({ initialInviteToken }: SignInPageClientProps) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function onSubmit() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          inviteToken: initialInviteToken || undefined,
        }),
      });

      const json = (await res.json().catch(() => null)) as
        | { ok: true; redirectTo: string }
        | { error: string }
        | null;

      if (!res.ok || !json || "error" in json) {
        toast.error(json && "error" in json ? json.error : "Signin failed");
        return;
      }

      window.location.assign(json.redirectTo);
    } catch {
      toast.error("Signin failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ToknSignInMarketing
      email={email}
      password={password}
      showPassword={showPassword}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onShowPasswordChange={setShowPassword}
      onSubmit={onSubmit}
    />
  );
}