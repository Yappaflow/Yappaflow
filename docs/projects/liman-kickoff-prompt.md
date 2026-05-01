# Kickoff prompt — Liman

Paste the block below into a fresh session. It is self-contained.

---

I want to build **Liman** — a cross-platform admin app for running my projects as a business.

"Liman" is Turkish for "harbor / port" — where all my projects dock. I live in Samsun, a Black Sea harbor city, so the name is personal.

**Platforms:** macOS desktop (primary) + Android (companion). iOS comes free with the same Tauri v2 codebase, ship whenever. Not investing in Windows / Linux polish.

**Multi-user from day one.** This is a shared workspace for me (owner) and my brother (admin, same access as me). Schema supports adding future hires with limited roles (member, viewer) without a rewrite.

**The app does four things, in this order of importance:**

1. **Main Dashboard** — opening screen, all-projects summary. MTD income / outcome / net, per-project health tiles, recent alerts, upcoming scheduled finance entries. The 5-second "am I green?" view.
2. **Finance** — every income and outcome, across every project. Three ingestion modes into one `finance_entries` table: **automatic** via backend pollers (Yappaflow DB for income, DeepSeek / OpenRouter / Railway / etc. billing APIs for outcome), **scheduled** via recurring rules (rent, renewals — backend cron creates entries on due date), and **manual** for one-off entries (must be 3 taps on mobile). Every row has `created_by_user_id` so we can see who logged what.
3. **Ops visibility** — services health, AI vendor spend with analysis/planning/generation stage split, business funnel metrics, alerts feed.
4. **Routines tab** (Phase 4) — scheduled maintenance checks, not in MVP.

**Full plan is at `liman-plan.md` in my workspace folder. Read it first.**

## Architecture — not negotiable

**Multi-user client/server.** Owner + admin roles in MVP; schema supports member + viewer for future hires.

- **Backend:** Node + Hono + Postgres on Railway (Liman's own Railway project, separate from Yappaflow's). Multi-user auth with email + password (Argon2 hashed), JWT sessions. Runs vendor pollers and the recurring-entry cron. Serves one API for all clients.
- **Clients:** Tauri v2 (mobile + desktop), React + Vite + TypeScript. Same codebase targets macOS + Android + iOS. Local SQLite as cache + offline write queue. Keychain-backed session token. Biometric lock on app open unwraps the session.
- **Auth flow:** no OAuth, no magic links, no email service dependency in Phase 1. Email + password. Invites work via a one-time link with a signed token — owner generates it in-app, sends it out-of-band (WhatsApp / Signal / etc.), invitee opens link and sets password. Invite expires in 72 hours.
- **Responsive from day one.** Desktop: sidebar. Mobile: bottom tab bar. Same React tree, different layout at breakpoints.
- **Tauri v2 mobile** — verify it's still the recommended path before committing. It was stable by late 2024; confirm current state in your proposal.

## Sync is a first-class feature

Desktop and mobile are clients of one truth. Must work Phase 1.

- Every row, every table: ULID `id` generated on the client, `created_at`, `updated_at`, `deleted_at`, `created_by_user_id`, `updated_by_user_id`. Server upserts by id → idempotent.
- **Pull:** `GET /sync?since=<ts>` returns creates / updates / tombstones across every table in the workspace.
- **Push:** writes land in local SQLite immediately (optimistic UI). Local `outbox` table queues HTTP calls; worker drains it.
- Last-write-wins by `updated_at`. Sync-status indicator visible on every screen.
- **Not using PowerSync / ElectricSQL** — hand-rolled is ~200 lines per side, under our control.

## Stack — locked

- **Clients:** Tauri v2 (mobile + desktop) + React + Vite + TypeScript
- **Design system:** `packages/ui` inside Liman repo — forked-minimal tokens + primitives, owned here. Do NOT depend on `@yappaflow/ui` cross-repo.
- **Data fetching:** TanStack Query against the backend
- **Charts:** Recharts
- **Local store:** SQLite via `tauri-plugin-sql`
- **Auth:** Argon2 password hashing, JWT sessions via jose (or equivalent)
- **Biometric unlock:** Face ID / Touch ID / fingerprint on app open
- **Backend:** Hono + Drizzle + Postgres
- **Shared types:** `packages/types` — TypeScript types consumed by both app and api

## Repo

Single new GitHub repo named **`liman`**. pnpm workspace:
- `apps/liman-app/` — Tauri v2 client.
- `apps/liman-api/` — Hono backend.
- `packages/ui/` — design system, forked-minimal from `@yappaflow/ui`.
- `packages/types/` — shared TypeScript types.

## Phase 1 scope — one session

End-to-end skeleton including real auth, real sync, real Finance.

