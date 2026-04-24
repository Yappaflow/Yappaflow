# packages/yappaflow-ui — CLAUDE context

The public component library. Published to NPM as `yappaflow-ui`. Curated art-gallery
aesthetic (see `memory/UILibrary/CLAUDE.md` for the full design manifesto).

## Two reasons this library exists

1. Fewer tokens when the AI generates sites.
2. A premium open-source library for the web dev community.

## Architecture

```
src/
├── tokens/         color, typography, spacing, radius, motion, grid
├── styles/         reset, tokens.css, base.css, index.css
├── theme/          ThemeProvider, ThemeToggle, theme-script
├── motion/         GSAP-powered engine + hooks + components
├── primitives/     Frame, Column, Stack, Display, Body, Mark, Eyebrow
├── shell/          Exhibit, NavShell, FootShell, GalleryShell
├── exhibits/       higher-level composed sections
└── utils/
```

## The tsup quirk (remember this one)

Build config (`tsup.config.ts`) requires **two things** to keep Next.js RSC builds green:

1. **Externalize cross-layer imports.** Don't let tsup inline code from one layer (e.g.
   `motion/`) into another (`primitives/`). Keep entry points separate and mark sibling
   entries as `external`.
2. **Re-attach `"use client"` banners in `onSuccess`.** tsup strips leading directives
   during transpile. Run a small post-build script (already wired in `tsup.config.ts`'s
   `onSuccess`) that re-adds `"use client"` at the top of every file that needs it.

**Break either and downstream Next.js apps fail to build with RSC errors.**
This has cost us multiple hours before — don't refactor the build config without running
`npm run build:ui` AND a smoke build of `apps/yappaflow-ui-docs`.

## Rules

1. Tailwind core utilities only, no arbitrary values sprayed in markup — use tokens.
2. GSAP is a peer dep. Don't bundle it.
3. Easing: **never** use `ease`, `linear`, `ease-in`, `ease-out`. Always custom curves
   (`expo-out`, `quart-out`, `expo-inout`). List in `src/tokens/motion.ts`.
4. Respect `prefers-reduced-motion` in every motion component.
5. Only animate `transform` / `opacity`.

## Build & verify

```bash
npm run build:ui                    # root script, filters yappaflow-ui
npm run build --filter=@yappaflow/ui-docs    # RSC smoke test — do this after build:ui
```
