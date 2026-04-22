# Yappaflow — Design Reference Pipeline (Phases 0–6)

A reference-driven website generator for agencies. Agency pastes a brief, Yappaflow
classifies it, searches real-world sites for matches, lets the user blend 4 of them
into a merged "design DNA", and emits a platform-ready project (HTML / Shopify /
WordPress / IKAS / Webflow).

All state lives in the MCP server (`apps/yappaflow-mcp`); the main Yappaflow API
just proxies. No extra long-running workers.

## Architecture at a glance

```
Agency chat
   └─► POST /reference/classify ──► MCP classify_brief  (Gemini 2.5 Flash Lite)
                                        │
                                        ▼
   POST /reference/search ──► MCP search_references  (Exa × 5 + Playwright × 8)
                                        │
                                        ▼
   Pick 4 refs (structure, typography, motion, palette)
                                        │
                                        ▼
   POST /reference/build ──► MCP merge_dna → build_site → { files, nextSteps }
```

Two rented commodities (Exa, OpenRouter LLMs). Everything else — Playwright,
SQLite cache, ranking, merging, scaffolding — runs in-process on the MCP box.

## Phase 0 — DNA extractor (✅ shipped)
- Playwright (Chromium, WebKit mobile) walk of a live site.
- Captures: typography styles + families, colors with counts and computed roles,
  `@keyframes` + transitions (handles cubic-bezier commas), scroll hints (Lenis,
  AOS, Framer), grid candidates, detected frameworks, asset inventory.
- 10 reference sites produced legit DNA (see `apps/yappaflow-mcp/samples/`).
- CLI harness with SQLite cache and concurrency (`npm run extract -- --from references.json`).

## Phase 1 — MCP server on Railway (✅ shipped)
- `@modelcontextprotocol/sdk` StreamableHTTP transport on `/mcp`.
- REST sibling on `/rpc/:tool` for service-to-service callers (Yappaflow API).
- Bearer token via `MCP_AUTH_TOKEN`. Health on `/health`.
- `railway.json` builds with Nixpacks + `playwright install --with-deps chromium`.

## Phase 2 — search_references (✅ shipped)
- 5 queries generated from brief: 3 concept, 2 craft (Awwwards/Muzli site: filters).
- Exa in parallel, outbound URL resolution on gallery pages.
- Playwright × 8 DNA extractions, then `rank_references` returns Pareto-sorted list.
- Offline fallback uses a hand-curated seed list per industry.

## Phase 3 — classify_brief (✅ shipped)
- Prompted Gemini 2.5 Flash Lite via OpenRouter.
- Offline fallback: regex heuristics detect industry, grid archetype, motion
  ambition, palette character, platform preference. Good enough to run the whole
  pipeline without keys.

## Phase 4 — rank + merge_dna (✅ shipped)
- Scoring axes: concept fit (industry, content model) × craft fit (type, palette,
  motion). Voyage embeddings when key present, Jaccard token overlap otherwise.
- Fast-nondominated-sort assigns Pareto ranks. UI shows rank 0 frontier first.
- `merge_dna` takes 4 DNAs and owns fields by role: structure owns grid,
  typography owns fonts/scale, motion owns keyframes/transitions, palette owns
  colors. Falls back across sources when a field is missing.

## Phase 5 — build_site (✅ shipped)
- `html/` — fully wired, both LLM-driven (Sonnet) and offline scaffold paths.
  Dark-theme toggle enforced per Yappaflow doctrine.
- `shopify/`, `wordpress/`, `ikas/`, `webflow/` — canonical folder skeletons
  that compile and contain TODOs for the next milestone.
- Doctrine (`apps/yappaflow-mcp/src/adapters/doctrine.ts`) is the stable prefix
  prompt that gets cached; DNA + content sit after it.

## Phase 6 — agency-facing wiring (✅ shipped)
- **Server**: `server/src/routes/reference.route.ts` mounted at `/reference/*`.
  Auth piggybacks on the existing JWT bearer scheme.
- **Service**: `server/src/services/yappaflow-mcp.service.ts` is a thin REST
  client against the MCP app's `/rpc/:tool` mirror. No need to bring the MCP
  SDK into the main API.
- **UI**: `/studio/new-reference` (web/src/app/[locale]/studio/new-reference).
  Single scrolling surface: paste transcript → classify → search → pick 4 refs
  → pick platform → build → scroll the file tree → download ZIP.
- **Client-side zip**: no-dep store-mode zip writer baked into the page so no
  server round-trip is needed to package the output.

## Env vars

Main API (`server/src/config/env.ts`):
- `YAPPAFLOW_MCP_URL` — e.g. `https://yappaflow-mcp.up.railway.app` (empty ⇒ feature off, 503)
- `YAPPAFLOW_MCP_TOKEN` — matches MCP's `MCP_AUTH_TOKEN`

MCP app (`apps/yappaflow-mcp/src/config.ts`):
- `PORT`, `HOST`, `MCP_AUTH_TOKEN`, `SQLITE_PATH`, `YAPPAFLOW_OFFLINE`
- `OPENROUTER_API_KEY`, `AI_ANALYSIS_MODEL`, `AI_PLANNING_MODEL`, `AI_GENERATION_MODEL`
- `EXA_API_KEY`, `VOYAGE_API_KEY`

## Next up (Phase 7+)
- Replace adapter skeletons with real platform wiring (CMS collections for Webflow,
  metaobjects for Shopify, pattern library for WordPress, GraphQL for IKAS).
- Deploy the MCP app to Railway behind `yappaflow-mcp.up.railway.app`.
- Residential proxy for Playwright to get past Cloudflare bot checks on Linear etc.
- Token budgeting: the doctrine prefix is stable — flip on prompt caching.
- Evaluations: a held-out set of (brief, picked refs, "is this good?") triples.
