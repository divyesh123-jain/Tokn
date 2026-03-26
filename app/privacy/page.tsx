import Link from "next/link";

function LogoMark() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#534AB7] text-sm font-bold text-white">
      tk
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F8F8F6] text-[#1a1a2e]">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8">
        <div className="flex items-center gap-3">
          <LogoMark />
          <span className="text-sm font-semibold tracking-wide">tokn</span>
        </div>
        <Link
          href="/signin"
          className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-16">
        <h1 className="text-3xl font-semibold">Privacy</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          This is a placeholder privacy page for the MVP UI.
        </p>
      </main>
    </div>
  );
}

