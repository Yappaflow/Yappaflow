# packages/sections — CLAUDE context

10 MVP section types for the Builder-First Pivot. Each section is a little package: schema,
default content, variants, render.

## The 10 MVP types

| Type | Purpose | MVP variants |
|---|---|---|
| `header` | Top nav | logo-left, logo-center |
| `footer` | Legal, links, socials | simple, columns |
| `announcement-bar` | Above-header strip | text-only |
| `hero` | First-screen statement | split, centered, fullscreen-media |
| `feature-grid` | 3–4 value props | icons, images |
| `feature-row` | Alternating image/text | image-left, image-right |
| `product-grid` | E-commerce collection | card, minimal |
| `cta-band` | Single CTA block | centered, split |
| `testimonial` | Social proof | single, carousel |
| `rich-text` | Catch-all prose | default |

Future (Phase 8.5+): logo bar, FAQ, pricing, contact form, team, blog list, gallery, video,
stats band, newsletter. **Don't add these yet** without updating the pivot brief.

## Per-section layout

```
src/<type>/
├── schema.ts       # Zod or TS schema for content
├── default.ts      # default content the AI starts from
├── variants.ts     # named variants + layout overrides
├── render.tsx      # React component (builder + preview)
└── index.ts        # re-export
```

Base types live in `@yappaflow/types`. Each section's `schema.ts` extends `Section`.

## Rules

1. **Schemas are the contract.** CMS adapters read section content strictly by schema.
   A loose field = an expensive LLM hop later. Tighten the shape.
2. **Default content must render.** A freshly-instantiated section with zero edits must
   look intentional. Unit test: every `default.ts` passes its own `schema.parse`.
3. **Variants are layout-only.** Variant ≠ different content shape. If you need different
   fields, it's a new section type.
4. **`render.tsx` is the canonical renderer.** Builder preview, docs showcase, and
   adapter golden-file tests all consume it. Keep it framework-agnostic where possible
   (no Next-specific imports).
5. **Animation is a hint, not a hard-coded GSAP call.** Bind `section.animation` to a
   preset name; runtime (`packages/animations`, forthcoming) does the actual work.

## Build

- `tsc` — emits types + renderers
- Do not tsup; RSC directives are not an issue here because everything ships as .tsx + .d.ts

## When you finish

- Every new section has: schema, default, variants, render, index, one test
- `npm run build --filter=@yappaflow/sections` succeeds
- MCP `build_site_project` tool recognises the new type (it reads the registry from here)
