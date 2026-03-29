import { AppShell } from "@/components/layout/app-shell";
import { TokenLibrary } from "@/components/tokens/library";

const userFlowRows = [
  {
    what: "Land on Library tab",
    howItWorks: "Grid of all tokens loads instantly from cache. 12 token cards in 3 columns.",
    whyItMatters:
      "First impression sets the bar. Must feel fast and complete with no loading spinners.",
  },
  {
    what: "Filter by category",
    howItWorks: "Click Enter, Exit, Spring, or Feedback category pills. Grid filters instantly.",
    whyItMatters: "Developers usually know the category they need first. Reduce noise immediately.",
  },
  {
    what: "Search by name",
    howItWorks: "Type in search bar. Cards filter in real time by matching token name.",
    whyItMatters:
      "Developers type to find. Search must work on partial matches, for example def -> enter.default.",
  },
  {
    what: "Preview animation",
    howItWorks: "Each card shows colored timeline bars. Hover card to see a subtle animation indicator.",
    whyItMatters: "Visual preview lets developers evaluate feel without clicking into each token.",
  },
  {
    what: "Open token detail",
    howItWorks: "Click any card to open the token detail panel with that token selected.",
    whyItMatters: "Library is read-oriented discovery while detail view is editing and operations.",
  },
  {
    what: "Copy from library",
    howItWorks: "Each card has a copy action that copies the Framer Motion export for that token.",
    whyItMatters: "Power users copy directly from the library without entering a full editor flow.",
  },
  {
    what: "Share the library",
    howItWorks: "Share library button in the top bar copies a public preview URL.",
    whyItMatters: "The same data can be shared in a read-only format for fast async reviews.",
  },
] as const;

const defaultTokenSetRows = [
  { token: "enter.fast", duration: "150ms", easing: "ease-out", yOffset: "8px", category: "Enter" },
  { token: "enter.default", duration: "300ms", easing: "ease-out", yOffset: "16px", category: "Enter" },
  { token: "enter.slow", duration: "500ms", easing: "ease-in-out", yOffset: "24px", category: "Enter" },
  { token: "exit.fast", duration: "120ms", easing: "ease-in", yOffset: "8px", category: "Exit" },
  { token: "exit.default", duration: "200ms", easing: "ease-in", yOffset: "12px", category: "Exit" },
  { token: "spring.bouncy", duration: "s:300 d:20", easing: "spring", yOffset: "-", category: "Spring" },
  { token: "spring.gentle", duration: "s:200 d:30", easing: "spring", yOffset: "-", category: "Spring" },
  { token: "feedback.success", duration: "250ms", easing: "spring", yOffset: "-", category: "Feedback" },
] as const;

export default function TokensPage() {
  return (
    <AppShell
      title="Feature 02 · Token Library"
      description="The team shared motion vocabulary - browsable, searchable, and always in sync."
    >
      <section className="space-y-6">
        <article className="rounded-xl border border-border bg-muted/50 p-4">
          <h3 className="text-xl font-semibold text-foreground">Overview</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            The token library is the home screen of Tokn. It shows every token in the workspace as
            a card grid - name, category, key values, and a visual timeline preview. It is where
            team members quickly discover what tokens exist, what they feel like, and how to use
            them. It is always live, never a static doc that goes stale.
          </p>
        </article>

        <article className="rounded-xl border border-border bg-background p-4">
          <h3 className="text-xl font-semibold text-foreground">User flow</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-muted/40">
                  <th className="border-b border-border px-3 py-2 font-semibold text-foreground">
                    What
                  </th>
                  <th className="border-b border-border px-3 py-2 font-semibold text-foreground">
                    How it works
                  </th>
                  <th className="border-b border-border px-3 py-2 font-semibold text-foreground">
                    Why it matters
                  </th>
                </tr>
              </thead>
              <tbody>
                {userFlowRows.map((row) => (
                  <tr key={row.what} className="align-top">
                    <td className="border-b border-border px-3 py-2 font-medium text-foreground">
                      {row.what}
                    </td>
                    <td className="border-b border-border px-3 py-2 text-muted-foreground">
                      {row.howItWorks}
                    </td>
                    <td className="border-b border-border px-3 py-2 text-muted-foreground">
                      {row.whyItMatters}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-xl border border-border bg-background p-4">
          <h3 className="text-xl font-semibold text-foreground">Token card anatomy</h3>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Top left: token name in mono style.</li>
            <li>Top right: category badge using category color mapping.</li>
            <li>Middle: animation preview area with hover-triggered motion replay.</li>
            <li>Bottom left: primary value such as duration + easing or spring values.</li>
            <li>Bottom right: quick actions including open and copy.</li>
            <li>Hover state: border accent appears for faster scanning.</li>
            <li>Deprecated token: should display with strike styling and a deprecated badge.</li>
          </ul>
        </article>

        <article className="rounded-xl border border-border bg-background p-4">
          <h3 className="text-xl font-semibold text-foreground">
            Default token set - auto-created on workspace creation
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Every new workspace gets 8 baseline tokens automatically, so teams start with a useful
            motion vocabulary and customize from there instead of starting from a blank slate.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-muted/40">
                  <th className="border-b border-border px-3 py-2 font-semibold text-foreground">
                    Token name
                  </th>
                  <th className="border-b border-border px-3 py-2 font-semibold text-foreground">
                    Duration
                  </th>
                  <th className="border-b border-border px-3 py-2 font-semibold text-foreground">
                    Easing
                  </th>
                  <th className="border-b border-border px-3 py-2 font-semibold text-foreground">
                    Y Offset
                  </th>
                  <th className="border-b border-border px-3 py-2 font-semibold text-foreground">
                    Category
                  </th>
                </tr>
              </thead>
              <tbody>
                {defaultTokenSetRows.map((row) => (
                  <tr key={row.token}>
                    <td className="border-b border-border px-3 py-2 font-mono text-foreground">
                      {row.token}
                    </td>
                    <td className="border-b border-border px-3 py-2 text-muted-foreground">
                      {row.duration}
                    </td>
                    <td className="border-b border-border px-3 py-2 text-muted-foreground">
                      {row.easing}
                    </td>
                    <td className="border-b border-border px-3 py-2 text-muted-foreground">
                      {row.yOffset}
                    </td>
                    <td className="border-b border-border px-3 py-2 text-muted-foreground">
                      {row.category}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-xl border border-border bg-background p-4">
          <h3 className="text-xl font-semibold text-foreground">Success metric</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            A new team member opens the library, finds the right token, and copies export code
            without asking for help. Target time-to-copy for a new member: under 60 seconds.
          </p>
        </article>

        <TokenLibrary />
      </section>
    </AppShell>
  );
}
