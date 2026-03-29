import Link from "next/link";
import { ThemePicker } from "@/components/theme/theme-picker";
import { ToknLandingPage } from "@/components/marketing/landing-page";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function LogoMark() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
      TK
    </div>
  );
}

export default async function Home() {
  let signedIn = false;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  } catch {
    signedIn = false;
  }

  return <ToknLandingPage signedIn={signedIn} />;
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-220px] h-128 w-lg -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-56 -right-40 h-128 w-lg rounded-full bg-accent/80 blur-3xl opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_5%,rgba(83,74,183,0.18),transparent_45%),radial-gradient(circle_at_80%_25%,rgba(224,123,108,0.16),transparent_45%),radial-gradient(circle_at_55%_95%,rgba(59,168,158,0.14),transparent_50%)]" />
      </div>

      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <LogoMark />
          <div className="leading-none">
            <div className="text-sm font-semibold tracking-wide">Tokn</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Motion tokens for teams</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a
              href="#features"
              className="text-muted-foreground transition hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#workspaces"
              className="text-muted-foreground transition hover:text-foreground"
            >
              Workspaces
            </a>
            <a
              href="#safety"
              className="text-muted-foreground transition hover:text-foreground"
            >
              Guardrails
            </a>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/signin"
              className="rounded-xl border border-border bg-card/60 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Start free trial
            </Link>
          </div>

          <ThemePicker variant="compact" />
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-6 pb-20 pt-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <section>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="inline-flex h-7 items-center rounded-full bg-primary/10 px-3 text-[11px] text-primary">
                Tokenize motion
              </span>
              <span className="hidden sm:inline">Define once. Ship everywhere.</span>
            </p>

            <h1 className="mt-5 text-5xl font-semibold tracking-tight md:text-6xl">
              Where Teams Connect and Create
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground">
              Tokn is the motion layer between design and code: teams define motion once as
              tokens, then consume it everywhere through generated SDKs and enforcement guardrails.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                Start free trial
              </Link>
              <Link
                href="/signin"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-card/60 px-6 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                Sign in
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card/70 p-4 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10" />
                  <div>
                    <div className="text-sm font-semibold">Token library</div>
                    <div className="mt-1 text-xs text-muted-foreground">Shared motion vocabulary</div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card/70 p-4 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-accent" />
                  <div>
                    <div className="text-sm font-semibold">Generated exports</div>
                    <div className="mt-1 text-xs text-muted-foreground">SDKs for production code</div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card/70 p-4 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-muted" />
                  <div>
                    <div className="text-sm font-semibold">Guardrails</div>
                    <div className="mt-1 text-xs text-muted-foreground">Fewer hardcoded animations</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-border bg-card/60 px-4 py-2 font-semibold text-foreground">
                Versioned motion
              </span>
              <span className="rounded-full bg-muted px-4 py-2 font-semibold text-foreground">
                Workspace governance
              </span>
              <span className="rounded-full bg-muted px-4 py-2 font-semibold text-foreground">
                Preview lab
              </span>
            </div>
          </section>

          <aside>
            <LandingIllustration />
          </aside>
        </div>

        <section id="features" className="mt-20">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Features
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Motion that behaves like a system
              </h2>
            </div>
            <div className="hidden md:block text-sm text-muted-foreground max-w-sm">
              A token-based workflow for consistent UX across teams, reviews, and codebases.
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <FeatureCard
              title="Define once"
              description="Create a shared motion vocabulary per workspace."
              accent="bg-primary/10"
            />
            <FeatureCard
              title="Preview impact"
              description="Validate timing and feel before shipping to production."
              accent="bg-accent"
            />
            <FeatureCard
              title="Enforce consistency"
              description="Flag hardcoded animation values and keep teams aligned."
              accent="bg-muted"
            />
          </div>
        </section>

        <section id="workspaces" className="mt-16 rounded-[2rem] border border-border bg-card/60 p-6 backdrop-blur md:p-10">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Workspaces
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Everyone uses the same motion language
              </h2>
              <p className="mt-4 max-w-xl text-muted-foreground">
                Set the rules for your team once, then reuse versioned motion tokens across apps.
                Designers author intent. Developers consume it without translation.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-2xl border border-border bg-background/60 px-4 py-3">
                  <div className="text-sm font-semibold">Token sets</div>
                  <div className="mt-1 text-xs text-muted-foreground">Per workspace library</div>
                </div>
                <div className="rounded-2xl border border-border bg-background/60 px-4 py-3">
                  <div className="text-sm font-semibold">Exports</div>
                  <div className="mt-1 text-xs text-muted-foreground">Generated SDK outputs</div>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.5rem] border border-border bg-background/50 p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(83,74,183,0.20),transparent_55%),radial-gradient(circle_at_70%_65%,rgba(224,123,108,0.16),transparent_45%)]" />
              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Real workflow
                </p>
                <div className="mt-4 space-y-3">
                  <Step label="1" title="Author motion intent" />
                  <Step label="2" title="Preview the token set" />
                  <Step label="3" title="Consume exports in code" />
                </div>
                <div className="mt-6">
                  <Link
                    href="/signup"
                    className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                  >
                    Get started
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="safety" className="mt-16">
          <div className="rounded-[2rem] border border-border bg-card/70 p-6 backdrop-blur md:p-10">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Guardrails
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                  Less debate. More shipping.
                </h2>
                <p className="mt-4 max-w-xl text-muted-foreground">
                  When motion behaves like a system, teams stop re-litigating durations and
                  start shipping consistent UX with confidence.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground">
                    Tokenized motion
                  </span>
                  <span className="rounded-full bg-muted px-4 py-2 text-xs font-semibold text-foreground">
                    SDK exports
                  </span>
                  <span className="rounded-full bg-muted px-4 py-2 text-xs font-semibold text-foreground">
                    Governance
                  </span>
                </div>
              </div>

              <blockquote className="m-0 rounded-[1.5rem] border border-border bg-background/60 p-6">
                <div className="text-primary">
                  <span className="text-5xl leading-none">“</span>
                </div>
                <p className="mt-3 text-lg font-medium leading-relaxed">
                  Tokn makes motion enforceable. We stopped debating durations in review, shipped a
                  shared motion vocabulary, and consumed it everywhere via generated exports.
                </p>
                <footer className="mt-4 text-sm text-muted-foreground">
                  Motion Systems Lead
                </footer>
              </blockquote>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="text-sm font-semibold tracking-wide">Tokn</div>
          <div className="text-xs text-muted-foreground">© 2026 Tokn.</div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  accent,
}: {
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[1.5rem] border border-border bg-card/70 p-6 backdrop-blur transition hover:bg-card">
      <div className={`h-12 w-12 rounded-2xl ${accent}`} />
      <div className="mt-4 text-lg font-semibold tracking-tight">{title}</div>
      <div className="mt-2 text-sm text-muted-foreground">{description}</div>
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl transition group-hover:opacity-100 opacity-0" />
    </div>
  );
}