1. **Scaffold the repo.** `liman` monorepo, pnpm workspace, the four packages above. Skeleton `README.md` at root.
2. **Scaffold the backend.** Hono + Postgres + Drizzle. One migration covering: `users`, `sessions`, `invites`, `workspaces` (seeded with one), `workspace_members`, `projects`, `finance_entries`, `scheduled_entry_rules`, `vendor_sources`, `vendor_poll_runs`, `sync_log`. Every data table has ULID id + `created_at` / `updated_at` / `deleted_at` / `created_by_user_id` / `updated_by_user_id`. Auth middleware enforcing session tokens. Endpoints: `POST /auth/login`, `POST /auth/accept-invite`, `POST /invites` (owner-only), `GET /sync?since=`, upsert-by-id writes for each entity.
3. **Seed script.** Creates the single workspace + owner user (Yusuf, with a password I set via env var) + generates one ready-to-use invite link for the brother. The invite link is printed to the console when the seed runs so it can be shared manually.
4. **Scaffold the client.** Tauri v2 mobile-enabled (confirm current Tauri mobile stability first). React + Vite + TS. `packages/ui` wired. Theme toggle (light default). Responsive shell: sidebar on desktop, bottom tabs on mobile. Biometric lock on app open.
5. **Auth flow in the client.** Login screen (email + password). Invite-acceptance screen reachable by opening the invite link. Session token saved to keychain. Biometric unwraps it on next open.
6. **Sync engine in the client.** Local SQLite mirroring the server schema + `outbox` table. Sync worker: pulls deltas on open/focus/30s-poll/manual, drains outbox. Sync-status indicator on every screen: "Last synced X ago" + pending-writes badge + "Sync now" button.
7. **Main Dashboard — real data.** MTD numbers from the backend. Per-project tiles (Yappaflow real, one placeholder). Upcoming scheduled entries (read from rules table). Recent alerts component renders (empty is fine).
8. **Finance — real, three modes working.**
   - Manual entry form. Fast on mobile — one screen, big tap targets, `created_by` recorded.
   - Scheduled rule CRUD ("rent, 15,000 TRY, 1st of every month"). Backend cron implemented even if on a dev schedule for testing.
   - One auto adapter — DeepSeek or OpenRouter, whichever has the cleaner billing API — polling on the backend and writing entries. Dedup by `(source, external_id)`.
9. **Services / AI Vendor / Business Snapshot / Alerts — mocked but responsive.** TanStack Query with a mock data-source so Phase 2 swaps to live data without rewriting panels.

## Phase 1 acceptance tests — all must pass before "done"

1. Owner logs in on desktop, creates a manual finance entry. Entry visible on server.
2. Owner generates an invite link, sends it out-of-band. Brother opens link on his device, sets password, lands in the app.
3. Brother sees the owner's entry. Brother adds his own entry. Owner's desktop pulls it within 30 seconds, `created_by` shows brother.
4. Brother goes offline, logs a cash expense, closes the app, reopens offline (entry visible from cache), comes back online — entry syncs cleanly, no duplicates, author attribution intact.

**Do not try to finish the whole plan. Phase 1 only.** Android build does not have to run in Phase 1 — but code must be mobile-ready (responsive, no desktop-only APIs) so Phase 2 is just `tauri android dev`.

## Constraints you must carry

- **Light default, dark toggle mandatory. Both platforms.**
- **Biometric lock on app open.** Non-negotiable — finance data on a phone that can be lost.
- **`created_by` / `updated_by` attribution on every data row.** Multi-user from day one.
- **Liman never writes to Yappaflow's main DB.** Reads only, for the income auto-adapter.
- **UI copy direct, no idioms.** Non-native English writer on the team.
- **Every panel answers a real question in under 3 seconds.**
- **Currency:** canonical amount + currency on every entry; USD and TRY side-by-side in Finance views.
- **Invite links expire in 72 hours.** Regenerable.

## Before you write any code

Propose, in one message, and wait for my go:

- Current state of Tauri v2 mobile (is it the right path today?) with a one-line citation.
- Repo scaffold plan (pnpm workspace structure, tsconfig strategy, shared types layout).
- ASCII sketch of: Main Dashboard (desktop + mobile), Finance panel (desktop + mobile), login + invite-acceptance screens.
- TypeScript types for: `User`, `Session`, `Invite`, `Workspace`, `WorkspaceMember`, `Project`, `FinanceEntry`, `ScheduledEntryRule`, `VendorSource`, `ServiceHealth`, `AiVendorUsage`, `BusinessMetric`, `Alert`, `SyncDelta` (the shape `/sync?since=` returns).
- Auth decisions locked in: Argon2 params, JWT algorithm + expiry, invite token structure, session revocation plan.
- Questions I must answer before Finance auto-adapter ships — at minimum: which payment processor Yappaflow uses (Iyzico / Stripe / bank transfer / other), which auto-outcome adapter to build first (DeepSeek vs OpenRouter), primary currency default.

Once I approve, scaffold in one pass and show me screenshots of: login screen, Main Dashboard with live backend data, Finance panel with a manual entry + a scheduled rule working, the invite-acceptance flow, and the four mocked ops panels rendering responsively. Then stop and wait for feedback.

## Working preferences

- End-to-end execution welcome when I'm AFK. Don't stall on trivial confirmations.
- Don't correct my English, just understand and keep moving.
- If you hit a Tauri mobile gotcha, a Drizzle migration quirk, or an auth edge case, ping me with the exact error before guessing.
