import Link from "next/link";

export function PublicPreviewNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tokn preview</p>
      <h1 className="mt-3 text-2xl font-semibold text-foreground">This preview isn&apos;t available</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The link may be outdated, the workspace may have been removed, or nothing has been published
        yet. If you expected motion tokens here, ask your team for an updated share link.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
      >
        Back to Tokn
      </Link>
    </div>
  );
}
