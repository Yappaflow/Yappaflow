# Yappaflow UI — Architecture v0.1

Status: proposal / design-only. No implementation yet.
Author role: Principal UI/UX Architect & Creative Director, `@yappaflow/ui`.
Sources of truth, in priority: `memory/UILibrary/CLAUDE.md` → `memory/design/top-design/SKILL.md` → `top-design/references/*.md` → `top-design/insprations/*.png` → this document.

---

## 0. One-paragraph summary

`yappaflow-ui` is an opinionated React + GSAP component library that gives the Yappaflow AI generator a **design vocabulary**, not a widget kit. It ships as a monorepo workspace (`packages/yappaflow-ui`), publishes to NPM as `yappaflow-ui`, and is structured in five layers: **Tokens → Motion Engine → Primitives → Shell → Exhibits**. Every visual decision inherits from the top-design system. Every motion is orchestrated through a single GSAP engine that the AI never has to touch directly. The AI composes a site with 4–8 component calls, not 80.

---

## 1. Monorepo placement

### 1.1 Where it lives

The Yappaflow monorepo currently exposes four workspaces (`web`, `server`, `shared`, `tunnel`) plus the Expo `app`. The UI library is a shared, publishable artifact — it does not belong to any of those. It should be introduced as a new workspace glob:

```
Yappaflow/
├── app/                       # Expo (unchanged)
├── server/                    # AI + generator (consumer)
├── shared/                    # types/constants (consumer)
├── tunnel/
├── web/                       # Next.js marketing/app (consumer)
├── sites/                     # generated outputs (indirect consumer)
└── packages/
    └── yappaflow-ui/          # NEW — the library
```

Update `package.json > workspaces` to add `"packages/*"`. Keep `turbo.json` lean: `yappaflow-ui` needs `build`, `dev` (watch), `lint`, `test`, and a `release` pipeline.

### 1.2 Package shape

```
packages/yappaflow-ui/
├── package.json              # name: "yappaflow-ui", exports map, peerDeps
├── tsconfig.json             # extends shared base
├── tsup.config.ts            # ESM + CJS, dts, sourcemaps, tree-shakable
├── README.md
├── CHANGELOG.md              # changesets
├── .changeset/
├── src/
│   ├── index.ts              # barrel — only the public surface
│   ├── tokens/               # LAYER 1
│   ├── motion/               # LAYER 2
│   ├── primitives/           # LAYER 3
│   ├── shell/                # LAYER 4
│   ├── exhibits/             # LAYER 5
│   ├── styles/               # CSS (tokens, reset, base typography)
│   ├── theme/                # theme provider + dark/light toggle
│   ├── hooks/                # cross-cutting non-motion hooks
│   └── utils/                # cn(), tw merging, SSR guards
├── stories/                  # Storybook (design sandbox)
└── tests/                    # vitest + @testing-library/react
```

Peer deps (not bundled): `react`, `react-dom`, `gsap`. The library registers GSAP plugins internally but never ships its own copy.

Hard deps: `@gsap/react` (official hooks), `lenis` (smooth scroll), `clsx`, `tailwind-merge`, `class-variance-authority`.

### 1.3 Build + distribution

- **tsup** produces dual ESM/CJS with sourcemaps and `.d.ts`.
- **Tree-shakable exports** — every layer is a distinct entry point (`yappaflow-ui/exhibits`, `yappaflow-ui/motion`, etc.) so Next.js can code-split cleanly and the AI-generated static sites can import only what they use.
- **CSS shipped separately** at `yappaflow-ui/styles.css`. This is the tokens layer compiled to CSS variables — consumers import it once at the app root.
- **Changesets** for versioning. SemVer strict. The AI generator pins to a minor range.
- **`"sideEffects": false`** wherever possible; motion/engine is the one legitimate side-effectful entry (plugin registration) and is marked so.

---

## 2. The five layers

Each layer has a hard rule: it may only import from layers **below** it. No circular dependencies. No exceptions.

