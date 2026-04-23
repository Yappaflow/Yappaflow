# Liman — Plan

*Liman — Turkish for "harbor / port". Where all of Yusuf's projects dock. Fitting for someone who lives in Samsun, a Black Sea harbor city.*

A cross-platform admin app for running Yusuf's projects as a business. Desktop (macOS) + mobile (Android), shared codebase. Not a customer-facing tool — this is the operator's cockpit, for watching services, AI spend, funnel health, **every dollar in and out**, and the health of every project, in one place.

Multi-user from day one — Yusuf + his brother in MVP, designed to welcome future hires without a rewrite.

## Platforms

- **macOS desktop** — primary daily driver.
- **Android** — companion app for on-the-go checks and quick finance entries. Both Yusuf and his brother use this.
- **iOS** — free with the same Tauri v2 codebase. Ship when convenient.
- **Windows / Linux desktop** — not a priority.

One codebase (Tauri v2 mobile + desktop), responsive layout. The mobile build is not a stripped-down version — it's the same app reshaped for a small screen.

## Users & access — the multi-user model

Liman is a shared workspace with role-based access.

**Roles:**
- **Owner** — Yusuf. Full access. Only role that can invite members, remove members, change workspace settings.
- **Admin** — Brother (and future trusted hires). Full data access, identical views and capabilities to Owner except for member management.
- **Member** — reserved for future hires with limited access. Schema supports it, not implemented in MVP.
- **Viewer** — reserved for future read-only access. Schema supports it, not implemented in MVP.

**MVP reality:** Owner and Admin behave identically on every data view. The only enforcement difference is "can invite / remove members". This keeps Phase 1 code simple while leaving the door open.

**Attribution:** every row on every table has `created_by_user_id` and `updated_by_user_id`. Every finance entry, every edit, every action carries a trace of who did it. UI shows "by Brother" next to edits Yusuf didn't make, and vice versa. Important for finance auditability when more people use it.

**Auth:** email + password with Argon2 hashing on the backend. No OAuth, no social login, no SSO — overkill for a private tool.

**Invite flow:** Owner opens "Members" screen → "Invite" → picks a role → gets a one-time invite link with an embedded signed token → sends it out-of-band (WhatsApp, Signal, whatever). Invitee opens the link in a browser or the app → sets their password → account is created and added to the workspace. No email service dependency. Invite links expire in 72 hours; regenerable.

**Sessions:** long-lived JWTs stored in the OS keychain on each client. Expire after 30 days of inactivity. Biometric lock on app open unwraps the session token — so even if the phone is lost, no access without fingerprint/Face ID.

**Revocation:** Owner can open "Members" screen and revoke any member's access. All their sessions invalidate on next API call. Future nicety: "sign out this other device" — not in MVP.

## Architecture — client/server, sync-native

- **Backend service** — Node + Hono + Postgres, hosted on Railway. Canonical store for everything. Runs vendor pollers, the recurring-entry cron, serves one API for all clients. Multi-user auth; workspace-scoped data.
- **Clients (desktop + mobile)** — Tauri v2, React + Vite + TypeScript. Local SQLite as cache + offline write queue. Keychain-backed session token. Biometric lock on open.
- **Separation from Yappaflow's own DB** — Liman gets its own Postgres on its own Railway project. Liman *reads* from Yappaflow's Postgres (for income auto-adapter) but never writes to it.

## Sync — first-class feature

Desktop and mobile are two (or more) clients of one truth. Sync must work from day one.

- Every row, every table: ULID `id` generated on the client, plus `created_at`, `updated_at`, `deleted_at`, `created_by_user_id`, `updated_by_user_id`. Server upserts by ID → idempotent writes.
- **Pull:** `GET /sync?since=<ts>` returns creates / updates / tombstones across every table in the workspace. Client applies to local SQLite. Called on app open, window focus, 30-second poll, manual "Sync now".
- **Push:** writes land in local SQLite immediately (optimistic UI). A local `outbox` table queues the HTTP calls. A worker drains it.
- **Conflict resolution:** last-write-wins by `updated_at`. Rare in practice for a small shared workspace, but handled correctly.
- **UI:** sync-status indicator on every screen — "Last synced X ago" + pending-writes badge + "Sync now" button.
- **Offline:** full read + queued writes. Entries sync cleanly on reconnect, no duplicates.
- **Real-time nudge (Phase 2):** Server-Sent Events push "something changed, pull now" notifications so devices stay in sync without waiting for the 30-second poll.

Not using PowerSync / ElectricSQL — they're real options but overkill for this scale. Hand-rolled sync is ~200 lines per side, under our control. PowerSync remains the escape hatch if sync ever gets harder.

## Multi-project from day one (the other multi)

Liman houses multiple of Yusuf's projects. Yappaflow is the first. Shell is project-aware from Phase 1 — sidebar lists projects, every data row has an optional `project_id`, cross-project rollups live on the Main Dashboard. Other projects slot in later without a rewrite.

## App shape

