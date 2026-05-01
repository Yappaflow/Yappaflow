# Yappaflow — Builder-First Pivot

**Status:** architecture proposal, locked with Yusuf on 2026-04-23. Ready to implement from Phase 7 onward.

## The reframing

The current pipeline is `brief → refs → merged DNA → CMS-specific code`. The last arrow is where we keep losing. The model has to solve two problems at once: "what should this site look like" and "how do I express it in Liquid / PHP / TSX." The creative half is fine; the translation half is where Shopify themes came back 404-on-every-route and WP adapter skeletons go stale.

New pipeline — CMS conversion moves to the END, an in-house builder sits in the middle:

```
signal intake          (chat / notes / voice — already works, small polish)
    ↓
inspiration search     (MCP returns refs + 3 hero variants for the brief)
    ↓
hero pick              (user chooses 1 of 3 or nudges with text)
    ↓
product intake         (optional — for e-commerce briefs)
    ↓
full generation        (AI fills in a SiteProject from the chosen direction)
    ↓
┌──────────────────────────────────────┐
│  BUILDER (new — apps/builder)        │
│  agency tweaks sections, text,       │
│  images, colors, animations          │
└──────────────────────────────────────┘
    ↓
CMS conversion         (deterministic — SiteProject → Shopify/WP/IKAS/Webflow)
    ↓
ZIP or push
```

The big win: CMS conversion becomes a **mechanical transform** instead of a creative act. The AI never has to know Liquid. Every CMS adapter becomes a pile of per-section mappers.

## The canonical format: `SiteProject` (Option C — hybrid)

A site is a tree of data, not a blob of HTML. Shape:

```ts
interface SiteProject {
  schemaVersion: 1;
  brief: Brief;           // original brief, for round-trip + re-generation
  dna: MergedDna;         // design tokens (colors, fonts, spacing, motion)
  pages: Page[];
  globals: {
    header: Section;      // one header shared across pages (swappable variant)
    footer: Section;
    announcementBar?: Section;
  };
}

interface Page {
  id: string;
  slug: string;            // "/", "/about", "/products/:handle"
  title: string;
  seo: { description: string; ogImage?: AssetRef };
  sections: Section[];     // ordered
}

interface Section {
  id: string;
  type: SectionType;       // "hero-split" | "feature-grid" | "product-grid" | ...
  variant?: string;        // within a type, optional preset variant
  content: Record<string, unknown>;   // schema is per-section type
  style: {                  // deltas from DNA tokens
    background?: ColorToken;
    paddingY?: SpacingToken;
    // ...
  };
  animation?: AnimationPreset;
}
```

**Why C:** blocks at the section level give clean CMS mapping (one section = one Shopify section = one WP pattern = one IKAS component); freeform-within-a-schema inside gives the AI room to do what it's already good at. Option A was too rigid, B put us right back into AST-to-Liquid hell.

## The section library

MVP ships 10 section types. Each has a canonical schema, 1–3 visual variants, and default content. Inspired by Webflow's component shelf + Shopify Dawn's section list.

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

Phase 8.5+ adds: logo bar, FAQ, pricing table, contact form, team grid, blog list, image gallery, video, stats band, newsletter.

Each section lives in `packages/sections/src/<type>/`:

```
packages/sections/src/hero/
├── schema.ts         // canonical TypeScript schema
├── default.ts        // default content the AI starts from
├── variants.ts       // named variants + their layout overrides
├── render.tsx        // React component (builder + preview)
└── index.ts
```

CMS mappers are separate (see below).

## Builder MVP — `apps/builder`

New Next.js app. Dedicated because dependency footprint differs (editor primitives, iframe canvas, postMessage plumbing).

### Scope (in)

- Left rail: page switcher, section list (drag to reorder, click to select)
- Canvas: iframe rendering the site; click-to-edit inline for text
- Right rail: type-aware property panel (text slots, image slots, DNA-bound color pickers, variant dropdown, animation preset picker)
- Top bar: viewport switcher (mobile / tablet / desktop), preview mode, export button
- Section insert: picker menu with the 10 types + variants
- Autosave to localStorage + browser IndexedDB for assets

### Scope (out — for v1)