```
┌───────────────────────────────────────────────────────────┐
│  LAYER 5 — EXHIBITS     the Art                           │
│  ExhibitHero, FeatureWall, EditorialSpread, GalleryGrid… │
├───────────────────────────────────────────────────────────┤
│  LAYER 4 — SHELL        the Frame                         │
│  GalleryShell, NavShell, FootShell, Exhibit (section)     │
├───────────────────────────────────────────────────────────┤
│  LAYER 3 — PRIMITIVES   the Composition Grammar           │
│  Frame, Column, Spread, Stack, Mark, Display, Body        │
├───────────────────────────────────────────────────────────┤
│  LAYER 2 — MOTION       the Breath                        │
│  MotionProvider, Reveal, ScrollSection, AmbientLayer,     │
│  Magnetic, Cursor, useReveal, useScrollTrigger…           │
├───────────────────────────────────────────────────────────┤
│  LAYER 1 — TOKENS       the DNA                           │
│  color, typography, spacing, radius, motion, grid         │
└───────────────────────────────────────────────────────────┘
```

### 2.1 Layer 1 — Tokens (DNA)

Pure data. No DOM, no React. Compiles to:

- `tokens/index.ts` — TypeScript constants (the `motion` tokens are consumed by the engine directly).
- `styles/tokens.css` — CSS custom properties under `:root` and `[data-theme="dark"]`.

Token categories:

- **color** — warm-neutral base (`--ff-ink: #0a0a0a`, `--ff-paper: #fafaf9`), accent slot (`--ff-accent`), functional slots (`text/primary`, `text/secondary`, `text/tertiary`, `surface`, `border`, `selection`). Light is the default per project rule; dark is derived from the accent, not pure black.
- **typography** — display / editorial / body / mono families as CSS variables; the library ships with a recommended premium stack (Pangram Pangram Neue Machina for display, Instrument Serif for editorial, Inter Tight or Space Grotesk as the neutral body fallback). Consumers override via CSS vars or the `ThemeProvider`.
- **scale** — modular scale anchored on 18px body, display ratio ≥ 10:1. Tokens expose `--ff-type-display-xl / lg / md / sm`, `--ff-type-body-lg / md / sm`, `--ff-type-mono`.
- **spacing** — 4px base, non-linear (4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256). Named tokens: `gutter`, `breath`, `room`, `hall`.
- **radius** — intentionally sparse (`sharp` 0, `soft` 4px, `framed` 12px). No pill buttons by default.
- **motion** — easings, durations, staggers (Section 4).
- **grid** — 12-col desktop, 8-col tablet, 4-col mobile; gutters and max-widths as tokens.

### 2.2 Layer 2 — Motion (Breath)

The single place GSAP lives. Consumers never import `gsap` directly. This is how we keep the easing/timing contract and how we stop the AI from inventing animations. Detailed in Section 4.

### 2.3 Layer 3 — Primitives (Composition grammar)

Small, un-opinionated structural pieces the Shell and Exhibit layers compose with. They exist so we don't re-derive layout logic in every exhibit. They look invisible when rendered alone — they are syntax, not art.

- `Frame` — bounded content box with intentional offsets (`offset="left" | "right" | "center"`, `bleed="none" | "left" | "right" | "both"`). This is how we break the grid on purpose.
- `Column` — single intrinsic column with measure control (`measure="intimate" | "reading" | "wide"` maps to 45ch / 60ch / 75ch).
- `Spread` — two-track asymmetric layout (`ratio="1:2" | "2:3" | "1:4" | "phi"`). Key tool for editorial hero variants.
- `Stack` — vertical rhythm using the spacing scale (`rhythm="breath" | "room" | "hall"`).
- `Display` / `Body` / `Mark` — typography primitives that pull the correct token stack and apply tight tracking for `Display` / loose leading for `Body` automatically. `Mark` is a single-word emphasis span for accent color.
- `Spacer` — never used to solve layout problems. Ships because the AI reaches for it reflexively; we export a constrained version tied to the spacing scale so it can't go wrong.

### 2.4 Layer 4 — Shell (Frame)

The restrained perimeter of every site. Intentionally quiet.

- `GalleryShell` — the root. Mounts `MotionProvider`, `ThemeProvider`, Lenis, and (opt-in) the `Cursor`. Every generated site renders exactly one `GalleryShell` at the top.
- `Exhibit` — section wrapper. Props: `tone="dense" | "breathing" | "signature"`, `edge="contained" | "full-bleed"`, `rhythm="room" | "hall"`. Determines vertical padding, inner Frame width, and whether ambient motion layers are enabled.
- `NavShell` — top frame. Defaults to transparent-over-hero, pinned-after-scroll. Minimal: wordmark, 3–5 links, one accent CTA.
- `FootShell` — bottom frame. Dense information block with editorial rhythm, not a dumping ground.
- `ThemeToggle` — the light/dark switch. Project rule: every generated site must ship this.

