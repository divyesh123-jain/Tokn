import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { motionTokens, workspaceReleases, workspaces } from "@/db/schema";
import { getSessionUserState, getUserWorkspaces } from "@/lib/auth-helpers";

type SnapshotToken = {
  name: string;
  category: string;
  deprecated: boolean;
  initial: { opacity: number; y: number; scale: number };
  transition:
    | { type: "spring"; stiffness: number; damping: number; mass: number }
    | { type: "timing"; durationMs: number; delayMs: number; easing: string };
};

type SnapshotShape = {
  tokens?: Record<string, SnapshotToken>;
};

type ReleaseItem = {
  version: string;
  publishedAt: Date;
  tokenCount: number;
  snapshot: Record<string, SnapshotToken> | null;
};

function isMissingReleaseTableError(error: unknown) {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === "42P01" || e?.cause?.code === "42P01";
}

function safeParseSnapshot(snapshotRaw: string | null) {
  if (!snapshotRaw) return null;
  try {
    const parsed = JSON.parse(snapshotRaw) as SnapshotShape;
    if (!parsed?.tokens || typeof parsed.tokens !== "object") {
      return null;
    }
    return parsed.tokens;
  } catch {
    return null;
  }
}

function diffReleases(current: ReleaseItem, previous: ReleaseItem | null) {
  if (!current.snapshot || !previous?.snapshot) {
    return {
      hasDiff: false,
      added: [] as string[],
      removed: [] as string[],
      changed: [] as string[],
      deprecatedNow: [] as string[],
    };
  }

  const currNames = Object.keys(current.snapshot);
  const prevNames = Object.keys(previous.snapshot);

  const added = currNames.filter((name) => !(name in previous.snapshot!)).sort();
  const removed = prevNames.filter((name) => !(name in current.snapshot!)).sort();
  const changed = currNames
    .filter((name) => name in previous.snapshot!)
    .filter((name) => {
      const curr = JSON.stringify(current.snapshot![name]);
      const prev = JSON.stringify(previous.snapshot![name]);
      return curr !== prev;
    })
    .sort();

  const deprecatedNow = currNames
    .filter((name) => {
      const curr = current.snapshot![name];
      const prev = previous.snapshot![name];
      return Boolean(curr?.deprecated) && !Boolean(prev?.deprecated);
    })
    .sort();

  return {
    hasDiff: true,
    added,
    removed,
    changed,
    deprecatedNow,
  };
}

