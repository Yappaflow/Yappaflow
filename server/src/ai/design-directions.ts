/**
 * Design Directions — archetypes the AI generator commits to.
 *
 * Background. The old prompts had a soft "design guidance" paragraph that
 * said things like "pick an aesthetic direction (editorial / luxury /
 * playful / brutalist / …)". In practice the model would collapse to the
 * safest middle — soft serif hero + muted palette, no signature moments.
 * Users sent screenshots of Dialect, Telha Clarke, Lightweight, OCCUPY,
 * and Better Off® (Awwwards SOTD-grade sites) and asked why our output
 * didn't feel anywhere near that bar.
 *
 * This file answers the feedback by turning "aesthetic direction" into
 * a discrete, over-specified contract. Each `DesignDirection` is:
 *
 *   1. grounded in ONE of the inspiration screenshots so the model has a
 *      concrete mental image rather than a vague adjective,
 *   2. fully constrained — palette roles, type pair, hero archetype,
 *      section rhythm, signature motion, image treatment, copy voice —
 *      so two sibling generations can't drift into different systems,
 *   3. platform-neutral. The same direction threads into the Shopify
 *      prompt (Liquid + CSS), the Yappaflow prompt (React + yappaflow-ui
 *      GSAP primitives), and every other site generator we add.
 *
 * A direction is picked once per build (see `pickDesignDirection`) and
 * rendered into the prompt via `renderDesignDirectionBlock`. Deterministic
 * so retry attempts stay on the same lane — we don't want attempt 1 to be
 * brutalist and attempt 2 editorial-minimal, because the patch path needs
 * the two halves of the bundle to share a visual vocabulary.
 *
 * NOTE. These directions are NOT style tokens — they're instruction
 * scaffolds fed to the model. The model still has to read the identity
 * (businessName, tone, city, products) and translate the direction
 * faithfully. The directions just fence off the search space.
 */

export type DesignDirectionKey =
  | "editorial-minimal"       // safe fallback — warm serif hero
  | "dialect-brutalist"       // Dialect SOTD — uppercase display clipped at viewport edges
  | "telha-architectural"     // Telha Clarke — scattered photo thumbnails + mono metadata
  | "lightweight-numeric"     // Lightweight — dark bg, italic serif logo, numbered sections
  | "occupy-metallic"         // OCCUPY — dark + metallic 3D spike hero, CJK/display mix
  | "betteroff-lookbook";     // Better Off® — massive bold serif, scattered photos, timeline

export interface PaletteRoles {
  /** Primary surface — the "page" color. Warm-tinted near-neutral. */
  surface:    string;
  /** Typography + foreground lines on `surface`. WCAG-AA against it. */
  ink:        string;
  /** Secondary surface used for cards, rails, footers. */
  recess:     string;
  /** ONE accent. Used on CTAs, links, and single-detail moments — never everywhere. */
  accent:     string;
}

export interface TypePair {
  /** Display family — headlines, heroes, statements. Google-font or system fallback name. */
  display:    string;
  /** Body family — paragraphs and UI. */
  body:       string;
  /** Optional mono family for metadata labels, coordinates, timestamps. */
  mono?:      string;
  /** How the display family should be TREATED (not the family itself). */
  displayStyle: "serif-editorial" | "sans-display" | "italic-serif" | "mono-display";
  /**
   * Recommended scale contrast between display and body. e.g. "10:1" means
   * 180px display / 18px body. Minimum — the model is free to push further.
   */
  scaleContrast: string;
  /** Exact tracking for display. Negative values tighten large type. */
  displayTracking: string;
}

/**
 * One archetype the model can commit to. Every field gets rendered into
 * the prompt. If a field is empty string, that whole line is omitted.
 */
