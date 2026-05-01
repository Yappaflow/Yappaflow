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

## Phase 7 — canonical format + section library (✅ shipped 2026-04-23)

Builder-first pivot foundation. No builder yet (Phase 8) and no adapters-v2
yet (Phase 10); this phase lays the types and the section library they both
consume. See `BUILDER-PIVOT.md` for the architecture brief.

- **`packages/types/`** — new workspace. Canonical home for `DesignDna`,
  `MergedDna`, `Brief`, and the new `SiteProject` / `Page` / `Section` /
  `SectionType` schemas (Zod + `z.infer<>`). `apps/yappaflow-mcp/src/types.ts`,
  `tools/brief.ts`, and `tools/merge-dna.ts` are now thin re-exports — every
  MCP call site keeps its old import path. DNA `schemaVersion` stays at 1
  (shape unchanged; only the declaration moved).
- **`packages/sections/`** — new workspace. 10 MVP section types (header,
  footer, announcement-bar, hero, feature-grid, feature-row, product-grid,
  cta-band, testimonial, rich-text). Each section ships `schema.ts`,
  `default.ts`, `variants.ts`, `render.tsx` (placeholder stub), `index.ts`.
  Top-level `SECTIONS` registry keyed by `SectionType` — exhaustiveness
  enforced via `satisfies Record<SectionType, SectionDefinition>`. A parallel
  React-free `./data` entry exposes `SECTION_DATA` (schema + default +
  variants only) for Node-only consumers like the MCP.
- **`apps/yappaflow-mcp/src/tools/build-site.ts`** — now exports
  `assembleSiteProject(params)` returning `{ siteProject, summary, nextSteps }`.
  Legacy `buildSite()` dispatcher is UNCHANGED; the live Shopify REST path
  (`/rpc/build_site platform:"shopify"`) keeps working against production
  until adapters-v2 ships in Phase 10. New MCP tool `build_site_project`
  registered alongside the legacy `build_site`.
- **Builds.** Both new packages use plain `tsc -p tsconfig.build.json` (not
  tsup — tsup's `bundle-require` cleanup unlinks fail on sandboxed mounts).
  `packages/sections` has a post-build `scripts/prepend-use-client.mjs` that
  re-attaches `"use client"` to every section's emitted JS (same reason as
  `packages/yappaflow-ui`: Next.js RSC compiler reads the directive from the
  first line of the imported module). The barrel and `./data` entry stay
  directive-free so Node consumers aren't tagged as client.
- **Tests.** `@yappaflow/types`: 7 passing (`SectionSchema`, `PageSchema`,
  `SiteProjectSchema` happy-path + two rejection cases). `@yappaflow/sections`:
  52 passing (each of 10 sections × 5 assertions: default validates,
  default-variant is listed, renders default content, renders broken content
  gracefully, serialises animation preset). Smoke tests under
  `apps/yappaflow-mcp/scripts/`: `smoke-assemble.ts` round-trips the assembler
  output through `SiteProjectSchema`; `smoke-legacy.ts` confirms the html
  adapter still returns the `BuildOutput` contract the REST route expects.

## Next up (Phase 8+)
- **Phase 8** — `apps/builder` scaffold. Next.js 15 + Zustand + iframe canvas.
  Loads a SiteProject, renders it via `SECTIONS[type].Component`, lets the
  agency tweak content, variants, style deltas, and animation presets.
- **Phase 9** — hero inspiration picker; replace the assembler's default
  content seeding with an LLM pass that drafts real hero / feature / CTA
  copy per brief (one prompt per section — smaller context, easier retry).
- **Phase 10** — `apps/yappaflow-mcp/src/adapters-v2/shopify/` — per-section
  mappers, each a pure function `(Section, MergedDna) → liquid string`.
  Replaces the LLM-in-adapter path for Shopify. Legacy `adapters/` stays
  until v2 is verified against production.
- **Phase 11** — GSAP animation runtime. Ship ~12 named presets; adapters
  serialise the preset as `data-yf-anim` on the section root; a shared
  runtime package reads the attribute at load time.
- **Phase 12** — Webflow / WordPress / IKAS adapter-v2, same mapper pattern.
- Keep deploying the MCP app to Railway behind `yappaflow-mcp.up.railway.app`.
- Residential proxy for Playwright to get past Cloudflare bot checks on
  Linear etc.
- Token budgeting: the doctrine prefix is stable — flip on prompt caching.
- Evaluations: a held-out set of (brief, picked refs, "is this good?") triples.