function Step({ label, title }: { label: string; title: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card/70 text-sm font-semibold text-foreground shadow-sm">
        {label}
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">Built into your token workflow</div>
      </div>
    </div>
  );
}

function LandingIllustration() {
  const avatars = ["S", "A", "M", "K"];
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-primary/10 blur-2xl" />

      <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card/70 backdrop-blur">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_5%,rgba(83,74,183,0.18),transparent_45%),radial-gradient(circle_at_85%_30%,rgba(224,123,108,0.14),transparent_45%),radial-gradient(circle_at_55%_95%,rgba(59,168,158,0.12),transparent_50%)]" />

        <div className="relative p-7">
          <div className="flex items-center justify-between gap-4">
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-2 text-xs font-semibold text-muted-foreground">
              Workspace • Production
            </div>
            <div className="flex items-center -space-x-2">
              {avatars.map((a) => (
                <div
                  key={a}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-background bg-card text-xs font-semibold text-foreground"
                >
                  {a}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <MockPanel title="Website design" pct="45%" />
              <MockPanel title="App design" pct="72%" />
            </div>

            <div className="relative">
              <div className="rounded-[1.75rem] border border-border bg-background/60 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Token graph</div>
                  <div className="h-8 w-8 rounded-xl bg-primary/10" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-7 rounded-xl border border-border bg-card/70"
                      style={{
                        transform: `rotate(${(i % 3) * 1.2 - 1.2}deg)`,
                      }}
                    />
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <div className="text-xs font-semibold text-primary">exports ready</div>
                  <div className="h-px flex-1 bg-border" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="rounded-full bg-primary/15 px-4 py-2 text-xs font-semibold text-primary">
                  Preview
                </div>
                <div className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground">
                  Enforce
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[1.75rem] border border-border bg-background/60 p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Contributors
              </div>
              <div className="text-xs font-semibold text-muted-foreground">v1.0 • live</div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-accent" />
                <div>
                  <div className="text-sm font-semibold">Design team</div>
                  <div className="mt-1 text-xs text-muted-foreground">authors</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10" />
                <div>
                  <div className="text-sm font-semibold">Frontend</div>
                  <div className="mt-1 text-xs text-muted-foreground">consumers</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-muted" />
                <div>
                  <div className="text-sm font-semibold">Governance</div>
                  <div className="mt-1 text-xs text-muted-foreground">policies</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockPanel({ title, pct }: { title: string; pct: string }) {
  return (
    <div className="rounded-[1.6rem] border border-border bg-background/60 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs font-semibold text-muted-foreground">{pct}</div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-2 rounded-full bg-primary/15" />
        <div className="h-2 w-2/3 rounded-full bg-accent" />
        <div className="h-2 w-1/2 rounded-full bg-muted" />
      </div>
    </div>
  );
}
