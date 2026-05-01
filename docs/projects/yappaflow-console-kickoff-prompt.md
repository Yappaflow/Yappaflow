# Kickoff prompt — Ops Console

Paste the block below into a fresh session. It is self-contained.

---

I want to build **Ops Console** — a cross-platform admin app for running my projects as a business. Multi-project from day one. Yappaflow is the first project plugged in; others slot in later.

**Platforms:** macOS desktop (primary) + Android (companion). iOS comes free with the same Tauri v2 codebase, ship whenever. Not investing in Windows/Linux polish.

**The app does four things, in this order of importance:**

1. **Main Dashboard** — opening screen, all-projects summary. MTD income / outcome / net, per-project health tiles, recent alerts, upcoming scheduled finance entries. The 5-second "am I green?" view.
2. **Finance** — every income and outcome, across every project. Three ingestion modes, all writing to one `FinanceEntry` table: **automatic** via backend pollers (Yappaflow DB for income, DeepSeek / OpenRouter / Railway / etc. billing APIs for outcome), **scheduled** via recurring rules (rent, subscriptions, renewals — backend cron creates entries on due date), and **manual** for one-off entries (must be fast on mobile). Edit history preserved so auto pollers don't overwrite manual corrections.
3. **Ops visibility** — services health, AI vendor spend with the analysis/planning/generation stage split, business funnel metrics, alerts feed.
4. **Routines tab** (Phase 4) — scheduled maintenance checks, not in MVP.

**Full plan is at `yappaflow-console-plan.md` in my workspace folder. Read it first.**

## Architecture — not negotiable

This is **client/server**, not local-only, because it has to sync between desktop and phone.

- **Backend:** Node + Hono (default, pitch an alternative if you have a strong reason) + Postgres (on Railway, separate DB from Yappaflow). Runs vendor adapters on a schedule, runs the recurring-entry cron, serves one API for both clients. Single API key auth — one user, no multi-tenant.
- **Clients:** Tauri v2 with mobile support enabled, React + Vite + TypeScript. Same codebase targets macOS + Android + iOS. Local SQLite as cache + offline write queue. Keychain-backed secure store for the backend API key.
- **Responsive from day one.** Desktop shows sidebar, mobile shows bottom tab bar. Same React tree, different layout at breakpoints.
- **Tauri v2 mobile** — verify it's still the recommended path before committing. It was stable by late 2024; confirm current state.

## Sync is a first-class feature

Desktop and mobile are two clients of one truth. Sync must work from day one, not be bolted on later.

- **Every row, every table:** ULID `id` generated on the client, plus `created_at`, `updated_at`, `deleted_at` (soft delete). Server upserts by ID so writes are idempotent.
- **Pull:** `GET /sync?since=<timestamp>` returns creates / updates / tombstones since that timestamp across every table. Client applies to local SQLite and advances `last_sync_at`. Triggered on app open, window focus, manual "Sync now", and a 30-second poll while foregrounded.
- **Push:** writes land in local SQLite immediately (optimistic UI). A local `outbox` table queues the HTTP calls. A worker drains it — on success mark synced, on failure back off and retry. Idempotency makes retries safe.
- **Conflict resolution:** last-write-wins by `updated_at`. Conflicts are vanishingly rare for one user on two devices, but the code handles them correctly.
- **UI:** every screen shows "Last synced X ago" and a pending-writes badge when the outbox is non-empty. "Sync now" button available everywhere.
- **Offline:** full read access to cached data, full write capability (queued). App must survive "log entry while offline → close app → reopen online later → entry syncs cleanly, no duplicates" as a test case before Phase 1 is done.
- **Not using PowerSync / ElectricSQL** — they're real options but overkill for one user on two devices. The protocol above is ~200 lines each side. If sync gets painful later, PowerSync is the escape hatch without a DB change.

## Stack — locked

- Tauri v2 (mobile + desktop) + React + Vite + TypeScript
- `@yappaflow/ui` for tokens (respect the tsup cross-layer + "use client" quirks)
- TanStack Query against the backend
- Recharts for time-series
- SQLite via `tauri-plugin-sql` for local cache + offline queue
- Drizzle ORM on the backend (types shared with client)
- Hono on the backend (default)
- Biometric lock on app open (Face ID / Touch ID / fingerprint)

## Phase 1 scope — one session

Ship an end-to-end skeleton where Finance already earns its weight.

