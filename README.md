# Tokn

Motion Design System for Product Teams

Tokn is the motion layer between design and code: teams define motion once as tokens, then consume it everywhere through generated SDKs and guardrails.

## Product System (v1)

### One-line Pitch

Tokn lets product teams define, share, and enforce motion tokens across their app the same way design tokens standardized color and spacing.

### Product Thesis

- Inconsistent hardcoded animation values create invisible UX debt.
- Designers currently cannot ship motion intent into production code directly.
- Motion should be a first-class design system primitive, not per-component guesswork.
- A tokenized motion system plus SDK distribution is the fastest path to consistency at scale.

### Core Jobs to Be Done

- Define a motion vocabulary once per team.
- Preview impact before shipping to production.
- Consume tokens in code with zero manual interpretation.
- Enforce token usage and flag hardcoded animation values.
- Version and roll back motion safely.

## User Segments

### Primary

- Frontend developers who need fast, consistent, production-ready motion APIs.
- Product designers who need direct control over motion intent and review loops.

### Secondary

- Design system owners who need policy and enforcement.
- PMs and founders who need polished UX without custom motion workflows.

## User feature summary

Implemented product behavior from an end-user perspective: [docs/USER_FEATURES.md](docs/USER_FEATURES.md). Possible UX and product upgrades: [docs/USER_EXPERIENCE_OPPORTUNITIES.md](docs/USER_EXPERIENCE_OPPORTUNITIES.md).

## Information Architecture

1. Workspaces
2. Token sets
3. Token editor
4. Live preview lab
5. SDK packages
6. Version history
7. Enforcement and diagnostics
8. Team settings and permissions

## Motion Token Model

### Token Categories

- `motion.duration.*`
- `motion.easing.*`
- `motion.spring.*`
- `motion.enter.*`
- `motion.exit.*`
- `motion.feedback.*`
- `motion.attention.*`

### Canonical Token Shape

```ts
type MotionToken = {
  id: string
  name: string
  category:
    | "duration"
    | "easing"
    | "spring"
    | "enter"
    | "exit"
    | "feedback"
    | "attention"
  value: Record<string, unknown>
  intent: string
  platforms: ("web" | "ios" | "android")[]
  version: string
  status: "draft" | "published" | "deprecated"
}
```

### Example Composite Tokens

```json
{
  "motion.enter.default": {
    "duration": 280,
    "easing": "cubic-bezier(0.16, 1, 0.3, 1)",
    "from": { "opacity": 0, "y": 12 },
    "to": { "opacity": 1, "y": 0 }
  },
  "motion.spring.snappy": {
    "type": "spring",
    "stiffness": 420,
    "damping": 30,
    "mass": 0.9
  }
}
```

## Product Capabilities

### 1) Token Authoring

- Create, edit, deprecate, and group motion tokens.
- Browse by UI component (descriptor after the dot) or by motion category; search matches names, inferred tags (overlay, control, …), easing, and category labels.
- Optional import category override when pasting shadcn components (otherwise category is inferred per component).
- Import dialog includes the full shadcn registry (aligned with ui.shadcn.com components) with a filterable picker to append slugs to the import field.
- Rich fields for duration, easing curves, spring physics, transforms, and opacity.
- Intent descriptions and usage guidance per token.

### 2) Preview and Simulation

- Component-level previews (modal, toast, sheet, button, nav).
- Side-by-side compare between draft and published token sets.
- Shareable preview links for designer, PM, and engineer approvals.

### 3) SDK Generation

- Auto-generate installable token SDKs.
- Type-safe exports for Framer Motion, CSS, and GSAP-friendly configs.
- Versioned package output (`@tokn/tokens` or workspace-scoped package names).

### 4) Governance and Enforcement

- Rule engine for forbidden hardcoded durations/easings.
- IDE diagnostics and CI checks with actionable fix suggestions.
- Workspace policy: allowlist/denylist, deprecation windows, migration hints.

### 5) Versioning and Release

- Semantic versioning with release notes.
- Diff views for changed token values and behavioral impact.
- Rollback support per workspace environment.

## MVP Scope (Now)

### Must Have

- Workspace creation and member roles.
- Motion token CRUD for 8-12 core tokens.
- Publish flow and immutable versions.
- SDK export for web (JSON + TypeScript).
- Simple component preview lab.

### Should Have

- Framer Motion config generator.
- Token deprecation metadata.
- Basic lint rule for hardcoded motion values.

### Won't Have (v1)

- Complex timeline editor.
- Native runtime SDKs (iOS/Android).
- Marketplace/public token discovery.

## Feature System Backlog (Execution Order)

1. Authentication, workspaces, roles
2. Token schema and persistence
3. Authoring UI and validation
4. Publish/version engine
5. SDK generator and package delivery
6. Preview lab and share links
7. Lint/CI enforcement package
8. Team analytics and adoption reporting

## Product Style Foundation

This gives us a shared language before visual implementation.

### Brand Attributes

- Precise
- Kinetic
- Systemic
- Premium

### Voice

- Confident, technical, concise.
- Explain motion intent in plain language plus exact values.

### Design Principles

- Motion is semantic, not decorative.
- Every animation has an intent and token owner.
- Faster defaults, deliberate exceptions.
- Accessibility and comfort by default.

## Typography and Theme System (Initial Direction)

### Typography Roles

- `display`: marketing and hero motion statements.
- `heading`: product module titles.
- `body`: docs and settings copy.
- `mono`: token keys, code snippets, and diffs.