export interface DesignDirection {
  key:          DesignDirectionKey;
  /** Short human label shown in logs + the UI progress widget. */
  label:        string;
  /** One-sentence hook so the model knows the destination before the details. */
  tagline:      string;
  /**
   * Which user screenshot this direction is grounded in. Used verbatim in
   * the prompt so the model has a concrete reference in mind. Short
   * descriptions — not URLs, because the model is text-only.
   */
  referenceNote: string;
  palette:      PaletteRoles;
  /** Dark-mode palette — the SAME brand at night, not a different site. */
  paletteDark:  PaletteRoles;
  type:         TypePair;
  /** How the hero section should read. 1-3 short sentences. */
  heroArchetype: string;
  /**
   * Section rhythm: vertical breathing room between sections at desktop.
   * Expressed as a CSS value the model can paste directly.
   */
  sectionRhythm: string;
  /** Signature motion — the ONE moment users screenshot. */
  signatureMotion: string;
  /**
   * How images behave. This is where scroll/image-animation primitives live.
   * Translated per-platform by the generator prompt.
   */
  imageTreatment: string;
  /**
   * Copy voice cues (UPPERCASE, short sentences, coordinate labels, etc).
   * The model should not paraphrase the identity's tone — it should
   * *perform* it inside these constraints.
   */
  copyVoice:    string;
  /**
   * Signature micro-detail — the 1% most designers skip. Custom cursor,
   * bracketed buttons, numbered sections, ® superscripts, etc.
   */
  microDetail:  string;
  /** Free-form list of extra dos (one per line, imperative). */
  dos:          string[];
  /** Free-form list of banned moves. Don't let the model regress. */
  donts:        string[];
}

// ── Directions ───────────────────────────────────────────────────────

/**
 * Safe editorial default. Not flashy — but it's the floor we're willing to
 * ship, and it still clears the 8/10 mark: warm serif hero, generous white
 * space, restrained single-accent palette, subtle entry choreography.
 */
const EDITORIAL_MINIMAL: DesignDirection = {
  key:   "editorial-minimal",
  label: "Editorial Minimal",
  tagline:
    "Warm serif hero, generous negative space, one accent, subtle motion — " +
    "an independent shop's considered storefront, not a Dawn fork.",
  referenceNote:
    "Reference: classic editorial e-commerce. Single centred hero headline in a " +
    "distinctive serif, a one-sentence subhead, a single primary CTA. " +
    "Everything else below the fold is patient and considered.",
  palette: {
    surface: "#FAF7F2",  // warm near-white, the texture of uncoated paper
    ink:     "#1A1714",  // warm near-black
    recess:  "#F1ECE3",
    accent:  "#C94A1B",  // burnt sienna — works on cream, survives dark mode
  },
  paletteDark: {
    surface: "#141210",
    ink:     "#F1ECE3",
    recess:  "#1F1B17",
    accent:  "#E86A3C",
  },
  type: {
    display:       '"Instrument Serif", "GT Sectra", Georgia, serif',
    body:          '"Inter Tight", "Inter", system-ui, sans-serif',
    mono:          '"JetBrains Mono", ui-monospace, monospace',
    displayStyle:  "serif-editorial",
    scaleContrast: "10:1 minimum (e.g. 180px display / 18px body)",
    displayTracking: "-0.02em",
  },
  heroArchetype:
    "Viewport-filling serif headline in 2-4 words. Short (<1 sentence) subhead " +
    "below. One primary CTA button, one secondary text link. No hero image. " +
    "The hero is TYPE.",
  sectionRhythm: "clamp(96px, 12vw, 160px) between major sections",
  signatureMotion:
    "On page load, the hero headline enters line-by-line with a 120ms stagger " +
    "(not character-by-character — that reads as gimmicky). Easing: " +
    "cubic-bezier(0.16, 1, 0.3, 1) over 900ms. Nothing else moves on the first " +
    "frame. After the headline settles, subhead + CTA fade up 200ms later.",
  imageTreatment:
    "Below the fold, product / feature images reveal on scroll with a " +
    "clip-path sweep from bottom (90% → 0% inset). Use IntersectionObserver " +
    "(Shopify) or `<Reveal variant=\"fade-translate\">` (Yappaflow). No parallax.",
  copyVoice:
    "Sentence case. Warm, declarative. One idea per line. Never hype words " +
    "(\"revolutionary\", \"game-changing\"). Speak to a single reader.",
  microDetail:
    "Custom `::selection` in the accent color. Underlines on links render as " +
    "1px with a 3px offset (not the default browser underline).",
  dos: [
    "Reserve the accent color for CTAs + link hovers only.",
    "Use `text-wrap: balance` on every headline.",
    "Smart quotes (`\u201c\u201d`), proper apostrophes (`\u2019`), en-dashes for ranges.",
  ],
  donts: [
    "No gradient backgrounds of any kind — flat colors only.",
    "No parallax on headlines or body copy (motion sickness).",
    "No drop shadows on cards — use a 1px border in an opacity-shifted ink.",
  ],
};

