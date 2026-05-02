# Builder Connection — Day 1 (Friday 2026-05-02)

Companion to `BUILDER-CONNECTION.md`. Read that first if anything below is unclear.
Today's goal: get the **server side of Phase 8.5** to a working state so a curl can
generate a SiteProject from a brief and persist it on a `Project`. Builder + web edits
come on Days 2–4.

---

## Before you start coding (10 min, mandatory)

Two decisions from `BUILDER-CONNECTION.md` §7 you need to lock in before the first
commit. Don't skip — both shape the schema you'll write.

- [ ] **Decision A.** `Project.siteProject` as Mongoose `Schema.Types.Mixed` (Zod
      validates app-side) **vs.** full nested Mongoose schema. Recommended: `Mixed`
      (single source of truth = `@yappaflow/types`).
- [ ] **Decision B.** Bearer-token-in-URL handoff (5 min TTL + single-use jti)
      **vs.** parent-domain cookie sharing. Recommended: token-in-URL (matches existing
      `localStorage["yappaflow_token"]` pattern both apps already share).

If you change either, update §3.1 / §3.3 in `BUILDER-CONNECTION.md` before you start.

---

## Day 1 — server foundation

Scope: Mongo field + MCP wrapper + service + read/write router + generate route +
CORS dev origin + a smoke test. No auth-handoff routes yet (those go on Day 2 alongside
builder edits).

Estimated time: 4–6 hours of focused work. Order matters — earlier items unblock later.

### Block 1 — schema + types (45 min)

- [ ] Open `server/src/models/Project.model.ts`. Add four fields to `IProject` and
      `ProjectSchema`: `siteProject?: unknown` (typed as `Mixed`),
      `siteProjectVersion?: number` (default 0), `siteProjectUpdatedAt?: Date`,
      `siteProjectGeneratedAt?: Date`. No new indexes.
- [ ] `npm run build --workspace=server` — confirm Mongoose types still compile.

### Block 2 — MCP wrapper (30 min)

- [ ] Open `server/src/services/yappaflow-mcp.service.ts`. Add `buildSiteProjectRpc`
      next to `buildSiteRpc`. Same `callTool` shape — tool name
      `"build_site_project"`, body `{ brief, mergedDna, overrides? }`, return type
      `{ siteProject: unknown; summary: string; nextSteps: string[] }`. Keep
      `mergedDna` typed as `unknown` to match existing pattern.
- [ ] Quick sanity: `curl -X POST $YAPPAFLOW_MCP_URL/rpc/build_site_project -H
      "content-type: application/json" -H "authorization: Bearer $MCP_AUTH_TOKEN" -d
      '{"brief": <fixture>, "mergedDna": <fixture>}'` returns a parsed siteProject.

### Block 3 — site-project service (1 hr)

- [ ] Create `server/src/services/site-project.service.ts`. Three exports:
      `getSiteProject(projectId, agencyId)`, `saveSiteProject(projectId, agencyId,
      project, baseVersion)`, `generateSiteProject(projectId, agencyId, { brief,
      mergedDna, overrides })`. Validate every read + write with
      `SiteProjectSchema.parse` from `@yappaflow/types`. Throw `NotFoundError` for
      missing/forbidden, `ConflictError` for stale `baseVersion`. Bump
      `siteProjectVersion` and stamp `siteProjectUpdatedAt` on every successful save.
- [ ] Define `NotFoundError` and `ConflictError` locally — match the error pattern
      `reference.route.ts` already uses (plain `Error` subclasses with a `statusCode`).

### Block 4 — read/write router (45 min)

- [ ] Create `server/src/routes/site-project.route.ts`. `GET /:projectId` and
      `PUT /:projectId`. Pattern-copy `requireAuth` from `reference.route.ts`. Map
      service errors to status: `NotFoundError → 404`, `ConflictError → 409 { current }`,
      Zod parse errors → `400 { detail }`.
- [ ] Wire it in `server/src/index.ts` next to the deploy router:
      `app.use("/site-projects", cors(corsOptions), apiLimiter, express.json(),
      siteProjectRouter);`. Mount **before** the GraphQL block so the JSON parser is
      scoped right.

### Block 5 — generate route (30 min)

- [ ] Open `server/src/routes/reference.route.ts`. Add `POST /reference/build-site-project`
      below the existing `POST /reference/build`. Body shape mirrors `build`:
      `{ brief, selection | mergedDna, overrides?, projectId }`. If `selection` is
      passed, call `mergeDnaRpc` first (same pattern as `/reference/build`). Then call
      `siteProjectService.generateSiteProject` and return
      `{ projectId, version, siteProject }`.
- [ ] **Open question:** does this route accept an existing `projectId` or create a
      new `Project` row? Day-1 answer: require `projectId` (caller creates the Project
      first via the existing GraphQL `createProject` mutation). Document the call
      order in a comment.

### Block 6 — CORS dev origin (5 min)

