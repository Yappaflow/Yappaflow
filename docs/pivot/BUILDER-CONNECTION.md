# Yappaflow — Builder Connection Blueprint

**Status:** proposal, drafted 2026-05-01, **rewritten against the actual codebase** the
same day after the previous draft drifted from current code (memory was stale on the
LLM vendor and on auth shape). Companion to `BUILDER-PIVOT.md` and `PHASES.md`.

This document covers the **plumbing** between the agency dashboard (`web/`) and the
in-house builder (`apps/builder`). The pivot brief tells you *what* the builder is and
*why*; this doc tells you *how* the two apps talk to each other end-to-end.

Every fact below was checked against the file it cites on 2026-05-01. If something here
disagrees with the code, the code is right and this doc is stale — open an issue.

---

## 1. The bridge in one sentence

`web/` is the agency's front door. The agency pastes a brief, the **reference flow**
(`/reference/classify → /reference/search → merge_dna`) produces a `MergedDna`, then a
**new** `/reference/build-site-project` route calls MCP `build_site_project` to assemble
a canonical `SiteProject`, which is persisted on the existing `Project` Mongo document.
`web/` then redirects the agency to `apps/builder` for visualize-and-tweak. The builder
saves changes back to the same record. CMS export happens later (Phase 10) from that
record.

```
web/             server/                    apps/yappaflow-mcp     apps/builder
(dashboard)  ─►  /reference/build-site-     /rpc/build_site_       /p/:id
                  project (NEW)         ──► project (EXISTS)       (loads via
                  → save to Project.                                /site-projects/
                    siteProject                              ◄───── :id, edits, saves)
```

Three things are "shared state" in this picture: the **`Project.siteProject` field**
(added in Phase 8.5; server is source of truth, Mongo is the store), the **bearer JWT**
in `localStorage["yappaflow_token"]` (already shared between `web/` and `apps/builder`
by name today — neither app duplicates auth state), and the **type contracts**
(`@yappaflow/types`, already in place at `schemaVersion: 3`).

---

## 2. Today's state — verified against the code

### `web/` — Next.js 15.3 dashboard (port 3000 in dev)

The agency lands at `web/src/app/[locale]/dashboard/page.tsx` which renders
`DashboardShell` and switches between command / engine / **deploy** / settings views.

The **legacy build flow** lives in `web/src/components/dashboard/DeploymentHub.tsx`. It
drives `startDeploy → extractIdentity → hero-pick → startBuild → downloadZip` against
the `/deploy/*` REST endpoints. This still ships ZIPs to agencies and we don't break it.

The **reference flow** (the actual entry point for the pivot) lives in
`web/src/app/[locale]/studio/new-reference/page.tsx`. It calls `web/src/lib/reference-api.ts`
which hits `POST /reference/classify`, `POST /reference/search`, and currently
`POST /reference/build` (legacy — returns platform files). This is the page that gets
extended in Phase 8.7.

Auth surface (`web/src/lib/auth-api.ts`):

