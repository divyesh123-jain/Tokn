# Tokn — UX edges and “most useful SaaS” checklist

Companion to [ROADMAP_FEATURES.md](./ROADMAP_FEATURES.md) (ordered backlog), [USER_EXPERIENCE_OPPORTUNITIES.md](./USER_EXPERIENCE_OPPORTUNITIES.md) (idea pool), and [USER_FEATURES.md](./USER_FEATURES.md) (current behavior). Use this for QA matrices, design reviews, and roadmap grooming: **every state a human can be in**, not only the happy path.

---

## 1. Time-to-value and activation

- **First session outcome** — Can a new user name a success within 10 minutes (first token edited + previewed + understood publish)? If not, what blocks (copy, permissions, discoverability)?
- **Definition of “done” for onboarding** — After onboarding, is the next step obvious (open studio vs library vs preview)? No dead-end dashboards.
- **Returning user** — Deep links (`workspaceId`, token, tab) restore context; refresh mid-flow does not strand them.
- **Skip paths** — Power users can skip tours; novices can re-open help without hunting Settings.
- **Preset regret** — Changing starter preset after workspace exists: clear consequences (new tokens vs mutate vs “duplicate workspace”).

---

## 2. Workspace and identity clarity

- **Always show where you are** — Workspace name, slug, kind (individual vs team), role (owner/editor/viewer) visible anywhere tokens or publish exist.
- **Wrong workspace accidents** — High-contrast switcher; confirm destructive actions scoped to current workspace.
- **Slug collisions and renames** — Public preview URLs: what breaks, what redirects, what we tell the user before they change slug.
- **Deleted / inaccessible workspace** — Links to old previews: humane 404, no leaking existence of private names.

---

## 3. Roles, permissions, and social edges

- **Viewer tries to edit** — Inline disable + short reason + link to request access (or contact owner), not generic “error”.
- **Editor tries to publish** — Same: explain owner-only, who to ask.
- **Last owner** — Cannot remove self without transfer; message states exact prerequisite.
- **Invite wrong email** — Resend, cancel, expiry visible; invited user signs up with different email: clear resolution path.
- **Role demotion while tab open** — UI reconciles on next action or poll: no silent 403 loops.
- **Removed from workspace mid-session** — Redirect to projects hub with explanation, not blank spinners.

---

## 4. Authoring and motion studio edges

- **Validation** — Invalid easing, impossible numbers, name collisions: field-level errors, not toast-only.
- **Long names / many tokens** — List performance, truncation with tooltip, search always reachable.
- **Concurrent edits** — Last-write-wins is honest: surface “updated elsewhere” or refetch banner when PATCH conflicts or `updatedAt` drift.
- **Undo scope** — User understands what undo covers (session vs server vs revert-to-published).
- **Revert to published** — Disabled when no publish; explains what reverts (motion only vs name).
- **Deprecation** — Still visible in library? Filter defaults? Export includes/excludes deprecated with explicit toggle and release diff alignment.
- **Spring vs timing** — Mode switch preserves or discards fields: warn if data loss.
- **Bulk edit on mixed selection** — Partial failures reported per token or rollback message.

---

## 5. Preview and perception

- **Reduced motion** — System `prefers-reduced-motion`: preview and marketing chrome behavior documented and testable.
- **Replay / compare** — Compare mode: clear which side is draft vs published vs other token; color/icon convention stable.
- **Heavy previews** — Low-end machines: no runaway RAF; optional “lower FPS” or static fallback for huge lists.
- **Canonical components vs real app** — Set expectations (“lab approximation”) so users don’t assume pixel parity with their shell.

---

## 6. Publish, releases, and versioning

- **Semver discipline** — Invalid version rejected with example; duplicate version behavior explicit.
- **Publish with zero eligible tokens** — Block with explanation vs empty release: product decision documented in UI.
- **Partial publish failure** — Some tokens saved, snapshot not: transactional messaging and recovery (retry, support).
- **Diff empty / snapshot missing** — Degraded UI copy matches reality (see Releases doc in USER_FEATURES).
- **“Latest” ambiguity** — Everywhere clarify: latest **published** vs **draft** (public preview, SDK, compare).
- **Rollback story** — Re-publish old values vs “restore release” — user mental model and UI labels aligned.

---

## 7. Exports and engineering handoff (high leverage)