/**
 * Dialect — Awwwards SOTD. Massive uppercase grotesque clipped at the
 * viewport edges (the letters go wider than the screen on purpose).
 * Mono coordinate labels like "X:1044 Y:1077" scattered along the edges.
 * A bracketed `[MENU]` in the top-right. Horizontal image strip that drags
 * under scroll. Black surface, warm off-white ink.
 */
const DIALECT_BRUTALIST: DesignDirection = {
  key:   "dialect-brutalist",
  label: "Dialect Brutalist",
  tagline:
    "Uppercase grotesque at architectural scale, deliberately clipping the " +
    "viewport. Mono coordinate labels, bracketed controls, black surface.",
  referenceNote:
    "Reference: the Dialect SOTD. The brand name sits in a black canvas at " +
    "display sizes so large the letters exceed the viewport width — " +
    "intentionally cropped. Coordinate-style metadata in tiny mono text floats " +
    "near the edges. A `[MENU]` button with literal square brackets sits top-right. " +
    "A horizontal image strip across the bottom drags with scroll.",
  palette: {
    surface: "#0A0908",
    ink:     "#F1ECE3",
    recess:  "#141210",
    accent:  "#FF5B1F",  // safety orange — high energy on black
  },
  paletteDark: {
    surface: "#0A0908",
    ink:     "#F1ECE3",
    recess:  "#141210",
    accent:  "#FF5B1F",
  },
  type: {
    display:       '"Space Grotesk", "Neue Haas Grotesk", Helvetica, sans-serif',
    body:          '"Inter Tight", system-ui, sans-serif',
    mono:          '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace',
    displayStyle:  "sans-display",
    scaleContrast: "15:1 — display is 18-22vw, body is 14-16px",
    displayTracking: "-0.04em",
  },
  heroArchetype:
    "Single word or short brand mark set in uppercase sans at 18-22vw so it " +
    "overshoots the viewport on both sides (use `width: 120vw; margin-left: " +
    "-10vw;` or similar). The letter shapes ARE the composition. No hero " +
    "image. Subhead in tiny mono (10-12px) at the bottom-left.",
  sectionRhythm: "clamp(160px, 18vw, 240px) — huge breathing room",
  signatureMotion:
    "The oversized display mark enters with a vertical clip reveal from bottom " +
    "(clip-path: inset(100% 0 0 0) → inset(0 0 0 0)) over 1200ms, expo-out. " +
    "Coordinate labels fade in one-by-one at 80ms stagger starting 600ms into " +
    "the reveal. After the hero, content sections snap to section starts via " +
    "scroll-snap-type: y mandatory on the main container.",
  imageTreatment:
    "A horizontal image strip at the bottom of hero/product sections scrolls " +
    "horizontally at 0.7x the vertical scroll velocity (subtle drag). Each " +
    "image has a 1:1 ratio, no rounding, no shadow. On hover: the image desaturates " +
    "slightly and the mono caption slides in from the right.",
  copyVoice:
    "ALL UPPERCASE for labels. Mono coordinate strings next to key elements, " +
    "e.g. `X:1044 Y:1077` or `LAT:41.28 LON:36.33`. Short clipped sentences. " +
    "No exclamation marks. Feels like a technical manual.",
  microDetail:
    "Every button is wrapped in literal square brackets: `[ADD TO CART]`, " +
    "`[MENU]`, `[CLOSE]`. Buttons have no background — just bracket + text + 1px " +
    "underline on hover. Custom cursor: a small `+` crosshair in the accent color.",
  dos: [
    "Crop the display type at viewport edges — overshoot is the point.",
    "Use mono metadata labels (X:/Y:, LAT:/LON:, timestamps) as decoration.",
    "Scroll-snap sections so each feels like a distinct frame.",
    "Let horizontal image strips drag under scroll — 0.7x vertical velocity.",
  ],
  donts: [
    "No centred layouts. Everything anchors to a bracket of the viewport.",
    "No serifs anywhere.",
    "No drop shadows, no gradients, no rounded corners.",
    "Never use the accent color for large surfaces — only thin details.",
  ],
};