The bearer JWT lives in `localStorage["yappaflow_token"]` and is sent as
`Authorization: Bearer <token>` to the API server (port 4000) for all GraphQL + REST
calls. There is also a session cookie named `token` set on the **web origin only** via
`POST /api/auth/session` (a Next.js rewrite to the API's `/auth/session` route). That
cookie is read by `web/`'s middleware to gate `/dashboard`. **It is not the cross-app
auth mechanism** — `apps/builder` already uses the same `localStorage["yappaflow_token"]`
key as `web/` (see `apps/builder/src/lib/server-api.ts`).

### `server/` — Express 5 + Apollo + Mongoose 8 (port 4000 in dev)

Wired in `server/src/index.ts`. Mount points (no `/api/` prefix anywhere):
`/auth`, `/webhook/*`, `/events`, `/ai`, `/import`, `/deploy`, `/reference`, `/graphql`.

CORS is set up with a function-based origin allowlist plus an `EXTRA_ALLOWED_ORIGINS`
env var (comma-separated) so we can whitelist new previews without redeploys. Default
allow includes `localhost:3000-3002`, `yappaflow.com`/`.app` apex+www, and a regex for
`*.vercel.app` — that regex covers `apps/builder`'s Vercel preview URLs too.
`credentials: true` is set; CORS blocks fail silently (no `Error`-callback) to avoid
opaque 400s.

Auth context (`server/src/middleware/auth.ts`): reads `Authorization: Bearer …` first,
falls back to `req.cookies.token` (cookie-parser-mounted). Returns `{ userId }`. JWT-only;
no session table.

The reference router (`server/src/routes/reference.route.ts`) has a `requireAuth(req, res)`
helper that returns the JWT-verified userId or sends `401`. Reuse this verbatim in the
new routes — same pattern, same error shape.

The MCP REST client (`server/src/services/yappaflow-mcp.service.ts`) wraps four tools
today: `classifyBrief`, `searchReferences`, `buildSiteRpc` (legacy), `mergeDnaRpc`,
`mcpHealth`. **It does NOT yet have a `buildSiteProjectRpc` wrapper** — adding one is the
first concrete edit in Phase 8.5. URL is `process.env.YAPPAFLOW_MCP_URL`, optional bearer
via `YAPPAFLOW_MCP_TOKEN`.

The `Project` Mongoose model (`server/src/models/Project.model.ts`) has `agencyId`,
`platform` enum (`shopify | wordpress | webflow | ikas | custom | yappaflow`), `phase`,
identity sub-document with `products[]` (a different `IProduct` shape from
`@yappaflow/types`'s `Product` — they are not the same type), the hero-chooser
sub-document with embedded HTML variants, and a granular build-phase enum. **No
`siteProject` field today.** Project IDs are MongoDB `ObjectId`s.

### `apps/yappaflow-mcp` — MCP server on AWS Fargate (eu-central-1)

Three-stage LLM split, all via a single `OPENROUTER_API_KEY` (single gateway, not
DeepSeek-primary-with-fallback). From `apps/yappaflow-mcp/src/config.ts` lines 51–57:

```ts
analysisModel:   env("AI_ANALYSIS_MODEL",   "google/gemini-2.5-flash-lite")!,
planningModel:   env("AI_PLANNING_MODEL",   "anthropic/claude-sonnet-4-6")!,
generationModel: env("AI_GENERATION_MODEL", "anthropic/claude-sonnet-4-6")!,
```

The `build_site_project` tool is registered in
`apps/yappaflow-mcp/src/mcp/tools.ts` (lines 227–256) and implemented as
`assembleSiteProject()` in `apps/yappaflow-mcp/src/tools/build-site.ts`. Signature:

```ts
input  : { brief: object, mergedDna: object,
           overrides?: { siteTitle?: string, logoText?: string } }
output : { siteProject: SiteProject, summary: string, nextSteps: string[] }
```

It runs **stateless** — no DB write — and uses `SECTION_DATA[type].defaultContent` from
`@yappaflow/sections` to seed each section. Phase 9 will replace the seed-from-defaults
step with an LLM content pass. Available via REST mirror at `/rpc/build_site_project`.

### `apps/builder` — Next.js 15 (port 3040 in dev)

`/p/[projectId]/page.tsx` is a thin server component that unwraps the param and renders
the client-side `EditorShell`.

`apps/builder/src/lib/persistence.ts` already does v1→v2→v3 migrations on load
(slug-based `kind` inference, then product-library extraction). It loads from
`yf.project.<projectId>` localStorage and dedupes via the `yf.projects` index.

`apps/builder/src/lib/server-api.ts` already calls `/deploy/projects/${projectId}/products`
on the API server with `Authorization: Bearer ${localStorage.getItem("yappaflow_token")}`.
This is the pattern to extend — same key, same header, same base URL via
`process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"`.

### `packages/types` and `packages/sections`

`SiteProjectSchema` is at `schemaVersion: 3` (`packages/types/src/site.ts` line 216)
with top-level `productLibrary: Product[]`. **19 section types** in `SECTION_TYPES`:
the 10 MVP, plus 8 Phase 8b types (`faq`, `pricing`, `stats-band`, `timeline`,
`logo-cloud`, `team`, `newsletter`, `contact`), plus 1 Phase 8d type
(`product-detail`). Order is load-bearing — adapters key mapper tables on it.

---

## 3. Architecture decisions (revised against code)

These are the calls that shape every phase below. Each lists trade-off and the chosen
option. Everything here is implementable without changing any existing code path.

### 3.1 Where `SiteProject` lives — **as a `Mixed` field on `Project`**

The alternative was a new `SiteProject` collection, or persisting MCP-side. Adding it to
the existing `Project` document keeps one record per project, reuses the existing
`agencyId` ownership and the GraphQL surface, and lets us migrate gradually — old
projects get `siteProject: null` and continue using the legacy `/deploy/*` flow.

`Project` gains four fields (added to `server/src/models/Project.model.ts`):

```ts
siteProject:           Schema.Types.Mixed,  // validated app-side via SiteProjectSchema
siteProjectVersion:    { type: Number, default: 0 },
siteProjectUpdatedAt:  Date,
siteProjectGeneratedAt: Date,
```

`Mixed` is right here because Mongoose's nested-schema enforcement would fight Zod over
the same shape, and Zod is the one that owns `@yappaflow/types`. We validate at the
service boundary (read and write) using `SiteProjectSchema.parse(...)`. No history
sub-doc — Mongo doc-size risk. If history is ever needed, add a sibling collection
keyed by `(projectId, version)`. Defer until someone asks.

### 3.2 Concurrency model — **server canonical, optimistic concurrency, no locks**

The builder's localStorage stays as a draft cache (it's good UX and `persistence.ts`
already supports it). Every `PUT` from the builder includes `baseVersion`; server
accepts only when `baseVersion === current`, returns `409 { current: <number> }`
otherwise. The builder shows a banner ("remote version is newer") and lets the user
reload-or-keep. No CRDTs, no server-pushed updates. Multi-user collab is explicitly out
of scope per `BUILDER-PIVOT.md`.

### 3.3 Cross-app auth — **bearer JWT in URL once → `localStorage["yappaflow_token"]`**

This is the smallest possible change because both apps already share the
`yappaflow_token` localStorage key. The flow:

The agency clicks "Open in Builder" in `web/`. `web/` calls a new route
`POST /auth/builder-token` which mints a short-lived JWT (audience `builder`,
TTL ~5 min) signed with the same secret as the regular token. `web/` redirects to
`${NEXT_PUBLIC_BUILDER_URL}/p/<projectId>?session=<token>`. On mount, the builder
extracts `?session`, stores the token in `localStorage["yappaflow_token"]` (or
exchanges it for a regular token via a second new route — see §4.1), and calls
`router.replace` to strip the URL. Subsequent API calls use the same bearer pattern as
today's products fetch.

We **do not** share a parent-domain cookie. The existing session cookie (`token`) is set
on `web/`'s origin only, by design (it's read by Next.js middleware, never travels to
the API). Extending it to the builder origin would require a same-`Domain=` cookie
which is more setup than this pivot needs and gives no extra security beyond a
short-lived bearer.

