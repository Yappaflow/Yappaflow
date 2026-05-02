# memory — what's still load-bearing here

This folder predates the root `CLAUDE.md` + per-workspace `CLAUDE.md` structure.
After the 2026-05-02 cleanup, only two things in here matter:

- `design/top-design/` — read at runtime by `server/src/ai/design-system.ts` to
  build the AI generation system prompt. **Do not move, rename, or restructure
  these files without updating that loader.** Contents: `SKILL.md`, `references/*.md`
  (typography, layout-systems, animation-patterns, technical-stack, case-studies),
  and `insprations/*.png`.
- `UILibrary/CLAUDE.md` and `UILibrary/ARCHITECTURE.md` — the design manifesto for
  `packages/yappaflow-ui`. Referenced from that workspace's `CLAUDE.md` as the
  canonical aesthetic source. Not code-loaded; documentation only.

## Read order for any task

1. `/CLAUDE.md` (root) — north star + non-negotiables.
2. The workspace `CLAUDE.md` for the code you're touching.
3. This file, then the relevant subfolder above, only if you still need background.

## What used to be here

`init/`, `model/`, `data/`, and `LLM/` were moved to `_archive/` on 2026-05-02
because they were pre-pivot, code-unreferenced, or had drifted from current code.
See `_archive/README.md` for the inventory and deletion instructions.

## Don't

- Don't add new topical docs here. New rules go in the workspace `CLAUDE.md` they
  apply to, or in the root file if they are global.
- Don't trust `_archive/` for current pipeline / vendor / architecture facts.
  `docs/pivot/BUILDER-PIVOT.md` and the live workspace CLAUDE.md files are the
  current truth.
