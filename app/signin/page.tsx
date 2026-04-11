import { SignInPageClient } from "@/components/auth/signin-page-client";

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ invite?: string }>;
}) {
  const resolved = (await searchParams) ?? {};
  return <SignInPageClient initialInviteToken={resolved.invite ?? ""} />;
}