The risk of token-in-URL is the URL ending up in referrer headers / browser history.
Mitigations: short TTL, single-use (server marks the jti as consumed in an in-memory
or Redis set after first exchange), and `router.replace` strips the param within
milliseconds of arrival.

### 3.4 Where new MCP tool wrappers go — **`server/src/services/yappaflow-mcp.service.ts`, `/reference/*` router**

Add `buildSiteProjectRpc(...)` next to `buildSiteRpc` in the existing service file.
Same pattern, different MCP tool name (`build_site_project`). Mount the new HTTP route
under the existing `/reference/*` router — that file already has `requireAuth`,
`handleMcpError`, and the right CORS/limit middleware via `index.ts:213`. New routes:

```
POST /reference/build-site-project       — calls MCP, persists, returns siteProject
GET  /site-projects/:projectId           — fetch persisted siteProject
PUT  /site-projects/:projectId           — save with optimistic concurrency
```

The first sits under `/reference/*` because it's part of the brief→build pipeline. The
read/write routes get their own router file (`server/src/routes/site-project.route.ts`)
mounted at `/site-projects` because they're not pipeline-flavored.

### 3.5 Where the new auth-handoff route lives — **extend `auth-session.route.ts`**

Add `POST /auth/builder-token` and `POST /auth/exchange-builder-token` to
`server/src/routes/auth-session.route.ts`. It's already CORS-allowlisted and rate-limited
under `authLimiter` via `server/src/index.ts:181`.