### Main Dashboard (opening screen — All Projects view)
The first thing anyone sees every time they open the app. A one-glance summary across every project:

- Big numbers at top: MTD income, MTD outcome, MTD net, current runway.
- Per-project tiles: each project gets a row/card with its health pill (green/yellow/red), MTD spend, any active alerts.
- Recent alerts feed across all projects.
- Upcoming scheduled finance entries in the next 7 days (rent due, subscriptions renewing, etc.).

Proves the app's value in 5 seconds.

### Navigation
- **Desktop:** left sidebar — "All Projects" (= Main Dashboard), then one row per project, then top-level links to Finance, Alerts, Members (owner only).
- **Mobile:** bottom tab bar — Home (Main Dashboard), Finance, Alerts, Projects (list + drill-in). Members screen accessed from a settings menu.

### Top-level views (cross-project)
- **Main Dashboard.**
- **Finance** — full panel with filters, entry forms, scheduled rules, import/export.
- **Alerts** — rolled-up anomalies across all projects and services.
- **Members** (owner-only) — list members, invite, revoke.

### Per-project views
- **Services** — uptime, latency, deploys.
- **AI Vendor** — AI spend and errors, with stage breakdown (Yappaflow-specific: analysis/planning/generation).
- **Business Snapshot** — project-specific funnel metrics.

## Finance — how income and outcome capture works

Three ingestion modes, all writing to one `finance_entries` table:

### Automatic — API-driven
Backend pollers pull real data from each integrated source and write entries. Dedup by `(source, external_id)`.

**Income (auto):**
- Yappaflow's main Postgres — customer payments booked there become income entries tagged `project: yappaflow`.
- Payment processor (Iyzico / Stripe — TBD) — webhook or polling.

**Outcome (auto):**
- DeepSeek billing + usage API.
- OpenRouter `/credits` + `/generation` logs.
- Railway billing API.
- Vercel billing (if used).
- Any third-party SaaS with a billing API.

Each source is a small adapter: `fetch → normalize → upsert`. Cadence: hourly for AI vendors (volatile), daily for stable billing APIs.

### Scheduled — recurring rules
Predictable costs set once, forgotten. Rent "15,000 TRY, 1st of every month". Domain renewal "$12 yearly on date X". Backend cron runs once a day at 00:05 local time, creates entries for rules whose scheduled date arrived. Each rule has a UI for edit/pause/delete. Upcoming scheduled entries show on Main Dashboard so nothing surprises anyone.

### Manual — one-off entries
For anything the other two miss. Form: date, amount, currency, category, project tag, note, optional receipt photo (mobile-friendly). **Must be fast on mobile** — "I just paid someone in cash" should be 3 taps. `created_by` attribution means you can tell who logged what.

### All three modes write to one table
Each entry has a `source` field (`"manual" | "scheduled:<rule_id>" | "auto:<adapter>"`). Manual edits to auto entries are tracked so the next poll doesn't overwrite them.

### Finance views
- P&L: MTD net, last 3 months trend, burn rate, runway.
- By category: where money goes.
- By project: which projects carry themselves.
- By person: who logged what (useful when there are multiple users).
- Upcoming: scheduled entries in the next 30 days.
- History: searchable / filterable list.

## MVP panels beyond Finance

### Services (per-project)
Live status of the selected project's services. Yappaflow: main API + `apps/yappaflow-mcp` on Railway. Uptime, p50/p95 latency, 5xx rate, last deploy SHA + timestamp. Green / yellow / red pill per service.

### AI Vendor (per-project)
Yappaflow: DeepSeek + OpenRouter. Today's spend, MTD spend vs budget, error rate, tokens in/out. Breakdown by the three stages (analysis / planning / generation). Fallback events timeline.

### Business Snapshot (per-project)
Yappaflow: projects created, ZIPs exported, active agencies, last 30 days. Top 5 agencies by projects this month. Read-only pull from Yappaflow's Postgres.

### Alerts (cross-project)
Rolled-up anomalies from the last 24h across all panels, all projects. Build breaks, schema drift, latency spikes, budget overruns, unexpected spend, failed payments, auth anomalies. Clickable into the underlying panel. Push notifications on mobile for red alerts.

## Out of scope for MVP

No write-backs to external systems. No restarting services, no deploying, no sending mails, no moving money. Read-only cockpit plus internal Liman writes (finance entries, members, etc.).

## Stack

### Clients (desktop + mobile)
- **Tauri v2** mobile + desktop — macOS / Android / iOS from one codebase.
- **React + Vite + TypeScript.**
- **Responsive from day one** — Tailwind breakpoints; mobile = bottom tabs, desktop = sidebar.
- **`packages/ui`** — forked-minimal tokens + primitives inside the Liman repo. Owned here, independent of Yappaflow's design system.
- **TanStack Query** against the backend.
- **Recharts** for time-series.
- **SQLite** via `tauri-plugin-sql` — local cache + outbox.
- **Keychain-backed secure store** for the session token.
- **Biometric lock on open** (Face ID / Touch ID / fingerprint).

