# memory — legacy topical docs

This folder predates the root `CLAUDE.md` + per-workspace `CLAUDE.md` structure.
It's still useful — each subfolder is a deep dive on a topic — but it is **no longer the
first place to look**.

## Read order for any task

1. `/CLAUDE.md` (root) — north star + rules
2. The workspace `CLAUDE.md` for the code you're touching
3. `memory/<topic>/CLAUDE.md` only if you still need background

## What's here

- `memory/init/CLAUDE.md` — original product vision (pre-pivot — read with a grain of salt).
- `memory/data/CLAUDE.md` — blueprint intake protocol.
- `memory/model/CLAUDE.md` — older coding-assistant protocol (mostly superseded by the root).
- `memory/LLM/CLAUDE.md` — **AI vendor strategy (DeepSeek + OpenRouter)** — still current.
- `memory/UILibrary/CLAUDE.md` — the art-gallery design manifesto for `packages/yappaflow-ui`
  — still the canonical aesthetic reference.

## Don't

- Don't ADD new topical docs here. New rules go in the workspace `CLAUDE.md` they apply
  to, or in the root file if they are global.
- Don't trust `memory/init` or `memory/model` about **pipeline/architecture** — they
  describe the pre-pivot world. `BUILDER-PIVOT.md` at the repo root is the current truth.