### 3.6 What happens to the existing `/deploy/*` and `/reference/build` flows — **kept alive, untouched**

Legacy `/deploy/*` still ships ZIPs through the custom / Shopify / WordPress / Yappaflow
generators. Legacy `/reference/build` still produces platform files. We add the new
`POST /reference/build-site-project` alongside both. Legacy paths can be retired one by
one once `adapters-v2/shopify` (Phase 10) ships.

### 3.7 Boundary discipline — **MCP stays stateless, builder talks only to `server/`**

MCP gets no new responsibilities. Persistence stays in `server/`. `apps/builder` does
**not** call MCP directly — single boundary: builder ↔ server, server ↔ MCP. This
matches the root `CLAUDE.md` non-negotiable #6.

### 3.8 `MergedDna` — **passed through from the reference flow, not regenerated**

`build_site_project` requires `mergedDna`. The reference flow already produces it via
`merge_dna` (the `/reference/build` route does this internally — see
`server/src/routes/reference.route.ts:117–143`). We extend that branch so the same
merged DNA can be handed straight to `build_site_project` instead of `build_site`.
Nothing new to compute; just a different terminal call.

---

## 4. Contracts

### 4.1 New routes

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/reference/build-site-project` | Body matches `/reference/build` (`{ brief, selection \| mergedDna, overrides? }`). Calls `mergeDnaRpc` if needed, then `buildSiteProjectRpc`, then persists onto `Project.siteProject`. Returns `{ projectId, version, siteProject }`. |
| `GET` | `/site-projects/:projectId` | Returns `{ siteProject, version, updatedAt }` or `404`. Auth: bearer JWT, must own the project (`agencyId === userId`). |
| `PUT` | `/site-projects/:projectId` | Body `{ siteProject, baseVersion }`. Validates with `SiteProjectSchema.parse`. `409 { current }` if `baseVersion < current`. Returns `{ version, updatedAt }`. |
| `POST` | `/auth/builder-token` | Mints a short-lived (5 min) JWT scoped to `audience: "builder"`, claims `{ sub: userId, projectId }`. Returns `{ token }`. Rate-limited under existing `authLimiter`. |
| `POST` | `/auth/exchange-builder-token` | Body `{ token }`. Verifies audience `"builder"`, marks single-use, returns a regular bearer JWT for `apps/builder` to store under `localStorage["yappaflow_token"]`. |

GraphQL `Project` gains three thin fields so the `CommandCenter` can decide whether to
render an "Open in Builder" link without fetching the SiteProject body:

```graphql
type Project {
  # ...existing
  hasSiteProject: Boolean!
  siteProjectVersion: Int
  siteProjectUpdatedAt: DateTime
}
```

The full `siteProject` body stays on REST (`GET /site-projects/:id`) — typed JSON over
GraphQL `JSONScalar` is more friction than it's worth.

### 4.2 The `SiteProject` payload

This is the existing schema from `@yappaflow/types` — `schemaVersion: 3`. Every request
and response that crosses a boundary parses it through `SiteProjectSchema.parse(...)`.
The wire `version` field is **not** the schema version — it's the `siteProjectVersion`
row counter used for optimistic concurrency. (Two different versions, easy to confuse.
The route handler names them `baseVersion` / `current` to keep them separated.)

### 4.3 Environment variables

`server/`:

```
BUILDER_PUBLIC_URL=https://builder.yappaflow.com
WEB_PUBLIC_URL=https://app.yappaflow.com
EXTRA_ALLOWED_ORIGINS=https://builder.yappaflow.com   # already supported by index.ts
BUILDER_TOKEN_TTL_SECONDS=300
# JWT_SECRET reused — no new secret needed.
# YAPPAFLOW_MCP_URL + YAPPAFLOW_MCP_TOKEN already in env.ts.
```

`apps/builder/.env.local`:

```
NEXT_PUBLIC_API_URL=https://api.yappaflow.com         # dev: http://localhost:4000
NEXT_PUBLIC_WEB_URL=https://app.yappaflow.com         # for "back to dashboard"
```

`web/.env.local`:

```
NEXT_PUBLIC_BUILDER_URL=https://builder.yappaflow.com  # dev: http://localhost:3040
```

The MCP env (`OPENROUTER_API_KEY`, `AI_ANALYSIS_MODEL`, `AI_PLANNING_MODEL`,
`AI_GENERATION_MODEL`, `MCP_AUTH_TOKEN`, etc.) is unchanged.

### 4.4 CORS — mostly already done

The existing allowlist in `server/src/index.ts:40–50` already includes
`localhost:3000–3002`, but `apps/builder` runs on `3040`. Two options:

The first is to add `"http://localhost:3040"` to the static allowlist — one-line edit.
The second is to set `EXTRA_ALLOWED_ORIGINS=http://localhost:3040` in dev `.env`. The
static-list edit is simpler and matches how the other dev ports are handled.

