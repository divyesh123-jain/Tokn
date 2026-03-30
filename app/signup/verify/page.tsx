import { redirect } from "next/navigation";

import { getSessionUserState } from "@/lib/auth-helpers";
import { VerifyEmailWatcher } from "@/app/signup/verify/verify-email-watcher";

type VerifyPageProps = {
  searchParams?: Promise<{ email?: string }>;
};

export default async function VerifySignupPage({ searchParams }: VerifyPageProps) {
  const session = await getSessionUserState();
  if (session.user && session.emailVerified) {
    redirect("/onboarding?step=1");
  }

  const resolved = (await searchParams) ?? {};
  const email = typeof resolved.email === "string" ? resolved.email.trim() : "";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Verify your email</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        We sent a verification link to {email || "your inbox"}. After you verify, you will be sent to onboarding.
      </p>

      <VerifyEmailWatcher email={email} />
    </main>
  );
}
