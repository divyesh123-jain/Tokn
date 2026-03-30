import { redirect } from "next/navigation";

import { ProjectsHome } from "@/components/projects/home";
import { getSessionUserState, getUserWorkspaces } from "@/lib/auth-helpers";

export default async function ProjectsPage() {
  const session = await getSessionUserState();
  if (!session.user) {
    redirect("/signin");
  }
  if (!session.emailVerified) {
    const verifyQuery = session.email ? `?email=${encodeURIComponent(session.email)}` : "";
    redirect(`/signup/verify${verifyQuery}`);
  }

  const workspaces = await getUserWorkspaces(session.user.userId);
  if (workspaces.length === 0) {
    redirect("/onboarding?step=1");
  }

  return <ProjectsHome />;
}
