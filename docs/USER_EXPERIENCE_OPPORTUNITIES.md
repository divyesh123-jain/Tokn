# Tokn — UX and product opportunities

Ideas to improve how it feels to use Tokn day to day. Complements [USER_FEATURES.md](./USER_FEATURES.md) (what exists today). For an **ordered backlog** of what to build next, see [ROADMAP_FEATURES.md](./ROADMAP_FEATURES.md); for **delivery quality** (edges, errors, permissions), see [PERFECT.md](./PERFECT.md). Nothing here is committed scope; use it for prioritization and design.

**Teams:** Core team workspaces (invites, roles, publish permissions) are **already shipped** — see [Team workspaces (done vs polish)](./USER_FEATURES.md#team-workspaces-done-vs-polish) in `USER_FEATURES.md`. Items below are mostly **v2+** unless noted.

## Onboarding and first success

- **Guided first edit** — After workspace creation, drop users into one token with a short inline tour (what “publish” means, where exports live).
- **Preset preview before commit** — Let users scrub/compare motion presets with the same demo component before locking a preset at signup.
- **Empty states with one action** — If filters hide everything or a workspace has no custom tokens yet, show a single primary CTA (“Duplicate starter token”, “Open motion studio”).
- **Skip / resume onboarding** — Persist step; allow “finish later” without blocking core navigation.

## Navigation and mental model

- **Unified workspace context** — Tokens, Preview lab, and Releases should always show which workspace is active (same switcher everywhere, deep links preserve `workspaceId`).
- **Breadcrumbs** — Projects → Workspace name → Section (Studio / Library / Releases) so shared URLs and back button match user expectations.
- **Recent items** — Recents that actually open last-used workspace + last section, not only list sorting.
- **Command palette** — Jump to workspace, token by name, publish dialog, settings — power users live here.

## Motion studio and authoring

- **Undo / redo and history** — *(Done: session undo/redo + revert motion from latest release snapshot.)*
- **Bulk operations** — *(Done: multi-select in list — deprecate, 50ms duration snap, category bump.)*
- **Easing UX** — *(Done: presets + cubic-bezier curve control + live CSS validation.)*
- **Side-by-side A/B** — *(Done: Motion Lab compare — latest publish or another token.)*
- **Intent field** — *(Done: DB + studio + `/tokens` + public preview.)*
- **Keyboard workflow** — Deferred.

## Preview and validation

- **More canonical surfaces** — Sheet, drawer, popover, nav transitions, staggered lists — match real app shells teams ship.
- **Reduced motion preview** — Toggle to see mapped behavior for `prefers-reduced-motion` without leaving the lab.
- **Device / size presets** — Narrow phone vs wide desktop frame so timing perception matches production.
- **Recordable clip or GIF** — One-click export of a preview loop for Slack/Notion design reviews (speculative; heavy on infra).

## Collaboration and review

- **Workspace kind migration** — Let owners **upgrade individual → team** (and optionally team → individual) without cloning tokens by hand.
- **Finish or hide hub filters** — **Community** and **Drafts** on `/projects` are empty today; either ship real behavior or remove them to avoid a dead-end UX.
- **Surface `updatedBy`** — Show last editor on a token or in the library for team accountability (field exists in DB).
- **Comments on tokens or releases** — Async threads tied to a version or token id; @mentions optional later.
- **Approval workflow** — “Request publish” from editors; owner approves — fits regulated design systems.
- **Activity feed** — Who published, who changed `enter.default`, invite accepted — human-readable timeline per workspace (complements existing analytics events).
- **Share with password / expiry** — For public preview links when teams do not want fully public slugs.
- **Presence / lock hints** — Optional: show when another editor has the same token selected (speculative; conflict handling is still last-write-wins).

## Releases and handoff to engineering

- **Release notes UX** — Owner writes human changelog on publish; show next to diffs in Releases.
- **Migration hints** — When a token value changes, suggest codemod-style renames or “search your repo for X”.
- **Package publishing story** — Beyond copy/download: npm scope, CI artifact, or webhook to internal registry (enterprise path).
- **Environment channels** — Draft → staging → production token sets with promotion UI (advanced, but huge for real teams).

## Token library and discoverability

- **Tags and ownership** — Tags like `overlay`, `navigation`, `marketing`; optional owner display for questions.
- **Usage examples** — Snippets for CSS variables, Tailwind theme extension, Framer — not only one export format.
- **Figma / design tool bridge** — Later: sync or export variables plugin (high effort, high lock-in value).

## Settings, account, and trust

- **Profile editing** — Name, avatar, email change flow without only showing read-only profile.
- **Session and security** — Active sessions list, sign out everywhere, optional 2FA messaging if Supabase supports it in your plan.
- **Cross-org handoff** — Move a workspace between accounts or export “workspace bundle” for legal / acquisition scenarios (member-level ownership transfer already exists in Settings).
- **Audit log export** — CSV of invites, publishes, role changes for compliance-minded buyers.

## Accessibility and comfort

- **Motion sensitivity** — Respect system reduced motion in marketing and dashboard chrome, not only token previews.
- **Contrast and typography controls** — Optional density (compact vs comfortable) for dense tables in Releases.
- **Clear error copy** — Map 429 / network / permission errors to “what to do next” strings everywhere.

## Feedback loops inside the product

- **In-app feedback** — Low-friction “was this export useful?” after SDK copy.
- **NPS or PMF snippet** — Rare, targeted prompts after publish success (easy to overdo — keep sparse).
- **Docs and videos** — Contextual “?” links to short docs from Publish, Releases, and Invite screens.

## Performance and perceived quality

- **Optimistic UI with reconciliation** — Already partially there; extend consistent patterns for rename/delete.
- **Skeletons** — Replace generic spinners on projects list and settings with structured placeholders.
- **Offline or flaky network** — Queue edits with clear “pending sync” and retry; avoid silent data loss.

## Mobile and cross-device

- **Read-only mobile** — Library + public preview usable on phone for reviews; defer heavy editing to desktop with a polite banner.

---

When prioritizing, bias toward: **clear workspace context**, **faster first publish**, **reviewable diffs with human notes**, and **less context switching** between studio, library, and preview.