### Backend
- **Node + Hono** on Railway.
- **Postgres** on Railway (Liman's own DB, separate Railway project from Yappaflow).
- **Drizzle ORM** — shared TypeScript types with the client via `packages/types`.
- **Argon2** for password hashing.
- **JWT** for session tokens (jose or similar library).
- **Vendor adapters** — small modules, `poll(): Promise<FinanceEntry[]>` interface.
- **Scheduled engine** — daily cron + rule table. No BullMQ needed at this scale.

### Theme
Light default, dark toggle mandatory, both platforms.

## Repo

Single new GitHub repo named **`liman`**. pnpm workspace with:
- `apps/liman-app/` — Tauri v2 client (desktop + mobile).
- `apps/liman-api/` — Hono backend.
- `packages/ui/` — forked-minimal design system, owned inside Liman.
- `packages/types/` — shared TypeScript types (finance entry, project, user, sync payload, etc.) consumed by both app and api.

## Phases

**Phase 1 — end-to-end skeleton + auth + sync, one session.**
- Scaffold backend (Hono + Postgres + Drizzle). Migration covers: `users`, `sessions`, `invites`, `projects`, `workspace_members` (future-proofing), `finance_entries`, `scheduled_entry_rules`, `vendor_sources`, `vendor_poll_runs`, `sync_log`. Every data table has ULID id + timestamps + author columns.
- Seed owner user (Yusuf). Generate one invite link for the brother as part of a seed script so manual testing works on day one.
- Backend endpoints: `POST /auth/login`, `POST /auth/accept-invite`, `GET /sync?since=`, upsert-by-id writes for each entity.
- Scaffold Tauri v2 client. Login screen → sync → main app. Invite-acceptance screen accessible via the invite link.
- Theme toggle, responsive shell, sync-status indicator, biometric lock on open.
- Main Dashboard + Finance panel end-to-end on real data: manual entry + scheduled rule CRUD + one auto adapter (pick the simplest: DeepSeek or OpenRouter).
- Services / AI Vendor / Business Snapshot / Alerts mocked but responsive.

**Phase 1 acceptance tests:**
1. Yusuf logs in on desktop, creates a manual finance entry. Entry is on the server.
2. Yusuf generates an invite link for the brother, sends it out-of-band. Brother opens link on his Android device (or desktop for Phase 1), sets password, lands in the app.
3. Brother sees the same finance entry Yusuf created. Brother creates another entry. Yusuf's desktop sees it within 30 seconds (next poll).
4. Brother goes offline, logs a cash expense, closes the app, reopens offline (entry visible from cache), comes back online — entry syncs cleanly, no duplicates, `created_by` shows brother.

**Phase 2 — Android build + live ops data + SSE push.** `tauri android dev` working. Wire remaining vendor adapters (Railway, Vercel). Wire Services + AI Vendor panels to live data. SSE push so cross-device updates land in seconds, not 30-second poll.

**Phase 3 — Business Snapshot + Alerts rules + push notifications + member management UI.** Wire Yappaflow Postgres (RO). Implement anomaly rules. Push notifications on mobile for red alerts. Flesh out Members screen (list members, revoke access, regenerate invite).

**Phase 4 — routines tab.** Fold Yappaflow's scheduled routines into a dedicated tab.

**Phase 5 — plug in second project.** Validate the multi-project shell.

**Step zero** (before Phase 2's AI Vendor panel): confirm `apps/yappaflow-mcp` emits `{stage, provider, latency, tokens, cost}` per call. Add if missing.

## Constraints carried forward

- Light default, dark toggle mandatory, both platforms.
- Biometric lock on app open, both platforms.
- UI copy direct, idiom-free.
- Every panel answers a real question in under 3 seconds.
- Currency: canonical amount + currency on every entry; USD + TRY side by side.
- `created_by` / `updated_by` attribution on every data row.
- Liman never writes to Yappaflow's main DB.

## Open questions for the kickoff session

1. Payment processor Yappaflow actually uses (Iyzico / Stripe / bank transfer / other) — drives the first income auto-adapter.
2. Primary currency default in Finance (USD / TRY / dual).
3. Which auto-outcome adapter to build first in Phase 1 — DeepSeek or OpenRouter, whichever has the cleaner billing API.
4. Is Yappaflow's main Postgres reachable from a Railway service in a different Railway project? If not, plan for a tunnel / SSH / IP allowlist before Phase 3.
5. Step zero — is per-stage logging in `apps/yappaflow-mcp` already in place?
6. App icon direction — harbor / port / anchor / lighthouse imagery? (Cosmetic, doesn't block Phase 1.)

## Success signal

Two weeks after Phase 3 ships: Yusuf opens the app on phone at breakfast, sees the month's net + any red alerts in under 10 seconds. His brother logs a cash expense on his Android in under 5 seconds while out. Both see the same state. Yusuf never opens Railway, DeepSeek, or OpenRouter billing pages again.
