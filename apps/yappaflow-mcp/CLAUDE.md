# apps/yappaflow-mcp — CLAUDE context

MCP server. Runs on Railway as its **own service** — the main API at `server/` proxies to
it via `/reference/*` REST routes. Do not merge these codebases.

## Responsibilities

1. **Reference pipeline** — fetch design inspiration, produce hero variants.
2. **`build_site_project` tool** — generate a canonical `SiteProject` from a `Brief` + `Dna`.
3. **CMS adapters (v2)** — deterministic `SiteProject → {Shopify,Webflow,WP,IKAS}` conversion.
   This replaces the old `src/adapters/` (kept around until v2 ships everywhere).

## LLM usage — three stages, not three models

Call sites ask for a **stage**, never a model name:

- `analysis` — parse / classify / extract
- `planning` — decide section order, variants, copy skeleton
- `generation` — fill in actual content

Models map via env vars. Defaults are OpenRouter models. See the stage-selection helper
(`src/llm/stage.ts` or similar) — if it doesn't exist yet, build it before adding more call
sites. Hard-coding a model in a business-logic file is the smell to fix.

**Provider rule:** DeepSeek primary, OpenRouter fallback. Both OpenAI-SDK-compatible.
Streaming on. No Anthropic as runtime provider.

## Adapter v2 layout

```
src/adapters-v2/
  shopify/
    index.ts                 # mappers registry + convertToShopify(project)
    sections/
      hero.ts                # (section, dna) => liquid string
      feature-grid.ts
      ...
  webflow/                   # (Phase 12)
  wordpress/                 # (Phase 12)
  ikas/                      # (Phase 12)
```

Mappers are **pure functions**, no LLM calls. Deterministic, testable, cheap.

## Non-negotiable rules

1. **Ship-by-demand.** Only the agency's chosen platform is production-grade. Other adapters
   stay canonical skeletons with TODO comments. Don't fake completeness.
2. **No LLM in the adapter path.** If you feel the urge, the section schema is too loose —
   fix the schema instead.
3. **Schema versions stay in sync.** When `SiteProject` shape changes in `packages/types`,
   the adapters update in the same PR. Bump `schemaVersion`.
4. **The old `src/adapters/` is retired.** Read it for reference, don't add features to it.

## Local dev

```bash
cd apps/yappaflow-mcp
npm run dev          # stdio MCP + local HTTP probe
```

Deploy: Railway (`Dockerfile.mcp` at repo root).

## When you finish

- `npm run build --filter=@yappaflow/mcp` succeeds
- Unit tests for new section mappers (one golden-output test per mapper)
- End-to-end: feeding a known `SiteProject` produces an uploadable theme with zero 404s
