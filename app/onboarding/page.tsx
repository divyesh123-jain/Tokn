import { redirect } from "next/navigation";

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { getSessionUserState } from "@/lib/auth-helpers";

type OnboardingPageProps = {
  searchParams?: Promise<{ step?: string }>;
};

function defaultWorkspaceNameFromProfile(fullName: string | null | undefined) {
  const firstName = fullName?.trim().split(/\s+/).filter(Boolean)[0] ?? "";
  if (!firstName) {
    return "My Workspace";
  }
  return `${firstName} Workspace`;
}

function normalizeStep(step: string | undefined): 1 | 2 | 3 | 4 {
  const numeric = Number(step ?? "1");
  if (numeric >= 1 && numeric <= 4) {
    return numeric as 1 | 2 | 3 | 4;
  }
  return 1;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const session = await getSessionUserState();
  if (!session.user) {
    redirect("/signin");
  }
  if (!session.emailVerified) {
    const verifyQuery = session.email ? `?email=${encodeURIComponent(session.email)}` : "";
    redirect(`/signup/verify${verifyQuery}`);
  }

  const resolvedParams = (await searchParams) ?? {};
  const step = normalizeStep(resolvedParams.step);

  // Keep this lookup commented out with redirect guard while onboarding UI is in preview mode.
  // const workspaces = await getUserWorkspaces(user.userId);
  // Temporary for UI iteration: keep onboarding visible even if a workspace already exists.
  // if (workspaces.length > 0 && step !== 4) {
  //   redirect("/projects");
  // }

  return (
    <OnboardingFlow
      initialStep={step}
      initialWorkspaceName={defaultWorkspaceNameFromProfile(session.user.fullName)}
    />
  );
}