- **Clipboard limits** — Huge SDK: warn size, offer download-only, or chunk; failure on copy is explicit.
- **Download** — Filename includes workspace slug + version; MIME type correct; Safari quirks considered.
- **Format matrix** — Today TS/JSON at workspace level vs per-token CSS/Tailwind in lab: document gap or close it so users aren’t surprised.
- **Version pin in consumer repo** — Encourage comment or `version` export usage; optional “install snippet” in UI.
- **Stale export** — Banner if draft changed after last publish: “SDK reflects vX; draft differs.”
- **CI / headless** — If export stays session-only: document pattern (manual file) vs future API key; no false promise in empty states.

---

## 8. Public preview and sharing

- **Unlisted vs public** — Slug guessability; optional password/expiry (per OPPORTUNITIES).
- **Draft vs published on public URL** — Behavior documented on the page footer or badge.
- **Share revocability** — Slug change / workspace delete: old links behavior.
- **Embeds / iframes** — If unsupported, fail clearly (relevant for enterprise security pages).

---

## 9. Network, rate limits, and reliability

- **429** — Retry-after, backoff hint, not blame-y copy.
- **Offline / tab sleep** — Pending edits queue or block navigation with confirm; reconnect merge strategy.
- **Partial load** — Skeletons vs spinners; which panels can render with stale cache.
- **Optimistic failures** — Revert local state and show diff vs server truth.

---

## 10. Accessibility and inclusive defaults

- **Keyboard** — Studio list, dialogs, publish flow fully operable without mouse (even if “polish later”, track gaps).
- **Focus management** — Dialog open/close returns focus; no focus traps in previews.
- **Screen readers** — Token table semantics, live regions for save/publish success.
- **Color-only status** — Draft/published/deprecated also text/icon.
- **Motion in UI** — Respect reduced motion for chrome animations, not only token demos.

---

## 11. Content, copy, and tone

- **Error taxonomy** — Map HTTP and domain errors to: what happened, what user can do, support link if repeated.
- **Empty states** — One primary CTA; distinguish “no tokens” vs “filters hide all” vs “no search results”.
- **Success noise** — Toasts: avoid duplicate stacks; critical actions (publish) get durable affordance (link to release).
- **Jargon** — “Snapshot”, “SDK”, “release” glossaried once in-context (? tooltips).

---

## 12. Settings, account, lifecycle

- **Email verification gate** — Every protected action fails with same next step (verify inbox).
- **Profile** — Read-only vs editable expectations (see OPPORTUNITIES).
- **Delete workspace** — Typo confirmation, list consequences (invites, previews, releases).
- **Ownership transfer** — Both parties see clear state (pending vs complete).

---

## 13. Discoverability and scale

- **Search** — Typos, partial names, category synonyms; zero results suggests actions.
- **Tags / facets** — As token count grows, browsing without search must stay viable.
- **Docs in product** — Contextual links from Publish, SDK export, Invites, Releases (short, maintained).

---

## 14. Feedback and trust loops

- **Micro-feedback** — After SDK copy/download: optional one-tap “worked / confusing” (non-blocking).
- **Analytics vs privacy** — If events fire, user-facing privacy story consistent with Terms.
- **Incident communication** — Status or banner pattern if auth provider or DB degraded.

---

## 15. Mobile and cross-device

- **Read-only mobile** — If editing deferred, every touch target still explains why (banner), not broken layout.
- **Responsive tables** — Releases diff readable on tablet; horizontal scroll labeled.

---

## 16. Future enterprise and billing edges (when you add them)

- **Seat / role billing** — UI matches entitlements; downgrade role implications before confirm.
- **SSO / domain** — Invite restrictions and error when email domain mismatch.
- **Audit** — Export expectations (CSV) and retention messaging.

---

## 17. Prioritization rubric (for “most useful”)

When choosing what to build next, weight:

1. **Reduces fear** — Wrong publish, wrong workspace, data loss, opaque errors.
2. **Shortens handoff** — Engineer gets correct artifact first try (version, format, completeness).
3. **Supports teams** — Accountability, review, activity, permissions clarity.
4. **Feels fast** — Perceived latency, skeletons, optimistic paths that reconcile honestly.

---

*Maintainers: treat each section as a living checklist — tick, defer, or explicitly mark “won’t do” with rationale to avoid UX debt by omission.*