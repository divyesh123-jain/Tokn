"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type VerifyEmailWatcherProps = {
  email: string;
};

export function VerifyEmailWatcher({ email }: VerifyEmailWatcherProps) {
  const router = useRouter();
  const [hasSession, setHasSession] = React.useState<boolean | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = React.useState(60);
  const [isResending, setIsResending] = React.useState(false);

  const checkVerification = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        cache: "no-store",
        headers: { "cache-control": "no-store" },
      });

      if (res.status === 401) {
        setHasSession(false);
        return false;
      }

      if (!res.ok) return false;

      setHasSession(true);
      const json = (await res.json().catch(() => null)) as
        | { user?: { emailVerified?: boolean } }
        | null;

      if (json?.user?.emailVerified) {
        router.refresh();
        router.replace("/onboarding?step=1");
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }, [router]);

  React.useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [cooldownSeconds]);

  React.useEffect(() => {
    let cancelled = false;

    void checkVerification();
    const timer = window.setInterval(() => {
      if (cancelled) return;
      if (hasSession === false) return;
      void checkVerification();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [checkVerification, hasSession]);

  async function resendEmail() {
    if (!email || isResending) return;
    setIsResending(true);
    try {
      const res = await fetch("/api/auth/signup/resend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(json?.error ?? "Could not resend verification email");
        return;
      }

      toast.success("Verification email sent");
      setCooldownSeconds(60);
    } catch {
      toast.error("Could not resend verification email");
    } finally {
      setIsResending(false);
    }
  }

  const minutes = String(Math.floor(cooldownSeconds / 60)).padStart(2, "0");
  const seconds = String(cooldownSeconds % 60).padStart(2, "0");

  return (
    <div className="mt-4 space-y-4">
      <p className="text-xs text-muted-foreground">
        We will automatically refresh this page once your email is verified.
      </p>

      {hasSession === false ? (
        <p className="text-xs text-muted-foreground">
          Auto-check is paused until you open the verification link from your inbox.
        </p>
      ) : null}

      {cooldownSeconds > 0 ? (
        <p className="text-xs text-muted-foreground">You can resend the verification email in {minutes}:{seconds}</p>
      ) : (
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => void resendEmail()}
            disabled={!email || isResending}
            className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium disabled:opacity-60"
          >
            {isResending ? "Sending..." : "Resend email"}
          </button>
        </div>
      )}
    </div>
  );
}
