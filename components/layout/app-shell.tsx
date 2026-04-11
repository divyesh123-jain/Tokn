import Link from "next/link";
import { ReactNode } from "react";

import { appNav } from "@/lib/tokn-constants";

type AppShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AppShell({ title, description, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-[10px] font-bold text-primary-foreground">
                TK
              </div>
              <span className="text-sm font-semibold text-foreground">
                Tokn
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Product-wide motion consistency for design and engineering.
            </p>
          </div>

          <nav className="space-y-2">
            {appNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-xl border border-transparent bg-muted px-3 py-3 transition hover:border-border"
              >
                <p className="text-sm font-medium text-foreground">
                  {item.label}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.description}
                </p>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="rounded-2xl border border-border bg-card p-6 lg:p-8">
          <header className="mb-8">
            <h2 className="text-3xl font-semibold text-foreground">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
