# apps/builder — CLAUDE context

You are working inside the **in-house site builder** — the middle of the Builder-First Pivot
(see `../../BUILDER-PIVOT.md`). This is Phase 8, the biggest single phase of the pivot.

## What this app is

Next.js 15 app where an agency user tweaks the AI-generated `SiteProject` before it gets
converted to a CMS. Think "Webflow Designer, scoped to our section library."

## Scope (in v1)

- Left rail: page switcher + section list (drag reorder, click select)
- Canvas: **iframe** rendering the site via postMessage bridge
- Right rail: type-aware property panel (text, image, DNA-bound colors, variant, animation)
- Top bar: viewport switcher, preview, export
- Section insert picker (10 types from `@yappaflow/sections`)
- Autosave to localStorage + IndexedDB for assets

## Scope (out — do not build in v1)

- Element-level editing inside a section (only section-level slots)
- Custom CSS / class system
- CMS collections inside the builder
- Multi-user collab
- Server persistence
- Full undo/redo stack (simple linear stack is fine)

## Stack

- Next.js 15 (App Router)
- **Zustand** for scene state (not Redux — single-project scope)
- **Tiptap** for inline text editing
- **Tailwind** for builder chrome
- **GSAP** loaded *inside the canvas iframe* for runtime animation; chrome uses CSS only
- Vercel deploy

## Hard rules

1. The canvas is an **iframe**. Never render `SiteProject` directly in the builder chrome —
   style isolation is the whole point.
2. Scene state source of truth is the Zustand store. The iframe receives updates via
   `postMessage`; it does not own state.
3. Color pickers bind to **DNA tokens** (`dna.colors.*`), not arbitrary hex. If a user
   needs off-palette, that's a DNA edit, not a section style.
4. Section schemas are owned by `packages/sections`. Do not duplicate them here — import.
5. Autosave must be debounced (≥500 ms) and must never block UI.

## Key files (as they land)

- `src/app/(builder)/page.tsx` — main editor shell
- `src/store/scene.ts` — Zustand: `SiteProject` + selection + history
- `src/canvas/iframe-bridge.ts` — postMessage contract with the preview iframe
- `src/panels/right/` — type-aware property panels, one file per section type
- `src/panels/left/section-list.tsx` — drag-reorder via dnd-kit

## When you finish

- `npm run build --filter=@yappaflow/builder` must succeed
- `npm run lint --filter=@yappaflow/builder` must be clean
- Manual smoke: can you add a hero, edit its headline, swap variant, and see it in the canvas?