/**
 * Telha Clarke — white canvas, scattered architectural photo thumbnails at
 * varied sizes, small centred serif logotype with a `(26)` superscript
 * project count. Mono metadata like `PORTO, PT` and `11:42:07` scattered
 * around. Small `All Work / Discover +` pill navigation.
 */
const TELHA_ARCHITECTURAL: DesignDirection = {
  key:   "telha-architectural",
  label: "Telha Architectural",
  tagline:
    "White canvas, scattered photo thumbnails at different sizes, small " +
    "centred serif logotype, mono metadata. Feels like an architect's portfolio.",
  referenceNote:
    "Reference: the Telha Clarke site. Small centred serif logotype at the top " +
    "with a `(N)` superscript count, architectural photo thumbnails scattered " +
    "asymmetrically at different sizes (some wider than tall, some square), " +
    "mono timestamps and city codes tucked next to them, a tiny `All Work` " +
    "pill button and `Discover +` link. Overall feeling: museum wall label.",
  palette: {
    surface: "#FAFAF7",
    ink:     "#161616",
    recess:  "#F0EEE8",
    accent:  "#2B2B2B",  // graphite — not red/orange; restraint is the accent
  },
  paletteDark: {
    surface: "#111110",
    ink:     "#EFECE5",
    recess:  "#1A1918",
    accent:  "#EFECE5",
  },
  type: {
    display:       '"GT Super Display", "Instrument Serif", Georgia, serif',
    body:          '"Inter Tight", system-ui, sans-serif',
    mono:          '"Space Mono", "IBM Plex Mono", ui-monospace, monospace',
    displayStyle:  "serif-editorial",
    scaleContrast: "6:1 — smaller display than Dialect, bigger than default",
    displayTracking: "-0.02em",
  },
  heroArchetype:
    "Small CENTERED serif logotype at the top (not a giant headline) — 48-72px " +
    "max — with a superscript count like `(26)` in mono. Below: a scattered " +
    "grid of 5-8 image thumbnails at VARIED sizes (use a 12-col grid and place " +
    "thumbnails in spans of 3, 4, 5, 6 at different rows). Each thumbnail has " +
    "a tiny mono caption below it with location code + project year.",
  sectionRhythm: "clamp(72px, 8vw, 120px)",
  signatureMotion:
    "On page load, thumbnails cascade in individually with 90ms stagger, each " +
    "one scaling from 0.96 → 1 AND translating up 12px. Not a uniform grid entry " +
    "— the randomness is the point. On hover, the hovered thumbnail scales to " +
    "1.03 and its mono caption fades from 40% → 100% opacity.",
  imageTreatment:
    "Thumbnails are static rectangles with no rounding, no shadow. On hover: " +
    "a 12px mono caption (city + year) fades in below the image from 40% → 100% " +
    "opacity. When the cursor enters the thumbnail area, a small `+` cursor " +
    "follows with `VIEW` label trailing behind it.",
  copyVoice:
    "Sparse. Single-word section titles (`Work`, `About`, `Contact`). Mono " +
    "metadata strings beside each thumbnail: `PORTO, PT / 2024`, `11:42:07 UTC`. " +
    "Body copy reads like a museum wall card.",
  microDetail:
    "Superscript counts on section labels: `Work (26)`, `Journal (12)`. " +
    "Buttons are pill-shaped with a 1px border, no fill — `All Work`, `Discover +`. " +
    "The `+` at the end of links is part of the copy, not an icon.",
  dos: [
    "Scatter thumbnails asymmetrically across a 12-col grid.",
    "Use mono metadata (city codes, timestamps, project years) beside every image.",
    "Superscript-ify counts: `Work (26)`, `Awards (03)`.",
    "Centre the logotype at the top — it's small, not a giant hero.",
  ],
  donts: [
    "No photographic hero — thumbnails are the entire visual.",
    "No colour accents — graphite is the accent. Restraint IS the design.",
    "No sans-serif display type; the logotype must be a serif.",
  ],
};

/**
 * Lightweight — dark canvas, elegant italic serif logotype, numbered
 * sections (01 PHILOSOPHY / 02 CRAFT / 03 INNOVATION) spread across the
 * viewport. A single centred product hero. A pill-shaped `LEARN MORE`
 * button with a 1px ink border.
 */
