import { AppShell } from "@/components/app-shell";
import { TokenLibrary } from "@/components/token-library";

export default function TokensPage() {
  return (
    <AppShell
      title="Token Library"
      description="The team’s shared motion vocabulary — searchable, previewable, and ready to copy."
    >
      <TokenLibrary />
    </AppShell>
  );
}