- [ ] `server/src/index.ts:42` — append `"http://localhost:3040"` to `allowedOrigins`
      so the dev builder can hit the API. (Prod uses `EXTRA_ALLOWED_ORIGINS` later.)

### Block 7 — smoke test (45 min)

- [ ] Bring up the stack: `npm run dev` in repo root (web + server) plus the deployed
      MCP via `YAPPAFLOW_MCP_URL`.
- [ ] Login via `/auth` → grab the bearer JWT from
      `localStorage.getItem("yappaflow_token")` in DevTools.
- [ ] Create a Project via GraphQL: `mutation { createProject(input: { name: "test",
      clientName: "x", platform: "yappaflow" }) { id } }`. Save the `id`.
- [ ] `curl -X POST http://localhost:4000/reference/build-site-project -H
      "authorization: Bearer $TOKEN" -H "content-type: application/json" -d
      '{"projectId": "$ID", "brief": <fixture>, "mergedDna": <fixture>}'` →
      expect `200 { projectId, version: 1, siteProject }`.
- [ ] `curl http://localhost:4000/site-projects/$ID -H "authorization: Bearer $TOKEN"`
      → expect the same body back, `version: 1`.
- [ ] `curl -X PUT … -d '{"siteProject": {...}, "baseVersion": 0}'` → expect `409
      { current: 1 }` (stale `baseVersion`).
- [ ] `curl -X PUT … -d '{"siteProject": {...}, "baseVersion": 1}'` → expect `200,
      version: 2`.

### Block 8 — commit + write-up (30 min)

- [ ] One commit per block ideally — atomic, easy to revert if Mongo or MCP misbehave.
- [ ] Update `docs/pivot/PHASES.md` with a Phase 8.5 status line (in progress, blocks
      8.6 and 8.7).
- [ ] Note any deviation from `BUILDER-CONNECTION.md` in that doc's "open questions"
      section so Day 2 doesn't start from a stale plan.

---

## End-of-Day-1 success check

The following all pass:

1. Server compiles cleanly: `npm run build --workspace=server`.
2. Existing tests pass: `npm test --workspace=server` (no regressions).
3. The smoke test in Block 7 — generate, fetch, conflict, save — all behave as
   described.
4. A second `Project` row created without ever calling the new route still works
   end-to-end through the legacy `/deploy/*` flow (regression check).

If any of those fail, **don't** start Day 2. Diagnose first.

---

## Days 2–5 — preview (rough sizing only)

These exist so you can see the runway. Detailed breakdown comes the night before each.

**Day 2 — auth handoff + tests (Phase 8.5 finish)**
- `server/src/services/builder-token.service.ts` (mint + verify + single-use jti set).
- `server/src/routes/auth-session.route.ts` — add `POST /auth/builder-token` and
  `POST /auth/exchange-builder-token`.
- Vitest integration tests for `GET / PUT / POST build-site-project` + the `409` path.
- GraphQL `Project` extensions: `hasSiteProject`, `siteProjectVersion`,
  `siteProjectUpdatedAt`. Resolver edits.

**Day 3 — `apps/builder` server-aware loading (Phase 8.6, half)**
- New exports in `apps/builder/src/lib/server-api.ts`: `fetchSiteProject`,
  `saveSiteProject`, `whoami`.
- `loadProjectFromServer` in `persistence.ts` + new top-level `loadProject` priority
  chain (server → localStorage → fixture).
- `searchParams` handling in `/p/[projectId]/page.tsx`; token exchange + `router.replace`
  in `EditorShell`.

**Day 4 — `apps/builder` autosave + conflict UX (Phase 8.6, half)**
- Hook autosave debounce → `saveSiteProject` with `version`.
- Conflict banner UI (existing toast slot).
- Manual two-tab test: open same project in two windows, confirm banner.

**Day 5 — `web/` entry points (Phase 8.7)**
- New `web/src/lib/builder-handoff.ts`.
- New `buildSiteProject` client in `web/src/lib/reference-api.ts`.
- "Open in Builder" terminal action on `/studio/new-reference`.
- "Open in Builder" link in `CommandCenter` for projects with `hasSiteProject: true`.
- End-to-end: brief → builder → save → reload → state preserved.

If everything goes smoothly, **Phase 8.5–8.7 ships Friday 2026-05-09**, with Phase 8.8
(docs) and Phase 8.9 (verification) the following Monday.

---

## Things I won't touch on Day 1

Just to keep scope honest:

- `apps/builder/*` — nothing changes. The builder doesn't talk to the new routes yet.
- `web/*` — same.
- `packages/types`, `packages/sections`, `apps/yappaflow-mcp` — no edits at all.
- `DeploymentHub.tsx` — leave the legacy ZIP flow exactly as it is.
- The existing `/reference/build` route — keep it ringing for callers that want
  platform files.

If Day 1 starts pulling at any of those, stop and re-read this checkbox.