const LIGHTWEIGHT_NUMERIC: DesignDirection = {
  key:   "lightweight-numeric",
  label: "Lightweight Numeric",
  tagline:
    "Dark canvas with italic serif logotype, numbered sections (01, 02, 03) " +
    "spread across the top, single centred product hero, pill buttons.",
  referenceNote:
    "Reference: the Lightweight SOTD. Dark near-black canvas, an ELEGANT italic " +
    "serif logotype centred at the top, numbered section labels spread across " +
    "the viewport (`01 PHILOSOPHY` / `02 CRAFT` / `03 INNOVATION`), a single " +
    "centred product or hero element, a pill-shaped `LEARN MORE` button with " +
    "a thin 1px ink border.",
  palette: {
    surface: "#0F0F0E",
    ink:     "#E8E5DE",
    recess:  "#161615",
    accent:  "#D4B896",  // warm champagne — luxury accent, not a pop color
  },
  paletteDark: {
    surface: "#0F0F0E",
    ink:     "#E8E5DE",
    recess:  "#161615",
    accent:  "#D4B896",
  },
  type: {
    display:       '"Italiana", "Playfair Display", Georgia, serif',
    body:          '"Inter Tight", system-ui, sans-serif',
    mono:          '"Space Mono", ui-monospace, monospace',
    displayStyle:  "italic-serif",
    scaleContrast: "8:1 minimum",
    displayTracking: "-0.01em",
  },
  heroArchetype:
    "Small centred italic serif logotype at the top. A row BELOW the logotype " +
    "showing numbered section labels `01 / PHILOSOPHY`, `02 / CRAFT`, `03 / " +
    "INNOVATION` spread across the viewport with generous gaps. A single large " +
    "centred hero element (product image OR a sculptural SVG) beneath. A `[LEARN MORE]` " +
    "pill button with a 1px ink border at the bottom.",
  sectionRhythm: "clamp(120px, 14vw, 200px)",
  signatureMotion:
    "The italic serif logotype enters with a char-by-char fade-in at 40ms " +
    "stagger (the italic serif is delicate enough that letter-by-letter reads " +
    "as craft, not gimmick). Numbered labels slide in from below at 150ms " +
    "stagger AFTER the logotype settles. The hero element fades in last at 1.2s.",
  imageTreatment:
    "Single hero image (or sculptural SVG) is always centred, 60-80% of viewport " +
    "width, with a slow breathing animation: scale 1 → 1.02 → 1 over 8s, ease-in-out. " +
    "Below-the-fold images reveal with a soft opacity fade, no movement.",
  copyVoice:
    "Numbered lists everywhere: `01`, `02`, `03` prefixes on section titles. " +
    "UPPERCASE labels with letter-spacing 0.15em. Italic serif for headlines. " +
    "Short declarative sentences in body copy.",
  microDetail:
    "Buttons are pill-shaped with 1px border, no fill — label in UPPERCASE with " +
    "0.15em letter-spacing, pill radius 999px, padding 14px 32px. On hover the " +
    "pill fills with accent color and text flips to surface color.",
  dos: [
    "Prefix every major section label with `01`, `02`, `03` in mono.",
    "Use italic serif ONLY for the logotype + hero lockup — body stays sans.",
    "Centre the hero element. Dark canvas is the frame.",
    "Pill buttons with 1px border and UPPERCASE labels, nothing else.",
  ],
  donts: [
    "No light-mode default — this direction is dark-first.",
    "No grid-scattered imagery — the composition is centred, singular.",
    "No bright pop accents — champagne is the accent, not orange/red.",
  ],
};

/**
 * OCCUPY — dark canvas with metallic 3D spike or sculptural hero. Thin
 * display type mixed with CJK characters. Navigation spread across the
 * top (ABOUT / COLLECTION / EXPERIENCE / CONTACT). A red foot strip.
 * This is the "maximalist premium" direction — more ornament than
 * Dialect, more drama than Editorial.
 */
