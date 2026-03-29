import { AppShell } from "@/components/layout/app-shell";
import { ThemePicker } from "@/components/theme/theme-picker";

const settingsBlocks = [
  {
    title: "Policy Rules",
    items: [
      "Block hardcoded durations above 120ms",
      "Require token intent description",
      "Disallow deprecated token usage in main",
    ],
  },
  {
    title: "Distribution",
    items: [
      "Publish SDK as @tokn/tokens",
      "Auto-generate TypeScript declarations",
      "Attach release notes to every package publish",
    ],
  },
  {
    title: "Accessibility",
    items: [
      "Enable reduced-motion variants",
      "Disable high-distance transforms in comfort mode",
      "Audit feedback animations every release",
    ],
  },
];

export default function SettingsPage() {
  return (
    <AppShell
      title="Settings"
      description="Configure governance, packaging, and accessibility behavior."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {settingsBlocks.map((block) => (
          <section
            key={block.title}
            className="rounded-xl border border-border bg-muted p-5"
          >
            <h3 className="text-lg font-semibold text-foreground">
              {block.title}
            </h3>
            <ul className="mt-3 space-y-2">
              {block.items.map((item) => (
                <li
                  key={item}
                  className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="rounded-xl border border-border bg-muted p-5 md:col-span-3">
          <h3 className="text-lg font-semibold text-foreground">Appearance</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick your accent palette and light/dark mode preference.
          </p>

          <div className="mt-4 flex items-center gap-4">
            <ThemePicker />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
