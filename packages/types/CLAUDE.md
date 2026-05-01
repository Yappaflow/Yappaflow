# packages/types — CLAUDE context

`@yappaflow/types`. Home of the **load-bearing schemas** for the whole pipeline.

## What lives here

- `Brief` — the structured client intake (input to generation).
- `DesignDna` / `MergedDna` — design tokens: colors, typography, spacing, motion.
- `SiteProject` — canonical output (see `docs/pivot/BUILDER-PIVOT.md` §"The canonical format").
- `Page`, `Section`, `SectionType`, `AnimationPreset`, token types.

## The load-bearing rule

**If you change a schema shape, you change every consumer in the same commit.** Period.

Consumers to update together:
- `packages/sections` — per-section schemas depend on `Section` base.
- `apps/yappaflow-mcp` — `build_site_project` tool + all adapters.
- `apps/builder` — Zustand store + property panels.
- `apps/yappaflow-mcp/src/adapters-v2/*` — mappers read from the shape.

Procedure:
1. Bump `SiteProject.schemaVersion` (currently `1`).
2. Update types here.
3. Update every consumer in the same PR.
4. Add a migration note to `docs/pivot/BUILDER-PIVOT.md` or a CHANGELOG.
5. If backward compatibility matters, add a migration util in `src/migrate/`.

## Build

Compiled with **`tsc`**, not tsup. Exports are type-only plus a few helper functions.
Do **not** import React / Next / Node-only modules here — this package runs in the
browser, in Node, and potentially in edge runtimes.

## When you finish

- `npm run build --filter=@yappaflow/types` succeeds
- Every dependent workspace still typechecks (`turbo run typecheck`)
- If you bumped `schemaVersion`, the downstream diffs are in the same PR