const OCCUPY_METALLIC: DesignDirection = {
  key:   "occupy-metallic",
  label: "Occupy Metallic",
  tagline:
    "Dark canvas with a metallic sculptural hero, thin display type, nav spread " +
    "across the top, a signature red accent strip.",
  referenceNote:
    "Reference: the OCCUPY SOTD. Dark canvas, a metallic 3D sculptural object " +
    "(spikes, shards, or a reflective mass) occupies the hero. Thin sans " +
    "display type spells the brand name mixed with CJK characters as " +
    "ornament. Nav links ABOUT / COLLECTION / EXPERIENCE / CONTACT spread " +
    "across the top with generous gaps. A thin red strip runs along the " +
    "bottom of the hero section.",
  palette: {
    surface: "#0C0C0E",
    ink:     "#E4E2DC",
    recess:  "#15151A",
    accent:  "#D62828",  // signature red foot strip
  },
  paletteDark: {
    surface: "#0C0C0E",
    ink:     "#E4E2DC",
    recess:  "#15151A",
    accent:  "#D62828",
  },
  type: {
    display:       '"Syne", "Inter Tight", system-ui, sans-serif',
    body:          '"Inter Tight", system-ui, sans-serif',
    mono:          '"Space Mono", ui-monospace, monospace',
    displayStyle:  "sans-display",
    scaleContrast: "12:1",
    displayTracking: "-0.03em",
  },
  heroArchetype:
    "Centred sculptural hero element — a CSS-only metallic spike cluster OR a " +
    "large inline SVG with a conic-gradient fill simulating chrome reflection. " +
    "The brand name sits BEHIND the sculpture in a thin display sans at 12-16vw, " +
    "partially occluded. A thin 2px red strip runs along the bottom of the hero.",
  sectionRhythm: "clamp(140px, 16vw, 220px)",
  signatureMotion:
    "The sculptural hero rotates SLOWLY on its Y axis (one full rotation per " +
    "30s, constant velocity, CSS-only). The brand name behind it enters with a " +
    "horizontal clip reveal from left-to-right over 1400ms. The red foot strip " +
    "extends from 0 to 100% width as the hero reveal finishes.",
  imageTreatment:
    "Product images sit on a `recess` surface with a 1px red border. On hover: " +
    "the image rotates 2 degrees, a red shadow offset (4px 4px 0 var(--accent)) " +
    "appears below it, and the product name slides in from the right in italic.",
  copyVoice:
    "Brand name occasionally shown as a mix of Latin + CJK (e.g. `OCCUPY 仁占`) " +
    "— ornamental, not literal translation. Nav links in UPPERCASE with 0.2em " +
    "letter-spacing. Section titles feel like chapter headings.",
  microDetail:
    "A thin red strip (2px) runs along the bottom of the hero AND the top of " +
    "the footer — the brand's signature moment. Custom cursor: a tiny red dot.",
  dos: [
    "CSS-only chrome/metallic gradients (conic-gradient for highlights).",
    "Slow Y-axis rotation on the hero sculpture (30s per revolution).",
    "A 2px red strip at the bottom of the hero and top of the footer.",
    "Mix Latin brand name with CJK as ornament once in the hero.",
  ],
  donts: [
    "No light canvas — this direction is always dark.",
    "No serif display — thin sans is the rule.",
    "No product-grid hero — sculptural singular element only.",
  ],
};

/**
 * Better Off® — massive bold black serif brand name with registered-trademark
 * superscript, scattered photographs at wildly varied sizes, a music-player
 * widget top-right, a timeline scrubber across the bottom. White canvas.
 * This is the "lookbook" direction — editorial print magazine energy.
 */
