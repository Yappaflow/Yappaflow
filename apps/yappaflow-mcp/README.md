# @yappaflow/mcp

Design-DNA extraction + MCP server for Yappaflow.

## Phases

| Phase | Status | What ships |
| ----- | ------ | ---------- |
| 0 — DNA extractor | **current** | `extract_design_dna(url)` CLI + 10 sample DNA JSONs |
| 1 — MCP server on Railway | next | HTTP MCP transport, SQLite cache, bearer auth |
| 2 — Search integration | later | `search_references` via Exa + outbound resolution |
| 3 — Brief classification | later | `classify_brief` using Gemini 2.5 flash-lite |
| 4 — Ranking + merge | later | Two-axis Pareto ranking, `merge_dna` |
| 5 — Build adapters | later | html / shopify / wordpress / ikas / webflow |

## Phase 0 quick start

```bash
# From the monorepo root
npm install
npx playwright install chromium

# Extract a single URL
cd apps/yappaflow-mcp
npm run extract -- --url https://linear.app --out samples

# Extract the full reference set (10 URLs, concurrency 3)
npm run extract:samples
```

Output: `samples/<slug>.json` per URL plus `samples/_run.json` with timings and warnings.

## DNA schema

See `src/types.ts`. Top-level sections:

- `meta` — URL, final URL after redirects, viewport, timestamp, timings
- `typography` — every `(font-family, weight, size, line-height, letter-spacing)` tuple with usage count; top entries are the real type system
- `colors` — every color usage with count, plus CSS custom properties from `:root`
- `motion` — `@keyframes` from stylesheets, all CSS transitions, snapshot of `document.getAnimations()` after scrolling
- `grid` — `grid-template-columns`, `gap`, `max-width`, `padding` from major layout containers
- `stack` — runtime globals that identify libraries (`gsap`, `Lenis`, `THREE`, `framer-motion`, etc.)
- `assets` — font files, images, videos, scripts from `performance.getEntriesByType('resource')`

## Cache

SQLite at `data/dna-cache.db`. Keyed by normalized URL. Use `--no-cache` to force re-extraction.