For the prod builder origin, set `EXTRA_ALLOWED_ORIGINS=https://builder.yappaflow.com`
on the API service. The `*.vercel.app` regex already covers preview URLs.

---

## 5. Phased implementation plan (continues from `PHASES.md`)

We're inside Phase 8 (builder MVP). The connection plan splits across Phases **8.5 →
8.9** so it interleaves with the builder UX work without blocking it.

### Phase 8.5 — Server: persistence + bridge endpoints

Owner workspaces: `server/`. No schema changes in `packages/types` (re-exports only).

Concrete edits:

1. **`server/src/models/Project.model.ts`** — add the four `siteProject*` fields (§3.1).
   Mongo migration is a no-op (new fields default to `null` / `0`).
2. **`server/src/services/yappaflow-mcp.service.ts`** — add `buildSiteProjectRpc(params)`
   wrapping `callTool("build_site_project", { brief, mergedDna, overrides })` with the
   return type `{ siteProject: unknown; summary: string; nextSteps: string[] }`. Keep
   types loose at the service edge (matches the existing `unknown` pattern for `mergedDna`).
3. **`server/src/services/site-project.service.ts`** (new) — the read/write service:
   `getSiteProject(projectId, agencyId)`, `saveSiteProject(projectId, agencyId, project,
   baseVersion)` with optimistic concurrency, `generateSiteProject(projectId, agencyId,
   { brief, mergedDna, overrides })` calling `buildSiteProjectRpc`, validating with
   `SiteProjectSchema.parse`, and persisting. Throws `ConflictError` on stale write,
   `NotFoundError` on missing/forbidden.
4. **`server/src/services/builder-token.service.ts`** (new) — mints + verifies the
   short-lived handoff JWT (audience `"builder"`, claims `{ sub, projectId }`). Reuses
   `JWT_SECRET`. Uses an in-memory `Set<string>` of consumed `jti`s for single-use; a
   short TTL plus the consumed-set is enough until we have a Redis. Add a comment
   pointing to the upgrade path.
5. **`server/src/routes/site-project.route.ts`** (new) — `GET /:projectId` and `PUT
   /:projectId` per §4.1. Pattern-copy `requireAuth` + `handleMcpError` from
   `reference.route.ts`. Mount in `server/src/index.ts` next to the deploy router:
   `app.use("/site-projects", cors(corsOptions), apiLimiter, express.json(), siteProjectRouter);`.
6. **`server/src/routes/reference.route.ts`** — add `POST /reference/build-site-project`
   alongside `POST /reference/build`. Body shape mirrors `build`. On success: persist
   via `siteProjectService.saveSiteProject` and return `{ projectId, version, siteProject }`.
7. **`server/src/routes/auth-session.route.ts`** — add `POST /auth/builder-token` and
   `POST /auth/exchange-builder-token`.