const BETTEROFF_LOOKBOOK: DesignDirection = {
  key:   "betteroff-lookbook",
  label: "Better Off\u00ae Lookbook",
  tagline:
    "Massive bold black serif brand name with \u00ae superscript, scattered " +
    "photographs at varied sizes, timeline scrubber bottom navigation.",
  referenceNote:
    "Reference: the Better Off\u00ae site. White canvas. A HUGE bold black serif " +
    "brand name spans the hero with a small \u00ae superscript (e.g. " +
    "`Better Off\u00ae THE LOOKBACK (BO\u00aeS/2026)`). 5-7 photographs scattered " +
    "across the viewport at wildly different sizes. A floating music-player " +
    "widget in the top-right corner. A horizontal timeline scrubber across the " +
    "bottom like a video timeline.",
  palette: {
    surface: "#FCFBF8",
    ink:     "#080807",
    recess:  "#F2EEE7",
    accent:  "#080807",  // the brand voice is black-on-white — "accent" is ink
  },
  paletteDark: {
    surface: "#0A0908",
    ink:     "#FCFBF8",
    recess:  "#141210",
    accent:  "#FCFBF8",
  },
  type: {
    display:       '"Fraunces", "GT Super Display", Georgia, serif',
    body:          '"Inter Tight", system-ui, sans-serif',
    mono:          '"JetBrains Mono", ui-monospace, monospace',
    displayStyle:  "serif-editorial",
    scaleContrast: "14:1 — display at 12-14vw, body at 16px",
    displayTracking: "-0.035em",
  },
  heroArchetype:
    "Massive bold black serif brand name at 12-14vw, weight 700-900, with a " +
    "small \u00ae superscript in mono (using CSS `vertical-align: super`). " +
    "Photographs scattered asymmetrically around/behind the type — use " +
    "position:absolute with specific `top`/`left` values so the scatter looks " +
    "intentional, not random. Small mono metadata next to each photo " +
    "(collection label, year).",
  sectionRhythm: "clamp(120px, 14vw, 200px)",
  signatureMotion:
    "On page load, the massive serif name enters with a character-by-character " +
    "reveal (opacity 0 → 1, 40ms stagger, cubic-bezier(0.16, 1, 0.3, 1)). " +
    "Scattered photographs fade in one at a time after the name settles, 120ms " +
    "stagger. The timeline scrubber at the bottom extends from 0 → 100% width " +
    "last, as if the site is a film that just loaded.",
  imageTreatment:
    "Photographs are scattered at different sizes — some 280px wide, some 480px, " +
    "some small thumbnails at 160px. On hover: the hovered photo scales to 1.03 " +
    "and sorts above its neighbours (z-index jump). Other photos DESATURATE to " +
    "60% saturation. Use CSS `filter: saturate()` + transitions.",
  copyVoice:
    "Brand voice is confident, punctuated with \u00ae and \u2122 marks. Use " +
    "abbreviations like `BO\u00aeS/2026`, `VOL.03`, `FW26`. Mono metadata " +
    "beside every photo: collection + year + series number.",
  microDetail:
    "A floating music-player widget fixed to the top-right corner of the " +
    "viewport (80px circular, with play button + track name). A horizontal " +
    "timeline scrubber fixed to the bottom of the viewport showing scroll " +
    "progress as if it were video playhead position. Both are decoration — " +
    "the music widget doesn't actually play anything unless audio is configured.",
  dos: [
    "Scatter photographs asymmetrically with absolute positioning — not a grid.",
    "Massive bold black serif brand name with \u00ae superscript.",
    "Use `filter: saturate()` on non-hovered photos when one is hovered.",
    "Add the top-right music-widget + bottom timeline-scrubber micro-details.",
  ],
  donts: [
    "No uniform thumbnail grid — the scatter is the point.",
    "No sans-serif brand name — the wordmark MUST be serif, bold, black.",
    "No drop shadows on photos — scale + filter are the treatments.",
  ],
};

export const DESIGN_DIRECTIONS: Record<DesignDirectionKey, DesignDirection> = {
  "editorial-minimal":   EDITORIAL_MINIMAL,
  "dialect-brutalist":   DIALECT_BRUTALIST,
  "telha-architectural": TELHA_ARCHITECTURAL,
  "lightweight-numeric": LIGHTWEIGHT_NUMERIC,
  "occupy-metallic":     OCCUPY_METALLIC,
  "betteroff-lookbook":  BETTEROFF_LOOKBOOK,
};

// ── Picker ───────────────────────────────────────────────────────────

export interface PickDirectionInput {
  tone?:        string;
  industry?:    string;
  businessName?: string;
  city?:        string;
  hasProducts?: boolean;
  /** Override from the admin UI — if set, we just return this key. */
  forceKey?:    DesignDirectionKey;
}

/**
 * Deterministic mapping from identity signals to a direction key.
 *
 * Strategy:
 *   1. If an explicit `forceKey` is passed, honour it.
 *   2. Otherwise pattern-match against the identity's tone + industry. The
 *      match is keyword-based so the same identity always picks the same
 *      lane — critical for the patch-flow which re-reads the direction on
 *      attempt 2 and must get the SAME archetype it saw on attempt 1.
 *   3. Fall back to editorial-minimal when nothing matches.
 *
 * This is intentionally simple — no AI, no fuzzy lookup. A table of
 * `if (tone.includes(x)) return y` is trivial to audit, easy to extend,
 * and survives refactors.
 */
