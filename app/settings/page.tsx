import { Suspense } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { WorkspaceSettingsPage } from "@/components/settings/workspace-settings-page";

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Settings" description="Manage workspace details and destructive actions.">
          <p className="text-sm text-muted-foreground">Loading workspace settings...</p>
        </AppShell>
      }
    >
      <WorkspaceSettingsPage />
    </Suspense>
  );
}