- Element-level editing inside a section (only section-level slots)
- Custom CSS / class system
- CMS collections inside the builder
- Multi-user collaboration
- Server persistence (client-only, per Yusuf's decision)
- Undo/redo history beyond a simple stack

### Stack

- **Next.js 15** (matches existing `packages/yappaflow-ui`)
- **Zustand** for scene state (simpler than Redux, fits the single-project scope)
- **iframe** canvas with `postMessage` bridge — isolates site styles from builder chrome, lets us render any framework inside
- **Tiptap** for inline text editing (better WYSIWYG DX than raw `contenteditable`)
- **Tailwind** for the builder UI
- **GSAP** loaded in the canvas iframe for runtime animations; builder chrome uses CSS only
- **Vercel** deploy, same zone as the rest of Yappaflow

### UX reference

Webflow Designer — page panel, navigator, canvas, properties rail. We don't match it feature-for-feature, but layout + keybindings should feel familiar so agencies transfer skill.

## CMS conversion layer

Lives in the MCP app: `apps/yappaflow-mcp/src/adapters-v2/<platform>/`. Each adapter is a dictionary of per-section mappers:

```ts
// apps/yappaflow-mcp/src/adapters-v2/shopify/index.ts
import { renderHero } from "./sections/hero.js";
import { renderFeatureGrid } from "./sections/feature-grid.js";
// ...

export const shopifyMappers: Record<SectionType, ShopifyMapper> = {
  hero: renderHero,
  "feature-grid": renderFeatureGrid,
  // ...
};

export async function convertToShopify(project: SiteProject): Promise<BuildOutput> {
  // 1. for each page, emit one templates/<slug>.json referencing section IDs
  // 2. for each section instance, emit sections/<id>.liquid via the mapper
  // 3. emit layout/theme.liquid with globals (header, footer, announcement bar)
  // 4. emit assets/base.css from dna.tokens
  // 5. emit snippets/yf-dark-toggle.liquid
  // 6. emit config/settings_schema.json from dna
  // 7. emit locales/en.default.json
  // return BuildOutput
}
```

Mappers are pure functions `(section: Section, dna: MergedDna) => string`. No LLM in this path. Deterministic, testable, cheap.

### Priority order

1. **Shopify** (Phase 10 — where we already hit pain)
2. **Webflow** (Phase 12 — easiest after Shopify because Webflow's exported JSON is closest to our SiteProject shape)
3. **WordPress** (block theme / FSE patterns)
4. **IKAS** (TSX storefront)

Raw HTML export stays available as a debug artifact ("export the builder state as a single-page site") but is no longer a production path.

## GSAP animation system

- Ship ~12 named presets: `fade-in`, `slide-up`, `slide-left`, `slide-right`, `scale-in`, `parallax-y`, `reveal-mask`, `stagger-children`, `marquee`, `cursor-follow`, `scroll-pin`, `scroll-scrub`.
- Each section can bind one preset via its `animation` field.
- Builder right rail shows a dropdown + a "replay" button on canvas.
- Exported sites include a small GSAP runtime (`packages/animations/dist/runtime.js`) that reads `data-yf-anim="fade-in"` attributes on section roots.
- Same runtime works for every CMS target — each adapter just serializes the attribute, doesn't re-implement the animation.

## Phase plan

Numbered to continue from existing PHASES.md.

**Phase 7 — canonical format + section library** (foundation, ~1 week)
- Define `SiteProject`, `Section`, `Page` in a new `packages/types/`
- Implement 10 section types in `packages/sections/`
- Update `apps/yappaflow-mcp/src/tools/build-site.ts` to return `SiteProject` JSON instead of platform files
- Unit tests: each section's default content renders without errors

**Phase 8 — builder MVP** (biggest single phase, ~2–3 weeks)
- Scaffold `apps/builder` (Next.js + Zustand + iframe canvas)
- Page navigator, section list, right-rail property editor
- Inline text editing (Tiptap), image picker, color picker bound to DNA
- Section variant swap, add/remove/reorder
- Viewport switcher, preview mode
- LocalStorage autosave

**Phase 9 — hero inspiration picker** (small, ~2 days)
- Pre-builder step: generate 3 hero variants from the brief
- Selection UI with optional text nudge
- Picked hero seeds the full SiteProject generation

**Phase 10 — Shopify adapter-v2** (~1 week)
- Per-section mappers for all 10 section types
- End-to-end smoke test against Shopify CLI dev store
- Replace `/rpc/build_site platform:"shopify"` with the v2 adapter

**Phase 11 — animation system** (~3–4 days)
- 12 GSAP presets + shared runtime package
- Builder binding UI
- Adapter serialization (Shopify first; other CMS attach the same attributes)

**Phase 12 — remaining CMS adapters** (~1 week each)
- Webflow v2
- WordPress v2
- IKAS v2
- All using the same section-mapper pattern

**Phase 13 — polish + agency beta** (open)
- Product intake flow for e-commerce briefs
- Real storage (optional — if agencies want project history)
- Brand kit presets
- Onboarding flow

## What this obsoletes

- `apps/yappaflow-mcp/src/adapters/shopify/` — replaced by `adapters-v2/shopify/`. Keep around until v2 is shipping; then delete.
- Similar replacement for `adapters/html`, `adapters/wordpress`, `adapters/ikas`, `adapters/webflow`.
- `build_site` tool becomes a thin wrapper: generate SiteProject → hand off to builder OR run a v2 adapter for direct export.

## Open questions (decide as we build)

1. **Generation model for SiteProject content.** One big prompt vs. one prompt per section? Leaning per-section — smaller context, easier retry, natural retry-on-fail per section.
2. **Asset pipeline in the builder.** Client-side only (blob URLs) or eager upload to CDN? Client-only is consistent with "no server persistence"; eager upload makes export easier.
3. **Preview hosting.** Do agency clients see live previews? If yes, we need share links, which needs server persistence. Punt to Phase 13.
4. **Template starters.** Do we ship a few hand-crafted SiteProject presets (SaaS landing, coffee shop, agency portfolio) as a fallback when generation is uninspiring? Probably — Phase 9.

## Success metrics (post-Phase 10)

1. An agency user can go brief → edited Shopify theme in ≤ 10 min with no CLI.
2. Zero-404 uploads: every route renders after upload.
3. The builder state that produced the theme matches what the theme renders (visual diff ≤ 5%).
4. Re-export to a second CMS (Webflow, after Phase 12) works without touching the builder.