export function pickDesignDirection(input: PickDirectionInput): DesignDirection {
  if (input.forceKey && DESIGN_DIRECTIONS[input.forceKey]) {
    return DESIGN_DIRECTIONS[input.forceKey];
  }

  const tone     = (input.tone     ?? "").toLowerCase();
  const industry = (input.industry ?? "").toLowerCase();
  const haystack = `${tone} ${industry}`;

  // Brutalist / tech / experimental signals.
  if (/brutal|raw|bold|tech|experimental|underground|industrial|rebel|punk/.test(haystack)) {
    return DIALECT_BRUTALIST;
  }

  // Architectural / studio / portfolio / photography signals.
  if (/architect|studio|portfolio|photograph|gallery|museum|curated/.test(haystack)) {
    return TELHA_ARCHITECTURAL;
  }

  // Luxury / premium / fine jewellery / fine cosmetics signals.
  if (/luxury|premium|elegant|refined|couture|jewell|jewel|perfume|wine|boutique|cosmetic|skincare|fragrance/.test(haystack)) {
    return LIGHTWEIGHT_NUMERIC;
  }

  // Maximalist / streetwear / avant-garde / art-object signals.
  if (/streetwear|avant|maximal|sculpt|art.?object|collectible|hype|drop/.test(haystack)) {
    return OCCUPY_METALLIC;
  }

  // Fashion / lookbook / editorial magazine signals.
  if (/fashion|apparel|lookbook|magazine|editor|publication|zine|clothing|garment/.test(haystack)) {
    return BETTEROFF_LOOKBOOK;
  }

  // Default. Product-heavy generic e-commerce lands here.
  return EDITORIAL_MINIMAL;
}

// ── Prompt rendering ─────────────────────────────────────────────────

/**
 * Render a direction as the "DESIGN DIRECTION" block that gets inlined into
 * every generator prompt. Formatted for readability so a human auditing the
 * prompt can read it top-to-bottom without squinting.
 *
 * Important: this block REPLACES the old soft "Design guidance" section —
 * it's not additive. The model should see one mandatory direction and
 * commit to it, not a list of alternatives.
 */
export function renderDesignDirectionBlock(d: DesignDirection): string {
  const p = d.palette;
  const pd = d.paletteDark;
  return `### DESIGN DIRECTION — "${d.label}" (MANDATORY LANE)

${d.tagline}

${d.referenceNote}

**Palette (light — default)**
- Surface: \`${p.surface}\`   — the "page" color
- Ink:     \`${p.ink}\`   — all body text + foreground lines
- Recess:  \`${p.recess}\`   — cards / rails / footers
- Accent:  \`${p.accent}\`   — CTAs + single-detail moments ONLY

**Palette (dark — derived from the SAME brand, not a slate reset)**
- Surface: \`${pd.surface}\`
- Ink:     \`${pd.ink}\`
- Recess:  \`${pd.recess}\`
- Accent:  \`${pd.accent}\`

**Typography**
- Display family: \`${d.type.display}\` — treatment: ${d.type.displayStyle}
- Body family:    \`${d.type.body}\`
${d.type.mono ? `- Mono family:    \`${d.type.mono}\`` : ""}
- Scale contrast: ${d.type.scaleContrast}
- Display tracking: \`${d.type.displayTracking}\`

**Hero archetype (this is non-negotiable)**
${d.heroArchetype}

**Section rhythm**
Vertical space between major sections: \`${d.sectionRhythm}\`

**Signature motion (the ONE moment users screenshot)**
${d.signatureMotion}

**Image treatment**
${d.imageTreatment}

**Copy voice**
${d.copyVoice}

**Signature micro-detail (the 1% others skip)**
${d.microDetail}

**DOs**
${d.dos.map((x) => `- ${x}`).join("\n")}

**DON'Ts**
${d.donts.map((x) => `- ${x}`).join("\n")}

Commit to this lane. Do not mix archetypes. If a field of the identity
(tone, industry, city) suggests a different direction, let it BEND this one —
not replace it. The generator picked this direction for a reason.`;
}
