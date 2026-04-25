import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Starter",
    price: "$0",
    cadence: "forever",
    highlights: [
      "Up to 20 active tokens",
      "Single workspace",
      "Public preview links",
    ],
  },
  {
    name: "Solo",
    price: "$19",
    cadence: "per month",
    highlights: [
      "Unlimited tokens",
      "Release history",
      "Versioned SDK exports",
    ],
  },
  {
    name: "Team",
    price: "$49",
    cadence: "per month",
    highlights: [
      "Team roles and approvals",
      "Invite workflows",
      "Priority support",
    ],
  },
] as const;

export default function PricingPage() {
  return (
    <AppShell
      title="Pricing"
      description="Choose a plan that matches your team and token workflow maturity."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <article key={plan.name} className="rounded-xl border border-border bg-muted/30 p-5">
            <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {plan.price}
              <span className="ml-1 text-sm font-medium text-muted-foreground">{plan.cadence}</span>
            </p>
            <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              {plan.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Button className="mt-5 w-full">Choose {plan.name}</Button>
          </article>
        ))}
      </div>

      <div className="mt-6">
        <Link href="/projects" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          Back to projects
        </Link>
      </div>
    </AppShell>
  );
}
