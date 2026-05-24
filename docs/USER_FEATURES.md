# Tokn — user-facing features (current build)

End-user oriented summary of what the web app does today. For setup and architecture, see the root [README](../README.md).

## Public and marketing

- **Home (`/`)** — Product landing (features, workspaces, guardrails narrative), theme control, sign-in / sign-up entry points when logged out.
- **Pricing (`/pricing`)**, **Contact (`/contact`)**, **Terms (`/terms`)**, **Privacy (`/privacy`)** — Static marketing and legal pages.

## Account and access

- **Sign up (`/signup`)** — Email/password registration via Supabase.
- **Email verification (`/signup/verify`)** — Confirms email before full app access; supports resend.
- **Sign in (`/signin`)** — Email/password session.
- **Google sign-in** — OAuth entry (see app auth routes).
- **Forgot password (`/forgot-password`)** — Password recovery flow.
- **Sign out** — Available from the projects hub user menu.

Unauthenticated users hitting protected product URLs are sent to sign-in. Users without verified email are sent to the verify screen.

## First-time setup

- **Onboarding (`/onboarding`)** — Multi-step flow after sign-in: workspace intent (individual vs team), name, motion preset, then workspace creation with starter tokens. Completion can continue to the app (e.g. projects).

## Workspaces and “projects”

- **Projects hub (`/projects`)** — Lists your workspaces as projects; filter (e.g. teams, recents), search, create new workspace (individual or team), open a workspace into the editor, account menu, link to settings.
- **Dashboard (`/dashboard`)** — Redirects authenticated users into the product (currently routes through to `/projects` when eligible).

Workspaces have kinds (individual vs team), slugs for URLs, and per-member **roles**: owner, editor, viewer (capabilities enforced in API and UI).

## Team workspaces (done vs polish)

**Bottom line:** Team collaboration is **implemented**, not a stub: you can create a **team** workspace, **invite** people (editor or viewer), they **accept** via the invite link, and **roles** gate what each person can do. Invites and role changes are also tracked for product analytics.

### Shipped (teams v1)

- **Kind at creation** — Choose **individual** or **team** in onboarding and in the “new project” dialog on `/projects`.
- **Members** — Team workspaces load a **member list** in Settings; owners can **change roles** (owner / editor / viewer) and **remove** non-owners.
- **Ownership transfer** — Promoting another member to **owner** demotes the previous owner to editor (API-enforced); sole owner cannot be removed without transferring first.
- **Invites** — Owners invite by **email** + role (editor or viewer, not owner); **resend**, **cancel**, expiry countdown; invite **email** depends on **Supabase SMTP** (or similar) being configured — the UI can still create invites and warns when delivery is off.
- **Invite landing** — `/invite/[token]` for accept / decline / sign-up as invited email.
- **API enforcement** — Invite APIs only for `kind === "team"`. Token **read** from viewer+, **create/update** from editor+, **publish** owner-only; SDK export viewer+ (aligned with dashboard behavior).
- **Labels** — Project chrome shows Team vs Individual; projects hub can filter **Teams**.

### Gaps / good follow-ups (experience, not “missing teams”)

- **No kind migration** — You cannot turn an existing **individual** workspace into **team** (or reverse) via Settings or API; `PATCH` workspace only updates name/slug. Today the fix is create a team workspace and move work manually if needed.
- **Projects hub placeholders** — **Community** and **Drafts** filters show **empty lists** (not wired to real data yet).
- **No team activity surface** — No in-app **audit timeline** (“Alex published v1.2”, “Jamie joined”) beyond raw analytics events.
- **Studio context** — Team presence, “who edited this token”, or live cursors are **not** implemented; `updatedBy` exists on tokens for future surfacing.
- **Enterprise edges** — No SSO, org-level billing, or domain-restricted invites in this codebase.

For UX-oriented ideas on top of this, see [USER_EXPERIENCE_OPPORTUNITIES.md](./USER_EXPERIENCE_OPPORTUNITIES.md) (collaboration section).