### 2.5 Layer 5 — Exhibits (Art)

The art on the walls. Each Exhibit is a **composition**, not a widget. It takes content, not configuration. Ten or fewer props, high visual payload. First set proposed in Section 3.

---

## 3. First core components

The AI needs a minimum viable vocabulary to generate a full site. Six Exhibits + four Shell pieces + four Motion wrappers + the Primitives = every composition Yappaflow currently produces.

### 3.1 Hero family

The hero is the signature moment. We ship four variants — chosen so the AI can pick by **mood**, not by fiddling with props.

| Component | Composition strategy | When the AI should choose it |
|---|---|---|
| `ExhibitHero` | Viewport-filling display type, offset 8.33% left, tiny subtext, optional ambient layer, soft scroll cue. The canonical gallery hero. | Default for brand / agency / SaaS. Unless something else is specified, this is the hero. |
| `StatementHero` | Single headline, no subtext, no CTA. Typography-as-architecture. Uses `Display` at `--ff-type-display-xl`. | Cultural, portfolio, editorial. When the name alone is the statement. |
| `FramedHero` | `Spread` layout with editorial asymmetry: headline on one track, a single bleeding image on the other. Image reveals via mask. | Product, studio, fashion. Anywhere a hero image is the co-lead. |
| `SplitHero` | Two `Frame`s side-by-side with contrasting density — one all whitespace + headline, one dense with proof (testimonial, stat, secondary CTA). | B2B with immediate credibility pressure. |

Each hero accepts a shared prop vocabulary:

```tsx
<ExhibitHero
  eyebrow="Signal → Website"          // small uppercase label
  headline="Talk. Ship. Own it."      // display line(s)
  subtext="Yappaflow turns chat into a live site in under a minute."
  cta={{ label: "Start a project", href: "/start" }}
  ambient="noise"                     // "none" | "noise" | "gradient-drift" | "breathing"
  media={<Image src="..." />}         // slot, optional
/>
```

Shared invariants, enforced inside the component:

- Headline is rendered through `<Display>` with line-by-line stagger reveal.
- Entry choreography runs on mount via the motion engine (200–600ms primary, 400–900ms secondary, 600–900ms CTA).
- Layout offsets come from `Frame` — the hero never writes raw margins.
- Respects `prefers-reduced-motion` (Section 4.7).

### 3.2 Layout exhibits

- `EditorialSpread` — an asymmetric text+media section using `Spread`. Two variants: `orientation="image-left" | "image-right"`, and three `tone`s.
- `FeatureWall` — a grid of 3/4/5/6 "feature cards" using `GalleryGrid` primitive internally, each with a scroll-staggered reveal. Cards are minimal: label, headline, one line of description. No icons by default (per top-design: custom icons or typographic treatments, never stock).
- `GalleryGrid` — varied-size image grid, intentional asymmetry. Not every cell is the same dimensions. For case-study / portfolio use.
- `ProofLine` — a single row of logos, stats, or quotes. Horizontal scroll on small screens with clear affordance.
- `SignatureCTA` — the closing gallery moment. Large type, single action, minimal framing. Uses `Magnetic` on the CTA.

### 3.3 Shell components

`GalleryShell`, `Exhibit`, `NavShell`, `FootShell`, `ThemeToggle` — as defined in Section 2.4. These are the first components implemented because every other exhibit renders inside them.

### 3.4 Motion primitives (detailed in Section 4.6)

`MotionProvider`, `<Reveal>`, `<ScrollSection>`, `<AmbientLayer>`, `<Magnetic>`, `<Cursor>`.

### 3.5 The AI's expected call site

This is the quality bar for token-efficiency — a full hero + feature + CTA in under 25 lines:

