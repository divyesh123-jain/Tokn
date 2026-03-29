"use client";

import * as React from "react";
import { toast } from "sonner";
import { ToknSignInMarketing } from "@/components/marketing/signin-marketing";

export default function SignInPage() {
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
        body: JSON.stringify({ email, password }),
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

function AuthVisual() {
  return (
    <div className="relative h-full">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(83,74,183,0.28),transparent_55%),radial-gradient(circle_at_80%_40%,rgba(224,123,108,0.20),transparent_55%),radial-gradient(circle_at_60%_95%,rgba(59,168,158,0.16),transparent_60%)]" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <div className="text-primary">
              <span className="text-5xl leading-none">“</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-accent" />
        </div>

        <blockquote className="mt-5 text-xl font-medium leading-relaxed text-foreground">
          Tokens for intent, exports for implementation, and guardrails for consistency.
        </blockquote>

        <div className="mt-6 grid gap-3">
          <MiniCard title="Token library" subtitle="shared motion vocabulary" />
          <MiniCard title="SDK exports" subtitle="production-ready APIs" />
          <MiniCard title="Governance" subtitle="keep teams aligned" />
        </div>

        <div className="mt-8 rounded-[1.5rem] border border-border bg-background/60 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Live workspace
            </div>
            <div className="text-xs font-semibold text-primary">v1.0</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-10 rounded-xl border border-border bg-card/70"
                style={{ opacity: 0.65 + (i % 3) * 0.12 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-[1.25rem] border border-border bg-background/60 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{title}</div>
        <div className="h-8 w-8 rounded-2xl bg-primary/10" />
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
    </div>
  );
}

