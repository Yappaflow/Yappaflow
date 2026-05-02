# memory/_archive — historical docs, nothing here is load-bearing

This folder holds pre-pivot or otherwise stale memory docs that were moved out of
`docs/memory/` during the 2026-05-02 cleanup. **No code reads any path under here.**
`server/src/ai/design-system.ts` reads from `docs/memory/design/top-design/`, which
stays in the live `docs/memory/` folder — not here.

Keep this around as historical reference. Safe to delete the whole `_archive/`
folder later in one shot if it ever feels noisy.

## What's in here and why

- `init/CLAUDE.md` — original product vision from before the builder-first pivot.
  The pipeline it describes is the old `brief → CMS code` path. Current pipeline is
  `signal → AI → SiteProject → builder → CMS adapters` (see
  `docs/pivot/BUILDER-PIVOT.md`).
- `model/CLAUDE.md` and `model/INIT.md` — older coding-assistant protocol, mostly
  superseded by the root `CLAUDE.md`. `INIT.md` mentions
  `ANTHROPIC_MODEL=claude-sonnet-4-20250514` which is an older model fixture; the
  live model config lives in `apps/yappaflow-mcp/src/config.ts`.
- `data/` — pre-pivot blueprint intake protocol + `engine-config.json` +
  `project-blueprint.json`. None of these JSON/MD files are loaded by code today.
  The `engine-config.json` references `top-design/*.md` paths, but the real prompt
  builder (`server/src/ai/design-system.ts`) reads those files directly from
  `docs/memory/design/top-design/` and does not consult this config.
- `LLM/CLAUDE.md` — the old "DeepSeek primary, OpenRouter fallback" AI vendor doc.
  As of 2026-05-01 the live config in `apps/yappaflow-mcp/src/config.ts` runs
  Sonnet 4.6 (planning + generation) and Gemini 2.5 Flash Lite (analysis), all
  through a single OpenRouter gateway. Marked for deletion during cleanup; moved
  here because the session couldn't get delete authorization. Safe to remove.

## How to delete this whole folder later

```bash
rm -rf /Users/yurikaza/Projects/Yappaflow/docs/memory/_archive
```

Run that from your own terminal when you're confident nothing pointed here that
you missed.