export default async function ReleasesPage({
  searchParams,
}: {
  searchParams: Promise<{ workspaceId?: string }>;
}) {
  const session = await getSessionUserState();
  if (!session.user) {
    redirect("/signin");
  }
  if (!session.emailVerified) {
    const verifyQuery = session.email ? `?email=${encodeURIComponent(session.email)}` : "";
    redirect(`/signup/verify${verifyQuery}`);
  }

  const userWorkspaceRows = await getUserWorkspaces(session.user.userId);
  if (userWorkspaceRows.length === 0) {
    redirect("/onboarding?step=1");
  }

  const workspaceIds = userWorkspaceRows.map((w) => w.workspaceId);
  const db = getDb();
  const workspaceRows = await db
    .select({ id: workspaces.id, name: workspaces.name, slug: workspaces.slug })
    .from(workspaces)
    .where(inArray(workspaces.id, workspaceIds));

  const byName = [...workspaceRows].sort((a, b) => a.name.localeCompare(b.name));
  const params = await searchParams;
  const selectedWorkspaceId = byName.some((w) => w.id === params.workspaceId)
    ? (params.workspaceId as string)
    : byName[0].id;
  const selectedWorkspace = byName.find((w) => w.id === selectedWorkspaceId) ?? byName[0];

  let releases: ReleaseItem[] = [];
  let releaseDiffsAvailable = true;
  try {
    const rows = await db
      .select({
        version: workspaceReleases.version,
        publishedAt: workspaceReleases.publishedAt,
        tokenCount: workspaceReleases.tokenCount,
        snapshot: workspaceReleases.snapshot,
      })
      .from(workspaceReleases)
      .where(eq(workspaceReleases.workspaceId, selectedWorkspace.id))
      .orderBy(desc(workspaceReleases.publishedAt));

    releases = rows.map((row) => ({
      version: row.version,
      publishedAt: row.publishedAt,
      tokenCount: row.tokenCount,
      snapshot: safeParseSnapshot(row.snapshot),
    }));
  } catch (error) {
    if (!isMissingReleaseTableError(error)) {
      throw error;
    }
    releaseDiffsAvailable = false;
    const fallbackRows = await db
      .select({
        version: motionTokens.publishedVersion,
        publishedAt: motionTokens.publishedAt,
        tokenCount: sql<number>`count(*)::int`,
      })
      .from(motionTokens)
      .where(
        and(
          eq(motionTokens.workspaceId, selectedWorkspace.id),
          eq(motionTokens.deprecated, false),
          isNotNull(motionTokens.publishedVersion),
          isNotNull(motionTokens.publishedAt),
        ),
      )
      .groupBy(motionTokens.publishedVersion, motionTokens.publishedAt)
      .orderBy(desc(motionTokens.publishedAt));

    releases = fallbackRows.map((row) => ({
      version: row.version as string,
      publishedAt: row.publishedAt as Date,
      tokenCount: Number(row.tokenCount),
      snapshot: null,
    }));
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const appOrigin = base.replace(/\/$/, "");

  return (
    <AppShell
      title="Releases"
      description="Track version history, migration notes, and rollbacks."
    >
      <div className="space-y-4">
        <section className="rounded-xl border border-border bg-background p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Workspace</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {byName.map((workspace) => (
              <Link key={workspace.id} href={`/releases?workspaceId=${workspace.id}`}>
                <Button variant={workspace.id === selectedWorkspace.id ? "default" : "outline"} size="sm">
                  {workspace.name}
                </Button>
              </Link>
            ))}
          </div>
        </section>

        {!releaseDiffsAvailable ? (
          <section className="rounded-xl border border-amber-300 bg-amber-50/30 p-5">
            <p className="text-sm text-amber-800">
              Release snapshots are not available yet. Run your DB migration/push to enable token-level diffs.
            </p>
          </section>
        ) : null}

        {releases.length === 0 ? (
          <section className="rounded-xl border border-border bg-muted p-5">
            <p className="text-sm text-muted-foreground">
              No published releases yet for {selectedWorkspace.name}. Publish from the project dashboard to create your first release snapshot.
            </p>
          </section>
        ) : (
          releases.map((release, index) => {
            const publishedAt = new Date(release.publishedAt);
            const previousRelease = releases[index + 1] ?? null;
            const diff = diffReleases(release, previousRelease);
            const pinnedPath = `/preview/${selectedWorkspace.slug}/v/${encodeURIComponent(release.version as string)}`;
            const pinnedUrl = appOrigin ? `${appOrigin}${pinnedPath}` : pinnedPath;

            return (
              <article
                key={`${release.version}-${publishedAt.toISOString()}`}
                className="rounded-xl border border-border bg-muted p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold text-foreground">{release.version}</h3>
                  <span className="font-mono text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("en", {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(publishedAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Published snapshot with {Number(release.tokenCount)} active tokens.
                </p>

                {diff.hasDiff && previousRelease ? (
                  <div className="mt-3 rounded-lg border border-border bg-background p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      Diff vs {previousRelease.version}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-emerald-700">
                        +{diff.added.length} added
                      </span>
                      <span className="rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-sky-700">
                        {diff.changed.length} changed
                      </span>
                      <span className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-rose-700">
                        -{diff.removed.length} removed
                      </span>
                      <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-amber-800">
                        {diff.deprecatedNow.length} deprecated
                      </span>
                    </div>

                    {diff.changed.length > 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Changed: {diff.changed.slice(0, 6).join(", ")}
                        {diff.changed.length > 6 ? ` +${diff.changed.length - 6} more` : ""}
                      </p>
                    ) : null}
                    {diff.deprecatedNow.length > 0 ? (
                      <p className="mt-1 text-xs text-amber-700">
                        Breaking risk: newly deprecated tokens - {diff.deprecatedNow.slice(0, 6).join(", ")}
                        {diff.deprecatedNow.length > 6 ? ` +${diff.deprecatedNow.length - 6} more` : ""}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-3">
                  <Link href={pinnedPath} className="text-sm text-primary underline-offset-4 hover:underline">
                    Open pinned preview
                  </Link>
                  <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{pinnedUrl}</p>
                </div>
              </article>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