```tsx
<GalleryShell theme="auto">
  <NavShell brand="Yappaflow" links={[...]} cta={{ label: "Start", href: "/start" }} />

  <ExhibitHero
    eyebrow="Signal → Website"
    headline="Talk. Ship. Own it."
    subtext="Yappaflow turns a chat into a live site in under a minute."
    ambient="noise"
  />

  <Exhibit tone="breathing">
    <FeatureWall items={features} layout="3x2" />
  </Exhibit>

  <Exhibit tone="signature">
    <SignatureCTA headline="Your next website is one conversation away." cta={...} />
  </Exhibit>

  <FootShell … />
</GalleryShell>
```

---

## 4. GSAP integration — foundational design

GSAP is treated as a **core architectural layer**, not a dependency. There is one engine, one provider, one set of tokens, and a small surface of hooks + declarative wrappers. The AI never writes a timeline. Raw `gsap.to` / `gsap.from` calls are forbidden outside `src/motion/`.

### 4.1 Module layout

```
src/motion/
├── engine.ts           # registerPlugins() — runs once, client-only
├── provider.tsx        # <MotionProvider> — context + Lenis + matchMedia
├── tokens.ts           # easings, durations, staggers, timelines
├── hooks/
│   ├── use-reveal.ts
│   ├── use-scroll-trigger.ts
│   ├── use-stagger.ts
│   ├── use-split-text.ts
│   ├── use-magnetic.ts
│   └── use-ambient.ts
├── components/
│   ├── Reveal.tsx
│   ├── ScrollSection.tsx
│   ├── AmbientLayer.tsx
│   ├── Magnetic.tsx
│   └── Cursor.tsx
└── index.ts
```

### 4.2 The engine — one registration, one ticker

`engine.ts` is the only file that imports from `gsap` directly. It:

1. Guards against SSR (`typeof window === "undefined"` → no-op).
2. Registers the needed plugins once: `ScrollTrigger`, `SplitText`, `CustomEase` (for our non-standard curves if we ever need them inline), `Flip` (for shared-element transitions later).
3. Exports a `getGsap()` accessor for the hooks.
4. Sets library-wide defaults:

```ts
gsap.defaults({
  ease: easings.expoOut,
  duration: durations.primary,
});
ScrollTrigger.config({ ignoreMobileResize: true });
```

5. Syncs GSAP's ticker with Lenis (single RAF loop, zero jank):

```ts
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

This sync is the one optimization that separates premium scroll from "just smooth". It's installed once by the provider and never by consumers.

### 4.3 Motion tokens — the easing/timing contract

All values come from `motion/tokens.ts`. Consumers of hooks pass semantic names, never numbers.

```ts
export const easings = {
  expoOut:   [0.16, 1, 0.3, 1],       // default for reveals
  quartOut:  [0.25, 1, 0.5, 1],       // default for interactions
  expoInOut: [0.87, 0, 0.13, 1],      // page transitions, pinned beats
} as const;

export const durations = {
  structure: 0.2,   // 0–200ms
  primary:   0.6,   // 200–600ms (headlines, heroes)
  secondary: 0.9,   // 400–900ms (subtext, CTAs)
  sequence:  1.2,   // hard max
} as const;

