# apps/yappaflow-ui-docs — CLAUDE context

Next.js docs site for `packages/yappaflow-ui`. Landing + gallery + motion lab + MDX docs.

## Scope

- Landing: HeroShowcase, manifesto, design principles, showcase rail
- `/docs/*` — MDX articles (getting-started, theming, motion-system, composition-patterns, changelog)
- `/gallery/[slug]` — exhibit examples of library components
- `/motion-lab` — interactive RevealLab, EasingsInspector, TimingContract

## Rules

1. **Light by default, dark toggle required.** ThemeProvider lives in `packages/yappaflow-ui`;
   consume it, don't re-implement.
2. **No component logic here.** If a showcase needs a new primitive, add it to
   `packages/yappaflow-ui` and import — don't fork.
3. **GSAP is loaded on the client.** Register `ScrollTrigger` / `CustomEase` only inside
   `useEffect` or a `"use client"` boundary.
4. **MDX content owns its copy.** Do not inline long text in TSX — move it to
   `src/content/docs/*.mdx`.

## Key files

- `src/app/layout.tsx` — root layout + theme provider
- `mdx-components.tsx` — MDX → React component mapping
- `src/components/landing/*` — one file per landing section
- `src/components/docs/*` — sidebar, TOC, live examples
- `src/content/docs/*.mdx` — article source

## When you finish

- `npm run build --filter=@yappaflow/ui-docs` succeeds (catches RSC/use-client issues)
- Both themes look intentional on landing + at least one docs page