## Motion studio (per workspace)

Route: **`/projects/[projectId]`** where `projectId` is the workspace id.

- **Token authoring** — Edit motion tokens (timing vs spring, easing, offsets, opacity/scale starts, deprecation). Changes sync to the server with pending-state feedback.
- **Live preview** — Preview selected tokens on canonical UI targets (e.g. button, card, modal, toast, list) with replay.
- **Publish** — Owners can publish a semantic version; publishes snapshot data for releases and public preview. On success, a **pinned public preview URL** for that version can be copied to the clipboard.
- **SDK export** — After at least one publish, export the workspace token set as **TypeScript** or **JSON** (copy or download). Requires a published version.
- **Share / preview links** — Workspace-scoped preview slug helpers for sharing read-only views (see Public preview below).
- **Theme** — Accent/theme picker in the project chrome.

## Token library (`/tokens`)

- **Browse** — Grid of tokens with category filters, search, and lightweight motion affordances on cards.
- **Detail / edit** — Select a token to inspect and adjust fields (names with validation, delete where allowed).
- **Copy** — Per-token Framer Motion–style export snippets; optional full **SDK copy** when the workspace has a published version.
- **Share library** — Copies a public preview URL for async review.

The page also includes embedded **product notes** (tables describing intended flows); the live **Token library** block uses the shared client token state (same store as preview lab / studio when a workspace is active).

## Preview lab (`/preview`)

- **Component matrix** — Try the current token set against fixed preview components (button, card, modal, toast, list item) with Framer Motion–driven demos.
- Uses the same token store as the studio/library for quick validation without opening a full project.

## Releases (`/releases`)

- **Version history** — Lists published releases for the selected workspace.
- **Diffs** — When release snapshots exist in the database, compares consecutive releases: added, removed, changed tokens, and tokens newly marked deprecated (breaking-risk signal). If the snapshot table is missing, the UI degrades to simpler release listing.

## Settings (`/settings`)

- **Workspace switcher** — Pick which workspace to manage (`workspaceId` query param).
- **Profile** — Shows signed-in user from `/api/auth/me`.
- **Workspace details** — Owners can update **name** and **URL slug** (with sanitization rules).
- **Delete workspace** — Owner-only destructive flow with confirmation by workspace name.
- **Team workspaces** — Member list with **role changes** and **remove member** (as permitted).
- **Invitations** — Owners invite by email with role (editor/viewer); **resend** and **cancel** pending invites; optional notice when email delivery is disabled (invite still created).

## Invite acceptance

- **`/invite/[token]`** — Accept or decline a workspace invite. Supports signing up or signing in as the invited email, viewing role capabilities, and joining the workspace.

## Public preview (no login)

- **`/preview/[workspaceSlug]`** — Read-only token gallery for a workspace slug; can reflect latest published payload or live draft behavior depending on backend data (see `getPublicPreviewPayload`).
- **`/preview/[workspaceSlug]/v/[version]`** — Pinned view for a specific published semantic version.

## Experience and reliability (transparent to users)

- **Toasts** — Sonner for success/error messages across flows.
- **API rate limits** — When Upstash Redis env vars are set, anonymous API traffic is rate-limited (global + stricter limits on signup, workspace creation, token create/patch). Users may see HTTP 429 with retry hints on heavy use.

## Product analytics (background)

Non-blocking events are sent to `POST /api/analytics/events` for product instrumentation, including: workspace publish, SDK export copy/download, invite sent/resent/cancelled. This does not change visible UI beyond normal success toasts.

## Repo-only developer tooling (not in-app UI)

- **`npm run governance:check`** — Scans source for hardcoded motion literals (starter governance). Documented in the main README for teams working on the codebase.

---

*This document reflects the codebase as of the last update. If something is missing here, check route files under `app/` and components under `components/`.*

**Ideas for improving UX:** [USER_EXPERIENCE_OPPORTUNITIES.md](./USER_EXPERIENCE_OPPORTUNITIES.md)
