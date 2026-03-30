import { redirect } from "next/navigation";
import { getSessionUserState } from "@/lib/auth-helpers";

export default async function DashboardPage() {
  const session = await getSessionUserState();
  if (!session.user) {
    redirect("/signin");
  }
  if (!session.emailVerified) {
    const verifyQuery = session.email ? `?email=${encodeURIComponent(session.email)}` : "";
    redirect(`/signup/verify${verifyQuery}`);
  }

  redirect("/projects");
}
