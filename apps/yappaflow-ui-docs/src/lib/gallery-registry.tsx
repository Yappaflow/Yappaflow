import { type ReactNode } from "react";
import {
  Frame,
  Stack,
  Display,
  Body,
  Eyebrow,
  Mark,
  Spread,
  Column,
} from "yappaflow-ui/primitives";
import { Reveal, AmbientLayer, Magnetic, ScrambleText, ScrollSection } from "yappaflow-ui/motion";
import { ThemeToggle } from "yappaflow-ui/theme";
import { ExhibitHero } from "yappaflow-ui/exhibits";
import { Exhibit, NavShell, FootShell, GalleryShell } from "yappaflow-ui/shell";

/**
 * Gallery registry. One entry per showcased component.
 *
 * Adding a new component:
 *   1. Add it here with a slug, title, layer, description, example code,
 *      and a preview render function.
 *   2. The index page renders the cards, /gallery/[slug] renders the detail.
 *
 * `example` is what we show as the copy-pasteable snippet; it should match
 * (as closely as practical) the preview render.
 */
export interface GalleryEntry {
  slug: string;
  title: string;
  layer: "Primitives" | "Shell" | "Motion" | "Exhibits" | "Theme";
  summary: string;
  example: string;
  /** Live preview render. Called inside a padded canvas on the detail page. */
  Preview: () => ReactNode;
  /** Smaller preview used on the index cards. Optional; falls back to Preview. */
  IndexPreview?: () => ReactNode;
  /** Props table. Optional. */
  props?: Array<{
    name: string;
    type: string;
    defaultValue?: string;
    description: string;
  }>;
}