export const staggers = {
  text:    0.06,    // 40–80ms
  default: 0.08,    // 60–100ms
  section: 0.14,    // 100–160ms
} as const;
```

The top-design banned list (`ease`, `linear`, `ease-in`, `ease-out`) is enforced with a lint rule (`no-restricted-syntax` on string literals) so any accidental raw easing gets caught in CI.

### 4.4 MotionProvider — the orchestration root

Mounted once by `GalleryShell`. Responsibilities:

- Boot the engine (`registerPlugins()`).
- Instantiate Lenis with premium defaults (`lerp: 0.1`, `smoothWheel: true`).
- Hook Lenis → GSAP ticker (4.2).
- Create the library-wide `gsap.matchMedia` context for `prefers-reduced-motion` — every hook attaches its animations to this context so they are auto-killed/downgraded when the media query flips.
- Expose context value: `{ reducedMotion, registerTimeline, lenis }`.
- Clean up on unmount via `mm.revert()`.

### 4.5 Hooks — the only permitted GSAP surface inside components

- `useReveal(ref, { variant, delay })` — the workhorse. Variants: `text-lines`, `text-words`, `mask-up`, `fade-translate`, `stagger-children`. Internally uses SplitText for text variants.
- `useScrollTrigger(ref, opts)` — thin typed wrapper that auto-registers with the provider's matchMedia and cleans up.
- `useStagger(parentRef, childSelector, opts)` — applies the canonical stagger tokens.
- `useSplitText(ref, opts)` — returns `{ lines, words, chars, revert }`; guards against re-splitting.
- `useMagnetic(ref, strength)` — cursor-follow hover effect for CTAs.
- `useAmbient(ref, pattern)` — ultra-slow ambient motion: `float`, `breathe`, `drift`, `grain`.

All hooks:

- Are **client-only** by design (no-op on server).
- Accept a `ref`, never query the DOM.
- Return a `revert()` function for manual teardown (rare — the matchMedia context handles 99% of cleanup).
- Never take raw easing strings — only the `easings.*` semantic names.

### 4.6 Declarative wrappers — what the AI actually writes

Hooks are for library authors. Wrappers are for consumers (and the AI).

- `<Reveal variant="text-lines" delay="primary">` — wraps children, uses `useReveal`. 90% of motion needs are solved here.
- `<ScrollSection type="pinned-story" | "reveal" | "parallax-subtle">` — a section that sets up a local ScrollTrigger timeline and exposes `data-scroll-progress` to children via context.
- `<AmbientLayer intensity="low" | "medium" | "high" pattern="noise" | "gradient-drift" | "breathing">` — the background-atmosphere layer. Absolute-positioned, GPU-only. Opt-in per exhibit.
- `<Magnetic>` — wraps a single interactive element.
- `<Cursor variant="minimal" | "framed" | "mark">` — opt-in custom cursor, hidden for touch devices, hidden under `prefers-reduced-motion`.

Rule of thumb: if you're reaching for a hook from outside `src/motion/`, stop and wrap it in a declarative component first. The library's value proposition is that the AI gets to say what it wants and never how.

### 4.7 Reduced motion, SSR, performance

- **`prefers-reduced-motion: reduce`** — `MotionProvider` routes every animation through `gsap.matchMedia`. In the reduced branch: no ScrollTriggers bind, reveal variants become `gsap.set(… , { opacity: 1, y: 0 })`, ambient layers render static, Lenis falls back to native scroll. Content is always present in the initial HTML — we only ever animate from visible-but-offset, never from `display: none`.
- **SSR** — every motion file is client-only. Components in Layer 5 that use motion are marked `"use client"` in the Next.js sense but also exported as pure ESM for static-site consumers. The ZIP-exported sites hydrate from a tiny boot script that imports the motion bundle lazily.
- **Performance contract** — only `transform` and `opacity` are ever animated (hooks whitelist properties and throw in dev if violated). `will-change` is set just-in-time and removed on complete. Target: 60 fps at 4× CPU throttle on a mid-2019 MacBook. CI runs a Lighthouse budget per Storybook story.

### 4.8 Anti-patterns (hard stops)

The hooks and wrappers literally cannot express these — they're not "don't", they're unreachable:

- No bounce / elastic eases exported.
- No scroll hijacking (Lenis only smooths, never traps).
- No parallax on text or critical content — `parallax-subtle` only accepts decorative refs (enforced by a prop-level type that excludes semantic elements).
- No random delays — delay is always a named token.

---

## 5. Theming — light default, dark always shipped

Per standing project rule, every generated site defaults to light and ships a dark toggle.

- Tokens are declared under `:root` (light). `[data-theme="dark"]` flips them. No component reads the theme directly — everything goes through `--ff-*` vars.
- Dark palette is **derived from the accent**, not from pure black. The default derivation is: background = `oklch(from var(--ff-accent) 12% 0.02 h)`, text = `oklch(from var(--ff-accent) 96% 0.01 h)`. Consumers can override.
- `ThemeProvider` resolves in this order: `localStorage("ff-theme")` → `prefers-color-scheme` → `light`. Writes to `<html data-theme>` before first paint (inline script, flash-free).
- `ThemeToggle` is a `NavShell` default slot. The AI doesn't have to think about it.
- Both palettes pass WCAG AA at body size.

---

## 6. How this is authored for the AI

The library's job is to make Yappaflow's generator prompts short, deterministic, and visually strong.

- **Semantic props over style props** — `tone="signature"`, not `paddingY={128}`. The AI's vocabulary is curated; it cannot express ugly.
- **Content, not configuration** — hero components take `headline`, `subtext`, `cta`. No `titleFontSize`, no `titleColor`.
- **Safe defaults, narrow variants** — 3–5 variants per component, each already art-directed. If the AI needs something outside the vocabulary, that's a signal we need a new Exhibit — not a new prop.
- **Typed variant unions** — every prop that takes a string is a TS literal union. The generator can enumerate valid values from the types file at prompt time.
- **`yappaflow-ui/manifest.json`** — a build artifact describing every component's props, variants, and intended use cases. The server's `static-site-generator.service` reads this to inject a compressed vocabulary into the prompt instead of the full `.d.ts`. This is the single biggest token lever.

---

## 7. Testing + quality gates

- **Storybook** — every component has stories for every variant. This is the design review surface.
- **Chromatic** (or Playwright VRT) — visual regression on every PR. Motion is tested in its resting and completed states, not mid-flight.
- **Vitest + Testing Library** — hook unit tests (reveal timing, matchMedia branching, cleanup).
- **ESLint rules** (custom):
  - `no-restricted-syntax` against raw easing strings.
  - `no-restricted-imports` against `gsap` outside `src/motion/`.
  - `no-restricted-properties` against animating non-whitelisted CSS properties.
- **Bundle budget** — full library tree-shaken hero-only import ≤ 22 KB gzip (without GSAP, which is a peer).
- **Axe-core** checks in Storybook — focus states, contrast, reduced-motion parity.

---

## 8. Open decisions (flagged, not decided)

These are worth a short conversation before implementation starts. Defaults are given so momentum isn't blocked.

1. **Styling strategy** — three options: (a) Tailwind 4 + CSS tokens (fast, familiar to `web`, risk: consumers need Tailwind installed), (b) vanilla-extract (zero-runtime, strong types, extra build cost), (c) CSS modules over CSS tokens (simplest, dullest tooling). **Recommendation: (a)** — `web` is already Tailwind 4, the generated sites can inline the compiled CSS, and the `@source` directive handles the unused-classes problem. Non-Tailwind consumers get the shipped `styles.css` which contains the compiled rules.
2. **Type stack for display** — Pangram Pangram's Neue Machina is the recommended default but is licensed. Fallback tier: Space Grotesk + Instrument Serif (both free, Google Fonts). **Recommendation:** ship with the free stack, document the premium upgrade path.
3. **Custom cursor — opt-in or opt-out?** — The top-design system suggests every 10/10 site has one. But many Yappaflow generated sites are SMB/local businesses where a custom cursor will feel alien. **Recommendation:** opt-in via `GalleryShell cursor="framed"`, default off. Generator decides per industry.
4. **Lenis vs Locomotive Scroll** — both referenced in top-design. Lenis is smaller, newer, actively maintained, works with React 19. **Recommendation: Lenis.**
5. **WebGL layer (Active Theory territory)** — out of scope for v0.1, but we should reserve the module name `motion/gl/` and the exhibit `ExhibitCanvas` to avoid a future breaking change.

---

## 9. Delivery plan — what ships first

Not implemented yet. When implementation begins, order of operations:

1. **Scaffold the workspace** — `packages/yappaflow-ui/`, tsup, tsconfig, exports map, peer deps, Storybook.
2. **Tokens + styles/tokens.css** — full token system, both themes, ThemeProvider, ThemeToggle.
3. **Motion engine + provider + hooks** — engine, Lenis, matchMedia, `useReveal`, `useScrollTrigger`, `useMagnetic`, `useAmbient`. No exhibits yet.
4. **Primitives** — `Frame`, `Column`, `Spread`, `Stack`, `Display`, `Body`, `Mark`.
5. **Shell** — `GalleryShell`, `Exhibit`, `NavShell`, `FootShell`.
6. **First three exhibits** — `ExhibitHero`, `FeatureWall`, `SignatureCTA`. Enough to generate a one-page site.
7. **Manifest generator** — emit `manifest.json` at build time; wire `static-site-generator.service` to read it.
8. **Next three exhibits** — `StatementHero`, `EditorialSpread`, `GalleryGrid`.
9. **Public NPM release** — `yappaflow-ui@0.1.0` via changesets.

Each step ends in a Storybook review. No step merges without VRT green.

---

## 10. Closing principle

Every line in this library should answer one question: **does this make the AI stronger?**

If the answer is no — the component is wrong, the prop is wrong, or the motion is decoration. The gallery is the product.