8. **`server/src/index.ts:42`** — append `"http://localhost:3040"` to `allowedOrigins` so
   the dev builder can hit the API. Production uses `EXTRA_ALLOWED_ORIGINS`.
9. **GraphQL** — extend the `Project` type and the project resolvers to surface the new
   thin fields (`hasSiteProject`, `siteProjectVersion`, `siteProjectUpdatedAt`).
10. **Tests** — integration tests against an in-memory Mongo for `GET / PUT / POST
    build-site-project`, including the `409` conflict path. Reuse the Vitest setup the
    existing `server/src/__tests__` directory uses.

Success check: `npm run build --workspace=server` passes; `curl -X POST
.../reference/build-site-project` against a running stack returns a parsed `siteProject`;
a stale `PUT` returns `409 { current: N }`.

### Phase 8.6 — `apps/builder`: server-aware loading

Owner workspace: `apps/builder` only. No schema changes.

Concrete edits:

1. **`apps/builder/src/lib/server-api.ts`** — add three exports next to
   `fetchProjectProducts`: `fetchSiteProject(projectId)`, `saveSiteProject(projectId,
   project, baseVersion)`, `whoami()`. All reuse the existing
   `localStorage["yappaflow_token"]` + `Authorization: Bearer` pattern. URL base from
   `NEXT_PUBLIC_API_URL`. On `409`, return `{ ok: false, current }` instead of throwing.
2. **`apps/builder/src/lib/persistence.ts`** — add `loadProjectFromServer(projectId)`
   alongside `loadProjectFromStorage`. New top-level `loadProject(projectId)` that
   tries server first, falls back to local cache, then sample fixture (current
   behaviour). Keep the v1→v2→v3 migration pipeline running on whatever returns.
3. **`apps/builder/src/app/p/[projectId]/page.tsx`** — convert to read `searchParams`
   and pass `?session=<token>` into `EditorShell` once. (Currently the page only reads
   `params`.)
4. **`apps/builder/src/components/editor-shell.tsx`** — on first mount, if a `session`
   token is present, POST it to `/auth/exchange-builder-token`, store the returned
   regular JWT in `localStorage["yappaflow_token"]`, and `router.replace` the URL
   without the param. Then call `loadProject(projectId)`.
5. **Zustand store autosave** — after the existing 500ms debounce → localStorage save
   completes, fire `saveSiteProject(projectId, project, version)`. On `409`, surface a
   banner via the existing toast/notification slot. Don't auto-merge.
6. CLAUDE.md non-negotiables to re-check: iframe canvas untouched (this phase is data
   plumbing only); postMessage protocol unchanged; `@yappaflow/sections` and
   `@yappaflow/types` imports unchanged.

Success check: opening `${BUILDER}/p/<id>?session=<valid-token>` loads the SiteProject
from server, edits roundtrip to a `200 PUT`, and a second tab editing the same project
triggers the conflict banner instead of silently overwriting.

### Phase 8.7 — `web/`: "Open in Builder" entry points

Owner workspace: `web/` only.

Concrete edits:

1. **`web/src/lib/builder-handoff.ts`** (new) — `openInBuilder(projectId)` calls
   `POST /auth/builder-token` to mint, then `window.location =
   ${NEXT_PUBLIC_BUILDER_URL}/p/${projectId}?session=${token}`.
2. **`web/src/lib/reference-api.ts`** — add `buildSiteProject(payload)` calling the new
   `POST /reference/build-site-project` route. Reuse the existing bearer-token helper.
3. **`web/src/app/[locale]/studio/new-reference/page.tsx`** — add a new terminal action
   "Open in Builder" alongside the existing "Build platform files". This calls
   `buildSiteProject(...)` then `openInBuilder(projectId)`. Keep "Build platform files"
   working untouched — that's the legacy `/reference/build` path.
4. **`web/src/components/dashboard/CommandCenter.tsx`** — for projects whose GraphQL
   `hasSiteProject` is `true`, add a secondary "Open in Builder" link on the project
   card that uses the same `openInBuilder` util but skips the generation step.
