import { AppShell } from "@/components/layout/app-shell";

const releases = [
  { version: "1.3.0", date: "2026-03-21", notes: "Refined enter/exit defaults" },
  { version: "1.2.2", date: "2026-03-17", notes: "Adjusted spring damping" },
  { version: "1.2.0", date: "2026-03-11", notes: "Added feedback tokens" },
];

export default function ReleasesPage() {
  return (
    <AppShell
      title="Releases"
      description="Track version history, migration notes, and rollbacks."
    >
      <div className="space-y-3">
        {releases.map((release) => (
          <article
            key={release.version}
            className="rounded-xl border border-border bg-muted p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-foreground">
                v{release.version}
              </h3>
              <span className="font-mono text-xs text-muted-foreground">
                {release.date}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {release.notes}
            </p>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