1. **Monorepo inspection.** Propose repo shape — two new apps (`apps/ops-console` client, `apps/ops-console-api` backend) inside the Yappaflow monorepo vs sibling repo. One-line reason. If Tauri's Rust crate or the mobile build conflicts with pnpm workspace tooling, say so before creating files.
2. **Scaffold backend.** Hono + Postgres + Drizzle. One migration covering: `projects`, `finance_entries`, `scheduled_entry_rules`, `vendor_sources`, `vendor_poll_runs`, `sync_log`. Every table has ULID `id` + `created_at` + `updated_at` + `deleted_at`. Single-API-key auth middleware. Health endpoint. `GET /sync?since=<ts>` returning deltas across every table. Upsert-by-id write endpoints.
3. **Scaffold client.** Tauri v2 with mobile support enabled (confirm current Tauri mobile stability first). React + Vite + TS. `@yappaflow/ui` wired. Theme toggle (light default). Responsive shell: sidebar on desktop, bottom tabs on mobile. Project switcher. Biometric lock on open. **Local SQLite mirroring the server schema + `outbox` table for the write queue. Sync worker that pulls deltas + drains outbox. Sync-status indicator (last-synced timestamp, pending-writes badge, "Sync now" button) visible on every screen.**
4. **Main Dashboard — real data.** MTD numbers pulled from the backend. Per-project tiles (Yappaflow real, one placeholder). Upcoming scheduled entries (read from the rules table). Recent alerts (empty for now but the component renders).
5. **Finance — real data, three modes working.**
   - Manual entry form (fast on mobile — a single-screen flow with big tap targets).
   - Scheduled rule CRUD (e.g., "rent, 15,000 TRY, 1st of every month, category: rent"). Backend cron implemented even if it runs only on a dev schedule for testing.
   - **One** auto adapter — pick the simplest (DeepSeek or OpenRouter) — polling on the backend and writing entries. Dedup by `(source, external_id)`.
6. **Services / AI Vendor / Business Snapshot / Alerts — mocked but responsive.** TanStack Query with a mock data-source layer so Phase 2 swaps in live data without rewriting panels.
7. **Sync acceptance test.** Before Phase 1 is done, this must pass manually: open the app online → log a manual finance entry → confirm entry on server → go offline (airplane mode) → log a second entry → close the app → reopen offline (entry is visible from cache) → go online → confirm both entries on server, no duplicates, sync-status indicator shows "Last synced moments ago" with pending count 0.

**Do not try to finish the whole plan. Phase 1 only.** The Android build does not have to run in Phase 1 — but the code has to be mobile-ready (responsive layout, no desktop-only APIs) so Phase 2 is just `tauri android dev`.

## Constraints you must carry

- **Light default, dark toggle mandatory. Both platforms.**
- **Biometric lock on app open.** Non-negotiable — finance data on a phone that can be lost.
- **One API key auth** stored in keychain. No login screens, no OAuth, no user table.
- **Ops Console never writes to Yappaflow's main DB.** It reads for the income auto-adapter only.
- **UI copy direct, no idioms.** Non-native English writer on the team.
- **Every panel answers a real question in under 3 seconds.** Redesign before proceeding if it doesn't.
- **Currency:** canonical amount + currency on every entry; display USD and TRY side-by-side in Finance views.
- **`DesignDna.schemaVersion` is load-bearing elsewhere** — if this app ever reads it later, bump + consumer audit. Not your problem in Phase 1.

## Before you write any code

Propose, in one message, and wait for my go:

- Repo placement decision with a one-line reason.
- Final app name and window title — pitch one from "Ops Console" / "Mirza Console" / "HQ".
- Current state of Tauri v2 mobile (is it the right path today?) with a one-line citation.
- Backend framework decision (Hono confirm, or pitch alternative).
- ASCII sketch of: the Main Dashboard, the Finance panel (desktop + mobile variants), the project-switcher shell.
- TypeScript types for: `Project`, `FinanceEntry`, `ScheduledEntryRule`, `VendorSource`, `ServiceHealth`, `AiVendorUsage`, `BusinessMetric`, `Alert`.
- Questions I must answer before the Finance auto-adapter ships — at minimum: which payment processor Yappaflow uses (Iyzico / Stripe / bank transfer / other), which auto-outcome adapter to build first (DeepSeek vs OpenRouter — whichever has the cleaner billing API), primary currency default.

Once I approve, scaffold in one pass and show me screenshots of: the Main Dashboard with live backend data, the Finance panel with one manual entry and one scheduled rule working, and the four mocked ops panels rendering in the responsive shell. Then stop and wait for feedback.

## Working preferences

- End-to-end execution welcome when I'm AFK. Don't stall on trivial confirmations.
- Don't correct my English, just understand and keep moving.
- If you hit the tsup / "use client" quirk, or any Tauri mobile gotcha, ping me with the exact error before guessing.