5. (Optional, can defer) **`web/src/components/dashboard/DeploymentHub.tsx`** — leave
   alone for now. The legacy custom / Shopify / WordPress flows continue to ship ZIPs;
   we don't add a fifth tile until the reference→builder path is validated end-to-end.

Success check: from `/studio/new-reference`, the new "Open in Builder" button takes the
agency from a brief to the editor in one click; from the dashboard, an existing project
with a SiteProject opens to the editor without regeneration.

### Phase 8.8 — Deployment topology + dev ergonomics

Owner: ops + docs, no app code beyond the env wiring covered in 8.5–8.7.

Documentation deliverable in `docs/setup/`:

1. Production DNS layout — `app.yappaflow.com` (web), `builder.yappaflow.com` (builder),
   `api.yappaflow.com` (server), `mcp.yappaflow.com` (MCP — already deployed to AWS
   Fargate, eu-central-1, per `apps/yappaflow-mcp/CLAUDE.md`).
2. Local dev: web on `:3000`, server on `:4000`, builder on `:3040`, MCP on its own
   port (defaults to `3000`; override via `PORT` env if running locally — usually MCP is
   reached via the deployed URL even in dev).
3. Environment variable reference (consolidating §4.3).
4. CORS reminder: dev allow-list change in `index.ts` was the cheap way to support the
   builder's `:3040` port; prod uses `EXTRA_ALLOWED_ORIGINS`.

### Phase 8.9 — End-to-end verification

The success check across the bridge. Three acceptance scripts to run before declaring
8.5–8.7 done.

The first: brief → builder → save → reload. From `/studio/new-reference`, paste a
brief, run classify + search, pick 4 refs, click "Open in Builder". Land in the
builder, edit the hero text and a DNA color, close the tab, reopen via
`CommandCenter`'s "Open in Builder", confirm edits persisted.

The second: legacy still works. Run a custom-platform build through `DeploymentHub`'s
existing flow, download the ZIP, confirm parity with a baseline ZIP captured before
Phase 8.5. Run a `/reference/build platform: "shopify"` call directly via curl,
confirm it still returns platform files (the legacy `build_site` MCP tool path).

The third: schema migration round-trip. Pre-load a `yf.project.<id>` v1 entry into
localStorage in the builder, open `/p/<id>` for the matching server-side `siteProject:
null` project, confirm the v1 local cache renders, the user can save, and the saved
server-side record is `schemaVersion: 3`.

---

## 6. Out of scope (this phase)

We deliberately defer the following so 8.5–8.9 stays shippable:

The first is multi-user real-time collab. Save path is last-write-wins with a `409`
banner. Real-time editing is Phase 13+ and requires either CRDTs or a server-broadcast
channel.

The second is preview hosting / share links. "Send a read-only preview link to the
agency's client" is a real ask but it requires the SiteProject to be readable without
a session — a permissions model we haven't designed.

The third is moving the legacy `/deploy/*` ZIP build to be SiteProject-aware. CMS
conversion lives in `adapters-v2` (Phase 10). Until then, legacy and pivot run side by
side on the same `Project` row.

The fourth is a public bearer API. Connection endpoints are session-cookie or
short-lived-builder-token only.

The fifth is migrating the `Project.identity.products[]` (Mongoose `IProduct` shape)
into `Project.siteProject.productLibrary[]` (Zod `Product` shape). They are not the
same type. The MCP `assembleSiteProject` already handles seeding the library when an
e-commerce brief comes through; existing identity-extracted products can stay where
they are and be re-imported into the library at edit time. Defer the dedup question.

---

## 7. Open questions to resolve as we build

1. **Asset storage during edit.** Builder's `CLAUDE.md` allows blob URLs (client only)
   vs eager S3 upload. The connection plan doesn't force a choice — server save
   accepts whatever `assets[]` shape `SiteProject` defines. Once we want shared
   previews (Phase 13), client-only blobs stop working. Decide before Phase 13.
2. **Conflict UX detail.** A banner is the minimum. Add `siteProjectUpdatedBy` (User
   `_id`) in 8.5 so the banner can say *"updated 2 minutes ago by <name> in another
   tab"*; defer the real diff/merge UI.
