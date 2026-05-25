import { Suspense } from "react";

import { ProjectDashboard } from "@/components/projects/dashboard";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <ProjectDashboard projectId={projectId} />
    </Suspense>
  );
}