### Theme Tokens (v1)

- `theme.color.bg.*`
- `theme.color.fg.*`
- `theme.color.accent.*`
- `theme.color.border.*`
- `theme.radius.*`
- `theme.shadow.*`

### Motion-to-Theme Interaction Rules

- Dark mode reduces blur and heavy shadows, keeps timing parity.
- High contrast mode favors opacity/position transitions over scale jitter.
- Reduced motion maps composite tokens to low-distance, low-duration variants.

## Technical System Blueprint

### Suggested Monorepo Shape

```txt
apps/
  web/                      # Tokn dashboard (Next.js)
packages/
  token-schema/             # Zod/TS schema + validation logic
  token-engine/             # merge, diff, version, deprecate
  sdk-generator/            # TS/JSON/CSS/Framer outputs
  eslint-plugin-tokn/       # hardcoded motion rule + autofix hints
  preview-components/       # canonical demo components
```

### Suggested Data Model

- `workspace`
- `member`
- `token_set`
- `token`
- `release`
- `release_asset`
- `preview_snapshot`
- `policy_rule`

### API Surface (Draft)

- `POST /workspaces`
- `GET /workspaces/:id/tokens`
- `POST /workspaces/:id/tokens`
- `POST /workspaces/:id/publish`
- `GET /workspaces/:id/releases`
- `GET /workspaces/:id/sdk/:version`
- `POST /workspaces/:id/previews`

## Web dashboard UI (implementation)

The Tokn app is built with **shadcn/ui** for product chrome: buttons, inputs, selects, tabs, dialogs, sheets, popovers, and toasts (Sonner). That stack is how we ship the dashboard — not a customer-facing “shadcn feature” inside the motion product. Token authoring, SDK output, and enforcement stay framework-agnostic.

### Phase 2 (roadmap): shadcn animation preset pack

Ship curated **Tokn token sets** tuned for shadcn/Radix surfaces: overlay fade and content motion for `Dialog`, slide + backdrop pairing for `Sheet`, anchor-aware enter/exit for `Popover`, and stack/lifetime defaults for `Toast` / Sonner. Teams on shadcn import a named preset (or generate CSS variables + Framer snippets) so motion matches component semantics without hand-mapping durations and easings per screen.

## Success Metrics

- Token adoption rate (`tokenized animations / total animations`)
- Hardcoded motion violations per PR
- Time to ship motion refresh
- New engineer onboarding time to first compliant animation
- Preview-to-publish conversion rate

## Risks and Countermeasures

- Designers may not trust engineering previews -> build high-fidelity canonical components first.
- Teams may bypass SDK for edge cases -> add escape-hatch policy with mandatory intent annotation.
- Overly rigid tokens can block creativity -> support local overrides with auditable metadata.

## Immediate Build Plan

1. Lock token schema and naming.
2. Build token CRUD + publish flow.
3. Generate typed SDK output.
4. Add 6-8 canonical preview components.
5. Add lint rule for hardcoded duration/easing values.

## Next Session Checklist

Pick one and we implement directly:

- Token schema (`packages/token-schema`)
- Dashboard information architecture (`apps/web`)
- Typography system and theme tokens
- SDK generator output format
- Enforcement rule spec (`eslint-plugin-tokn`)

## Deployment Readiness

### 1) Environment setup

- Copy `.env.example` to `.env.local` for local development.
- In production, set all required variables in your hosting provider:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `DATABASE_URL` (or `POSTGRES_URL` / `SUPABASE_DB_URL`)
  - `NEXT_PUBLIC_APP_URL` (and optionally `NEXT_PUBLIC_SITE_URL`, `SITE_URL`)
- Optional but recommended:
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
  - `SUPABASE_SMTP_HOST`
  - `SUPABASE_SMTP_PORT`
  - `SUPABASE_SMTP_USER`
  - `SUPABASE_SMTP_PASSWORD`
  - `SUPABASE_FROM_EMAIL`

### 2) CI checks

- GitHub Actions workflow: `.github/workflows/ci.yml`
- Runs on push/PR:
  - `npm ci`
  - `npm run lint`
  - `npm run build`

### 3) Production checklist

- Verify auth callback URLs match deployment domain.
- Verify database connection and migrations are applied.
- Verify invite flow works with Supabase SMTP enabled.
- Verify rate limiting is active by setting Upstash env vars.
- Verify publish flow and pinned preview URLs.

### 4) P2 migrations and checks

- Run `npm run db:push` after pulling latest changes to create:
  - `workspace_releases` (publish snapshots + release diffs)
  - `product_events` (analytics starter events)
- Run governance starter check:
  - `npm run governance:check`
  - Remediate hardcoded motion values by replacing literals with token-driven values.

## P2 Features Implemented

### Release Details And Diffs

- Publish now stores release snapshots in `workspace_releases`.
- Releases UI compares consecutive snapshots and shows:
  - added tokens
  - changed tokens
  - removed tokens
  - newly deprecated tokens (breaking risk)
- If the release table is not migrated yet, UI falls back gracefully to basic release rows.

### Governance Rule Starter

- Added script: `npm run governance:check`
- Scans app/component/lib source for common hardcoded motion literals:
  - duration literals
  - delay literals
  - easing literals
  - CSS transition milliseconds

### Analytics Starter

- Added endpoint: `POST /api/analytics/events`
- Added client helper for non-blocking event dispatch.
- Tracked starter product events:
  - workspace publish
  - SDK export copy/download
  - invite sent/resent/cancelled