3. **`/reference/build-site-project` regeneration semantics.** If called on a project
   that already has a `siteProject`, do we replace, merge, or refuse? Lean *refuse with
   a warning* — silent overwrite is the worst-case bug; the builder is the merge
   surface.
4. **Bearer-token-in-URL hardening.** Single-use jti tracking is in-memory in 8.5. A
   server restart drops the consumed-set, so a stolen URL during a brief restart window
   could replay. Acceptable for v1; revisit if we ever run multi-instance API servers
   or need higher assurance — the answer is Redis or a `consumed_at` column on a JWT
   audit row.

---

## 8. CLAUDE.md non-negotiables — re-checked against this plan

`#1 light theme default + dark toggle` — unchanged. The toggle lives inside
`SiteProject.dna`; neither `web/` nor `apps/builder` touches it in the connection layer.

`#2 OpenRouter as the single AI gateway, OpenAI-SDK-compatible, streaming` — verified
against `apps/yappaflow-mcp/src/config.ts`: today's defaults are
`google/gemini-2.5-flash-lite` (analysis) and `anthropic/claude-sonnet-4-6` (planning +
generation), all routed through `OPENROUTER_API_KEY`. The "DeepSeek primary" wording in
the root `CLAUDE.md`, `server/CLAUDE.md`, `apps/yappaflow-mcp/CLAUDE.md`, and the
`docs/memory/LLM/CLAUDE.md` archive is **stale relative to current code** and should be
reworded in a separate cleanup pass (out of scope for this blueprint).

`#3 schema versioning` — `SiteProject.schemaVersion` stays at `3`. Phase 9's content-LLM
pass might require a shape change; that's a separate `schemaVersion: 4` commit that
updates `packages/types`, `packages/sections`, `apps/yappaflow-mcp`, `apps/builder`, and
`server/src/services/site-project.service.ts` together.

`#4 yappaflow-ui tsup quirks` — out of scope; nothing in this plan touches that build.

`#5 CMS adapters ship by demand` — preserved. `adapters-v2` is Phase 10. Legacy
`/deploy/*` and `/reference/build` keep producing platform files until then.

`#6 reference pipeline runs as its own service` — preserved. `server/` proxies via
`yappaflow-mcp.service.ts`. No MCP work is inlined; no new MCP responsibilities.

`#7 three-stage MCP model split` — preserved. `build_site_project` already asks for the
generation stage internally.

`#8 builder-pivot scope discipline` — every section above maps to Phases 8.5–8.9
inside the agreed Phase 8 builder MVP envelope.

---

## 9. One-page summary

`web/`'s reference flow (`/studio/new-reference`) calls a new
`POST /reference/build-site-project` route that wraps MCP `build_site_project` and
persists the result on the existing `Project` Mongo document (new `siteProject` field).
`web/` then mints a 5-minute builder JWT via `POST /auth/builder-token` and redirects
to `${NEXT_PUBLIC_BUILDER_URL}/p/<projectId>?session=<token>`. The builder exchanges the
token at `POST /auth/exchange-builder-token`, stores the regular JWT under the same
`localStorage["yappaflow_token"]` key both apps already share, and loads canonical
state from `GET /site-projects/<id>`. Autosave debounces a `PUT` with optimistic
concurrency; conflicts surface as a banner. The MCP stays stateless. Legacy
`/deploy/*` and `/reference/build` keep running until `adapters-v2/shopify` lands in
Phase 10.

**Concrete delta:** four new fields on `Project.model.ts`, one new method on the
existing MCP service wrapper, two new server services (`site-project.service.ts`,
`builder-token.service.ts`), one new server router (`site-project.route.ts`) plus
extensions to `reference.route.ts` and `auth-session.route.ts`, three new
`server-api.ts` exports + a `loadProject` upgrade in `apps/builder`, and one new
"Open in Builder" terminal action on `web/`'s `studio/new-reference` plus the same
link in `CommandCenter`. No edits to `packages/types`, `packages/sections`, or
`apps/yappaflow-mcp`.
