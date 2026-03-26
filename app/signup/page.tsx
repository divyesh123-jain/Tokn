import Link from "next/link";
import { ThemePicker } from "@/components/theme-picker";
import { ToknSignUpMarketing } from "@/components/tokn-signup-marketing";

function LogoMark() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
      TK
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.06 32.48 28.873 35 24 35c-5.523 0-10-4.477-10-10s4.477-10 10-10c2.557 0 4.879.966 6.626 2.542l5.657-5.657C34.406 6.053 29.845 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.6-.186-3.163-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 16.55 19.098 14 24 14c2.557 0 4.879.966 6.626 2.542l5.657-5.657C34.406 6.053 29.845 4 24 4c-5.845 0-10.406 2.053-13.694 4.691-1.777 1.5-3.166 3.191-4 5z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.845 0 10.406-2.053 13.694-4.691l-6.571-4.819C29.345 35.45 26.243 36 24 36c-4.873 0-9.06-2.52-11.303-6.917l-6.571 4.819C13.594 41.947 18.155 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.821 2.43-2.8 4.492-5.303 5.917l6.571 4.819C39.996 38.053 44 34.046 44 24c0-1.6-.186-3.163-.389-3.917z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.77.6-3.36-1.19-3.36-1.19c-.45-1.16-1.11-1.47-1.11-1.47c-.9-.62.07-.6.07-.6c1 .07 1.52 1.04 1.52 1.04c.89 1.53 2.34 1.09 2.91.83c.09-.64.35-1.09.63-1.34c-2.21-.25-4.53-1.1-4.53-4.9c0-1.08.39-1.97 1.03-2.66c-.1-.25-.45-1.26.1-2.62c0 0 .84-.27 2.75 1.02c.8-.22 1.65-.33 2.5-.33s1.7.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.36.2 2.37.1 2.62c.64.69 1.03 1.58 1.03 2.66c0 3.81-2.33 4.64-4.55 4.89c.36.31.68.92.68 1.86V21c0 .26.18.57.69.48A10 10 0 0 0 12 2Z"
      />
    </svg>
  );
}

export default function SignUpPage() {
  return <ToknSignUpMarketing />;
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-220px] h-128 w-lg -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-56 -right-40 h-128 w-lg rounded-full bg-accent/80 blur-3xl opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_5%,rgba(83,74,183,0.18),transparent_45%),radial-gradient(circle_at_85%_30%,rgba(224,123,108,0.14),transparent_45%),radial-gradient(circle_at_55%_95%,rgba(59,168,158,0.12),transparent_50%)]" />
      </div>

      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-xl hover:bg-muted/60 p-1.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
              TK
            </div>
          </Link>
          <div className="leading-none">
            <div className="text-sm font-semibold tracking-wide">Tokn</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Motion tokens for teams</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <nav className="hidden items-center gap-4 text-sm md:flex">
            <Link
              href="/signin"
              className="text-muted-foreground transition hover:text-foreground"
            >
              Sign in
            </Link>
          </nav>
          <ThemePicker variant="compact" />
        </div>
      </header>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <section className="flex flex-col items-center justify-start pt-2">
          <div className="w-full max-w-[520px] rounded-[2rem] border border-border bg-card/80 p-8 shadow-sm backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <LogoMark />
                <span className="text-sm font-semibold tracking-wide">Tokn</span>
              </div>
              <div className="hidden sm:flex items-center gap-2 rounded-full bg-muted px-3 py-2 text-xs font-semibold text-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Start in minutes
              </div>
            </div>

            <h1 className="mt-7 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Create your account
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tokenize motion, preview the feel, then ship consistent UX with guardrails.
            </p>

            <form className="mt-7 space-y-5" action="/dashboard" method="get">
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">
                  FULL NAME
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="Julian Drake"
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm shadow-none outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">
                  EMAIL
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="julian@kinetic.io"
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm shadow-none outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">
                  PASSWORD
                </label>
                <input
                  type="password"
                  name="password"
                  placeholder="•••••••"
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm shadow-none outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                  required
                />
              </div>

              <button
                type="submit"
                className="flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Create account
              </button>
            </form>

            <div className="mt-7">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <div className="text-xs font-semibold tracking-[0.22em] text-muted-foreground">
                  OR CONTINUE WITH
                </div>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <a
                  href="/api/auth/google?flow=signup"
                  className="flex h-11 items-center justify-center gap-3 rounded-xl border border-border bg-card/60 text-sm font-medium text-foreground transition hover:bg-muted"
                >
                  <GoogleIcon />
                  Google
                </a>
                <a
                  href="/dashboard"
                  className="flex h-11 items-center justify-center gap-3 rounded-xl border border-border bg-card/60 text-sm font-medium text-foreground transition hover:bg-muted"
                >
                  <GitHubIcon />
                  GitHub
                </a>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Already have an account?
              </div>
              <Link
                href="/signin"
                className="text-sm font-semibold text-primary transition hover:underline"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>

        <aside className="relative hidden overflow-hidden rounded-[2rem] border border-border bg-card/60 p-8 backdrop-blur lg:block">
          <AuthVisual />
        </aside>
      </div>
    </div>
  );
}

function AuthVisual() {
  return (
    <div className="relative h-full">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(83,74,183,0.28),transparent_55%),radial-gradient(circle_at_80%_40%,rgba(224,123,108,0.20),transparent_55%),radial-gradient(circle_at_60%_95%,rgba(59,168,158,0.16),transparent_60%)]" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <div className="text-primary">
              <span className="text-5xl leading-none">“</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-accent" />
        </div>

        <blockquote className="mt-5 text-xl font-medium leading-relaxed text-foreground">
          Tokens for intent, exports for implementation, and guardrails for consistency.
        </blockquote>

        <div className="mt-6 grid gap-3">
          <MiniCard title="Token library" subtitle="shared motion vocabulary" />
          <MiniCard title="Preview lab" subtitle="validate feel quickly" />
          <MiniCard title="Versioned releases" subtitle="ship safely with rollback" />
        </div>

        <div className="mt-8 rounded-[1.5rem] border border-border bg-background/60 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Team pulse
            </div>
            <div className="text-xs font-semibold text-primary">live</div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-9 rounded-xl border border-border bg-card/70"
                style={{ opacity: 0.55 + (i % 3) * 0.14 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-[1.25rem] border border-border bg-background/60 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{title}</div>
        <div className="h-8 w-8 rounded-2xl bg-primary/10" />
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
    </div>
  );
}