export const GALLERY: GalleryEntry[] = [
  // ─────────────── Primitives ───────────────
  {
    slug: "display",
    title: "Display",
    layer: "Primitives",
    summary:
      "The oversized editorial type primitive. Fluid scale, balanced wrapping, and display-font defaults.",
    example: `<Display size="lg" tracking="tight" balance>
  Work you can
  live inside.
</Display>`,
    Preview: () => (
      <Display size="lg" tracking="tight" balance>
        {"Work you can\nlive inside."}
      </Display>
    ),
    props: [
      { name: "size", type: '"sm" | "md" | "lg" | "xl"', defaultValue: '"lg"', description: "Size tier from the fluid type scale." },
      { name: "tracking", type: '"tight" | "normal"', defaultValue: '"normal"', description: "Letter spacing." },
      { name: "balance", type: "boolean", defaultValue: "false", description: "Apply `text-wrap: balance` for orphan-free headlines." },
      { name: "as", type: "ElementType", defaultValue: '"h1"', description: "Override the rendered element." },
    ],
  },
  {
    slug: "body",
    title: "Body",
    layer: "Primitives",
    summary: "Body-copy primitive with tone hierarchy (primary / secondary / tertiary).",
    example: `<Body size="lg" tone="secondary">
  A small practice for large ideas.
</Body>`,
    Preview: () => (
      <Stack rhythm="gutter">
        <Body size="lg" tone="primary">Primary — full contrast body text.</Body>
        <Body size="md" tone="secondary">Secondary — supporting copy.</Body>
        <Body size="sm" tone="tertiary">Tertiary — captions and fineprint.</Body>
      </Stack>
    ),
    props: [
      { name: "size", type: '"lg" | "md" | "sm"', defaultValue: '"md"', description: "Body size." },
      { name: "tone", type: '"primary" | "secondary" | "tertiary"', defaultValue: '"primary"', description: "Text color from the hierarchy." },
    ],
  },
  {
    slug: "eyebrow",
    title: "Eyebrow",
    layer: "Primitives",
    summary: "Small uppercase label that sits above headlines.",
    example: `<Eyebrow>A component library</Eyebrow>`,
    Preview: () => <Eyebrow>A component library</Eyebrow>,
  },
  {
    slug: "mark",
    title: "Mark",
    layer: "Primitives",
    summary: "Accent-colored inline mark for pull phrases in body copy.",
    example: `<Body>The library that makes <Mark>ambient motion</Mark> easy.</Body>`,
    Preview: () => (
      <Body size="lg" tone="primary">
        The library that makes <Mark>ambient motion</Mark> easy.
      </Body>
    ),
  },
  {
    slug: "frame",
    title: "Frame",
    layer: "Primitives",
    summary:
      "Bounded container with gallery-grade gutters. Offset and span are the only knobs.",
    example: `<Frame span={10} offset="center">
  <Display size="md">Centered frame</Display>
</Frame>`,
    Preview: () => (
      <Frame span={10} offset="center">
        <Display size="sm" tracking="tight">Centered ten-span frame.</Display>
      </Frame>
    ),
    props: [
      { name: "span", type: "4 | 6 | 8 | 10 | 12", defaultValue: "12", description: "Column span in the 12-col grid." },
      { name: "offset", type: '"left" | "right" | "center"', defaultValue: '"left"', description: "Horizontal anchoring." },
      { name: "bleed", type: '"none" | "edge" | "full"', defaultValue: '"none"', description: "Edge-bleed behavior." },
    ],
  },
  {
    slug: "stack",
    title: "Stack",
    layer: "Primitives",
    summary: "Vertical rhythm — gutter / breath / room / hall.",
    example: `<Stack rhythm="breath">
  <Eyebrow>Studio</Eyebrow>
  <Display size="md">Work</Display>
  <Body tone="secondary">Projects from 2018 onward.</Body>
</Stack>`,
    Preview: () => (
      <Stack rhythm="breath">
        <Eyebrow>Studio</Eyebrow>
        <Display size="sm" tracking="tight">Work</Display>
        <Body tone="secondary">Projects from 2018 onward.</Body>
      </Stack>
    ),
  },
  {
    slug: "spread",
    title: "Spread",
    layer: "Primitives",
    summary: "Horizontal split with editorial ratios (1:1, 1:2, 2:3, phi).",
    example: `<Spread ratio="phi">
  <Display size="md">Headline</Display>
  <Body>Counterweight copy.</Body>
</Spread>`,
    Preview: () => (
      <Spread ratio="phi">
        <Display size="sm" tracking="tight">Headline</Display>
        <Body tone="secondary">
          The golden-ratio split pulls the heavier mass left and leaves the
          eye with a calmer reading edge on the right.
        </Body>
      </Spread>
    ),
  },
  {
    slug: "column",
    title: "Column",
    layer: "Primitives",
    summary: "Measure-constrained column for long prose.",
    example: `<Column measure="reading">
  <Body>A full paragraph of reading-comfortable copy…</Body>
</Column>`,
    Preview: () => (
      <Column measure="reading">
        <Body>
          The measure primitive caps a column at a typographically comfortable
          width — intimate, reading, or wide — so body copy never sprawls
          across a full-bleed exhibit.
        </Body>
      </Column>
    ),
  },

  // ─────────────── Theme ───────────────
  {
    slug: "theme-toggle",
    title: "ThemeToggle",
    layer: "Theme",
    summary:
      "Light / dark toggle. Ships on every Yappaflow-generated site per the standing rule.",
    example: `<ThemeToggle variant="mark" />`,
    Preview: () => (
      <div style={{ display: "flex", gap: "var(--ff-space-5)", alignItems: "center" }}>
        <ThemeToggle variant="mark" />
        <ThemeToggle variant="framed" />
      </div>
    ),
    props: [
      { name: "variant", type: '"mark" | "framed"', defaultValue: '"mark"', description: "Visual treatment." },
      { name: "label", type: "string", description: "Override the aria-label (defaults to context-aware)." },
    ],
  },

  // ─────────────── Motion ───────────────
  {
    slug: "reveal",
    title: "Reveal",
    layer: "Motion",
    summary:
      "Declarative entry animation. You pass a semantic beat, not a tween.",
    example: `<Reveal beat="primary" variant="text-lines" stagger="text">
  <Display size="md">Revealed on mount.</Display>
</Reveal>`,
    Preview: () => (
      <Reveal beat="primary" variant="text-lines" stagger="text">
        <Display size="sm" tracking="tight" balance>
          {"Revealed on mount —\ntext-lines stagger."}
        </Display>
      </Reveal>
    ),
    props: [
      { name: "beat", type: '"structure" | "primary" | "secondary" | "cta"', defaultValue: '"primary"', description: "Position on the page-load score." },
      { name: "variant", type: '"fade-translate" | "text-lines" | "text-words" | "mask-up" | "stagger-children"', defaultValue: '"fade-translate"', description: "Animation shape." },
      { name: "stagger", type: '"text" | "default" | "section"', description: "Stagger token (text variants only)." },
      { name: "trigger", type: '"mount" | "in-view"', defaultValue: '"mount"', description: "Trigger source." },
    ],
  },
  {
    slug: "ambient-layer",
    title: "AmbientLayer",
    layer: "Motion",
    summary:
      "Background atmosphere — noise, drift, or breathe. Positions absolutely inside a relative parent.",
    example: `<div style={{ position: "relative", minHeight: 240 }}>
  <AmbientLayer pattern="drift" intensity="low" />
  <Display size="sm">Drift behind me.</Display>
</div>`,
    Preview: () => (
      <div style={{ position: "relative", minHeight: 240, padding: "var(--ff-space-6)", overflow: "hidden" }}>
        <AmbientLayer pattern="drift" intensity="low" />
        <Display size="sm" tracking="tight">Ambient drift layer.</Display>
      </div>
    ),
    props: [
      { name: "pattern", type: '"noise" | "drift" | "breathe" | "float" | "grain"', defaultValue: '"breathe"', description: "Ambient shape." },
      { name: "intensity", type: '"low" | "medium" | "high"', defaultValue: '"low"', description: "Motion amplitude." },
    ],
  },
  {
    slug: "magnetic",
    title: "Magnetic",
    layer: "Motion",
    summary:
      "Cursor-follow wrapper. Use on CTAs so the pointer feels pulled toward the mass.",
    example: `<Magnetic>
  <a href="/" data-magnetic>Get started</a>
</Magnetic>`,
    Preview: () => (
      <Magnetic>
        <a href="#" data-magnetic className="landing-cta landing-cta--primary">
          Pull me
        </a>
      </Magnetic>
    ),
  },
  {
    slug: "scramble-text",
    title: "ScrambleText",
    layer: "Motion",
    summary:
      "Per-character scramble-and-settle animation. GSAP-driven, SSR-safe, respects reduced-motion.",
    example: `<ScrambleText
  text="ANIMATE ANYTHING"
  stagger={0.04}
  duration={1.1}
/>`,
    Preview: () => (
      <div style={{ padding: "var(--ff-space-6)" }}>
        <ScrambleText
          text="ANIMATE ANYTHING"
          stagger={0.05}
          duration={1.4}
          style={{
            fontFamily: "var(--ff-font-display)",
            fontSize: "clamp(1.75rem, 4vw, 3rem)",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "var(--ff-text-primary)",
          }}
        />
      </div>
    ),
    props: [
      { name: "text", type: "string", description: "The final string to settle on." },
      { name: "duration", type: "number", defaultValue: "~1.0s", description: "Total sweep duration in seconds." },
      { name: "delay", type: "number", defaultValue: "0", description: "Delay before start (seconds)." },
      { name: "stagger", type: "number", defaultValue: "0.035", description: "Per-character reveal stagger (seconds)." },
      { name: "chars", type: "string", description: "Pool of random characters cycled during the scramble." },
      { name: "trigger", type: '"mount" | "in-view"', defaultValue: '"mount"', description: "Start on mount or once scrolled into view." },
      { name: "replayOnChange", type: "boolean", defaultValue: "true", description: "Re-run when `text` changes." },
    ],
  },
  {
    slug: "scroll-section",
    title: "ScrollSection",
    layer: "Motion",
    summary:
      "Section wrapper for reveal-on-scroll, pin, or parallax. Picks the right ScrollTrigger config so you don't have to.",
    example: `<ScrollSection type="reveal">
  <Display size="md">
    I fade and translate in on viewport entry.
  </Display>
</ScrollSection>`,
    Preview: () => (
      <ScrollSection type="reveal">
        <div style={{ padding: "var(--ff-space-6)" }}>
          <Display size="sm" tracking="tight">
            Reveal on scroll.
          </Display>
          <Body tone="secondary" size="md" style={{ marginTop: "var(--ff-space-3)" }}>
            Change <code style={{ color: "var(--ff-accent)", fontFamily: "var(--ff-font-mono)" }}>type</code> to{" "}
            <code style={{ color: "var(--ff-accent)", fontFamily: "var(--ff-font-mono)" }}>"pin"</code> or{" "}
            <code style={{ color: "var(--ff-accent)", fontFamily: "var(--ff-font-mono)" }}>"parallax"</code>.
          </Body>
        </div>
      </ScrollSection>
    ),
    props: [
      { name: "type", type: '"reveal" | "pin" | "parallax"', defaultValue: '"reveal"', description: "ScrollTrigger behavior preset." },
      { name: "start", type: "string", description: "GSAP ScrollTrigger start position override." },
      { name: "end", type: "string", description: "GSAP ScrollTrigger end position override." },
      { name: "scrub", type: "boolean | number", description: "Link progress to scroll (pass a number for eased scrub)." },
      { name: "as", type: "ElementType", defaultValue: '"section"', description: "Override the rendered tag." },
    ],
  },
  {
    slug: "cursor",
    title: "Cursor",
    layer: "Motion",
    summary:
      "Opt-in custom cursor overlay. Disabled on touch and under reduced motion. Grows over interactive elements.",
    example: `<GalleryShell cursor="minimal">
  {/* cursor renders once at the root */}
</GalleryShell>`,
    Preview: () => (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 200,
          position: "relative",
          overflow: "hidden",
          background: "var(--ff-paper)",
          border: "1px dashed var(--ff-border)",
          borderRadius: "var(--ff-radius-sharp)",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "var(--ff-accent)",
            boxShadow: "0 0 0 6px color-mix(in oklab, var(--ff-accent) 28%, transparent)",
            left: "52%",
            top: "48%",
            transform: "translate(-50%, -50%)",
          }}
        />
        <Body tone="secondary" size="sm">
          Enable once on <code style={{ color: "var(--ff-accent)", fontFamily: "var(--ff-font-mono)" }}>&lt;GalleryShell&gt;</code>.
        </Body>
      </div>
    ),
    props: [
      { name: "variant", type: '"minimal" | "framed" | "mark"', defaultValue: '"minimal"', description: "Cursor visual treatment." },
      { name: "interactiveSelector", type: "string", description: "CSS selector for elements the cursor should enlarge over." },
    ],
  },

  // ─────────────── Exhibits ───────────────
  {
    slug: "exhibit-hero",
    title: "ExhibitHero",
    layer: "Exhibits",
    summary:
      "The canonical art-gallery hero. Eyebrow, headline, subtext, CTA, optional ambient layer and media slot.",
    example: `<ExhibitHero
  eyebrow="Studio"
  headline={"Work you can\\nlive inside."}
  subtext="A small practice for large ideas."
  cta={{ label: "See work", href: "/work" }}
  ambient="drift"
/>`,
    Preview: () => (
      <div style={{ position: "relative", overflow: "hidden", border: "1px solid var(--ff-border)", borderRadius: "var(--ff-radius-sharp)", background: "var(--ff-paper)" }}>
        <ExhibitHero
          eyebrow="Studio"
          headline={"Work you can\nlive inside."}
          subtext="A small practice for large ideas."
          cta={{ label: "See work", href: "#" }}
          ambient="drift"
          size="lg"
        />
      </div>
    ),
    props: [
      { name: "eyebrow", type: "string", description: "Uppercase label above the headline." },
      { name: "headline", type: "string", description: "Signature headline — use `\\n` for line breaks." },
      { name: "subtext", type: "string", description: "One-line supporting copy." },
      { name: "cta", type: "{ label: string; href: string }", description: "Primary call to action." },
      { name: "ambient", type: '"none" | "noise" | "drift" | "breathe"', defaultValue: '"noise"', description: "Background atmosphere." },
      { name: "alignment", type: '"left" | "center"', defaultValue: '"left"', description: "Horizontal alignment inside the frame." },
      { name: "size", type: '"lg" | "xl"', defaultValue: '"lg"', description: "Display-type size." },
    ],
  },

  // ─────────────── Shell ───────────────
  {
    slug: "exhibit",
    title: "Exhibit",
    layer: "Shell",
    summary:
      "Section wrapper with tone, edge, and rhythm. Every content block on every site sits inside one of these.",
    example: `<Exhibit tone="breathing" edge="contained" rhythm="room">
  <Frame span={10} offset="center">
    <Display size="md">A room-rhythm exhibit.</Display>
  </Frame>
</Exhibit>`,
    Preview: () => (
      <Exhibit tone="breathing" edge="contained" rhythm="gutter">
        <Frame span={10} offset="center">
          <Display size="sm" tracking="tight">A room-rhythm exhibit.</Display>
        </Frame>
      </Exhibit>
    ),
    props: [
      { name: "tone", type: '"dense" | "breathing" | "signature"', defaultValue: '"breathing"', description: "Visual density." },
      { name: "edge", type: '"contained" | "full-bleed"', defaultValue: '"contained"', description: "Edge behavior." },
      { name: "rhythm", type: '"gutter" | "breath" | "room" | "hall"', description: "Vertical rhythm override." },
    ],
  },
  {
    slug: "gallery-shell",
    title: "GalleryShell",
    layer: "Shell",
    summary:
      "The single root wrapper. Mounts ThemeProvider + MotionProvider + optional Cursor, and paints the paper background.",
    example: `<GalleryShell theme="light" smoothScroll cursor={false}>
  {/* exactly one of these per site */}
</GalleryShell>`,
    Preview: () => (
      <div
        aria-hidden
        style={{
          position: "relative",
          background: "var(--ff-paper)",
          border: "1px solid var(--ff-border)",
          borderRadius: "var(--ff-radius-sharp)",
          overflow: "hidden",
          padding: "var(--ff-space-6)",
          display: "grid",
          gap: "var(--ff-space-3)",
        }}
      >
        <Eyebrow>
          <span style={{ color: "var(--ff-accent)" }}>●</span>&nbsp; root
        </Eyebrow>
        <Body size="md" tone="secondary">
          Theme + motion + cursor, wrapped once.
        </Body>
        <div style={{ display: "flex", gap: "var(--ff-space-2)", flexWrap: "wrap" }}>
          {["theme", "motion", "cursor?"].map((x) => (
            <span
              key={x}
              style={{
                fontFamily: "var(--ff-font-mono)",
                fontSize: "0.72rem",
                padding: "0.2rem 0.55rem",
                border: "1px solid var(--ff-border)",
                borderRadius: 999,
                color: "var(--ff-text-secondary)",
              }}
            >
              {x}
            </span>
          ))}
        </div>
      </div>
    ),
    props: [
      { name: "theme", type: '"light" | "dark" | "auto"', defaultValue: '"light"', description: "Initial theme mode. Yappaflow default is light." },
      { name: "smoothScroll", type: "boolean", defaultValue: "true", description: "Enable Lenis smooth scroll." },
      { name: "cursor", type: 'boolean | "minimal" | "framed" | "mark"', defaultValue: "false", description: "Opt-in custom cursor." },
    ],
  },
  {
    slug: "nav-shell",
    title: "NavShell",
    layer: "Shell",
    summary:
      "Sticky top navigation — brand, link row, optional CTA, and the theme toggle. Transparent over the hero, opaque once scrolled.",
    example: `<NavShell
  brand="Studio"
  links={[{ label: "Work", href: "/work" }]}
  cta={{ label: "Contact", href: "/contact" }}
/>`,
    Preview: () => (
      <div style={{ position: "relative", minHeight: 120, background: "var(--ff-paper)", border: "1px solid var(--ff-border)", borderRadius: "var(--ff-radius-sharp)", padding: "var(--ff-space-3) var(--ff-space-5)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--ff-space-4)" }}>
        <span style={{ fontFamily: "var(--ff-font-display)", fontWeight: 600, letterSpacing: "-0.01em" }}>Studio</span>
        <div style={{ display: "flex", gap: "var(--ff-space-5)", fontFamily: "var(--ff-font-body)", fontSize: "0.9rem" }}>
          <a href="#" style={{ color: "var(--ff-text-secondary)", textDecoration: "none" }}>Work</a>
          <a href="#" style={{ color: "var(--ff-text-secondary)", textDecoration: "none" }}>About</a>
          <a href="#" style={{ color: "var(--ff-text-secondary)", textDecoration: "none" }}>Contact</a>
        </div>
        <a href="#" className="landing-cta landing-cta--primary" style={{ fontSize: "0.85rem", padding: "0.4rem 0.9rem" }}>
          Get started
        </a>
      </div>
    ),
    props: [
      { name: "brand", type: "ReactNode", description: "Left-side brand mark or text." },
      { name: "links", type: "{ label: string; href: string }[]", description: "Link row." },
      { name: "cta", type: "{ label: string; href: string }", description: "Optional right-side CTA." },
      { name: "showThemeToggle", type: "boolean", defaultValue: "true", description: "Render the theme toggle." },
      { name: "sticky", type: "boolean", defaultValue: "true", description: "Fix to the top of the viewport." },
    ],
  },
  {
    slug: "foot-shell",
    title: "FootShell",
    layer: "Shell",
    summary:
      "Editorial footer — oversized tagline, grouped link columns, fineprint base. Not a link dumping ground.",
    example: `<FootShell
  brand="Studio"
  tagline="Small practice, large ideas."
  columns={[
    { title: "Work", links: [{ label: "Projects", href: "/work" }] },
    { title: "Studio", links: [{ label: "About", href: "/about" }] },
  ]}
  fineprint="© 2026 Studio · MIT"
/>`,
    Preview: () => (
      <FootShell
        brand="Studio"
        tagline="Small practice, large ideas."
        columns={[
          { title: "Work", links: [{ label: "Projects", href: "#" }, { label: "Case studies", href: "#" }] },
          { title: "Studio", links: [{ label: "About", href: "#" }, { label: "Contact", href: "#" }] },
        ]}
        fineprint="© 2026 Studio · MIT"
      />
    ),
    props: [
      { name: "brand", type: "ReactNode", description: "Large brand text, stacked above the tagline." },
      { name: "tagline", type: "string", description: "Closing statement — gets the prominence." },
      { name: "columns", type: "{ title: string; links: { label: string; href: string }[] }[]", description: "Grouped link columns." },
      { name: "fineprint", type: "ReactNode", description: "Copyright or legal line at the base." },
    ],
  },
];

export function getEntry(slug: string): GalleryEntry | undefined {
  return GALLERY.find((e) => e.slug === slug);
}

export function groupByLayer(): Record<string, GalleryEntry[]> {
  return GALLERY.reduce<Record<string, GalleryEntry[]>>((acc, e) => {
    (acc[e.layer] ||= []).push(e);
    return acc;
  }, {});
}
