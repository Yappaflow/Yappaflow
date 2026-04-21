/**
 * System prompt for the Shopify BRAND LAYER.
 *
 * Yappaflow now ships a full, pre-built Shopify 2.0 theme scaffold at
 * `server/scaffolds/shopify-base/` — layout, templates, sections,
 * snippets, assets, locales, the lot. Cart, product, search, account
 * and checkout-adjacent Liquid are already correct and well-behaved.
 *
 * The AI's only job is the BRAND LAYER on top of that scaffold:
 *
 *   1. Design tokens — palette + fonts that become CSS custom properties
 *      via `config/settings_data.json` → `layout/theme.liquid`.
 *   2. `assets/brand.css` — a small CSS override file loaded after
 *      `base.css`. Typography polish, button nuance, hover behaviour,
 *      the kind of things that distinguish one brand from another.
 *   3. Homepage section composition — which of the scaffold's sections
 *      to render, in what order, with what copy. This is written into
 *      `config/settings_data.json` (`current.sections`,
 *      `current.content_for_index`).
 *   4. A hero section settings block whose copy EXACTLY matches the
 *      hero the user picked in the chooser (if one was locked).
 *
 * The output format is strict JSON (schema below) — not a file dump. The
 * scaffold-first pipeline parses the JSON, merges it into the scaffold,
 * zips the bundle, and ships. This keeps this prompt tight (~3k tokens
 * per call vs ~32k for a full-theme generation), leaves the well-tested
 * Liquid plumbing untouched, and makes iteration cheap.
 */

import {
  renderDesignDirectionBlock,
  type DesignDirection,
} from "../design-directions";

/* ------------------------------------------------------------------ *
 * Option types                                                        *
 * ------------------------------------------------------------------ */

export interface ShopifyProductForPrompt {
  handle:       string;
  name:         string;
  price:        number;
  currency?:    string;
  description?: string;
  variantKind?: string;
  variants?:    Array<{ label: string; price?: number }>;
}

export interface BrandLayerIdentitySummary {
  brandName:    string;
  tagline?:     string;
  industry?:    string;
  tone?:        string;
  audience?:    string;
  valueProps?:  string[];
}

export interface GenerateShopifyBrandOptions {
  identity:    BrandLayerIdentitySummary;
  products?:   ShopifyProductForPrompt[];
  direction?:  DesignDirection;
  /**
   * srcdoc HTML of the hero variant the user locked. We only use it to
   * extract copy + composition archetype; the actual Liquid hero is the
   * scaffold's `sections/hero.liquid`, driven by section settings.
   */
  lockedHero?: string;
}

/* ------------------------------------------------------------------ *
 * Shared schema string                                                *
 *                                                                     *
 * Centralised so the patch prompt below can reference the same shape. *
 * ------------------------------------------------------------------ */

const OUTPUT_SCHEMA = `\
Return ONE JSON object with EXACTLY these top-level keys:

{
  "tokens": {
    "color_bg":         "#hex",
    "color_fg":         "#hex",
    "color_primary":    "#hex",
    "color_on_primary": "#hex",
    "color_surface":    "#hex",
    "color_muted":      "#hex",
    "color_border":     "#hex",
    "color_accent":     "#hex",

    "color_bg_dark":         "#hex",
    "color_fg_dark":         "#hex",
    "color_primary_dark":    "#hex",
    "color_on_primary_dark": "#hex",
    "color_surface_dark":    "#hex",
    "color_muted_dark":      "#hex",
    "color_border_dark":     "#hex",
    "color_accent_dark":     "#hex",

    "font_display_family": "CSS font-family stack (required)",
    "font_body_family":    "CSS font-family stack (required)"
  },

  "brand_name":    "The brand name verbatim",
  "brand_tagline": "Short tagline for the footer / og:description",

  "brand_css": "Full contents of assets/brand.css — a string of CSS",

  "hero": {
    "eyebrow":    "Short kicker text (can be empty string)",
    "headline":   "EXACT headline from the locked hero (if provided)",
    "subhead":    "EXACT subhead from the locked hero (if provided)",
    "cta_label":  "Primary CTA text",
    "cta_link":   "/collections/all or a real Shopify route",
    "cta2_label": "Secondary CTA text (can be empty string)",
    "cta2_link":  "/pages/about or another Shopify route (can be empty)"
  },

  "sections": {
    "feature_grid": {
      "heading":    "Section heading",
      "subheading": "One-line subheading",
      "blocks": [
        { "icon": "truck|leaf|shield|package|star|heart|sparkle|clock",
          "heading": "Feature name",
          "body":    "One-sentence benefit" }
      ]
    },
    "testimonials": {
      "heading":    "Section heading",
      "subheading": "One-line subheading",
      "blocks": [
        { "quote": "Customer quote", "author": "Name", "role": "City or role" }
      ]
    },
    "faq": {
      "heading":    "Questions, answered",
      "subheading": "Friendly one-liner",
      "blocks": [
        { "question": "A question", "answer": "<p>An answer in rich text</p>" }
      ]
    },
    "cta": {
      "heading":   "Final CTA heading",
      "subhead":   "One-line subhead",
      "cta_label": "Button label",
      "cta_link":  "/collections/all or other"
    },
    "featured_products": {
      "heading":    "Homepage products heading",
      "subheading": "Short subhead (optional)",
      "cta_label":  "Browse all",
      "cta_link":   "/collections/all"
    }
  },

  "content_for_index": [
    "hero",
    "featured-products",
    "feature-grid",
    "testimonials",
    "faq",
    "cta"
  ]
}`;

/* ------------------------------------------------------------------ *
 * Locked hero block — same pattern as before but narrower.            *
 * ------------------------------------------------------------------ */

function renderLockedHeroBlock(html: string | undefined): string {
  if (!html) return "";
  return `### Locked hero (USER-PICKED — match EXACTLY)

The user reviewed three hero variants before this build and picked the
one below. The generated \`hero\` section MUST match it on:

- **Copy.** The \`hero.headline\`, \`hero.subhead\`, \`hero.cta_label\`, and
  \`hero.cta2_label\` in your JSON MUST be lifted verbatim from the locked
  HTML. No paraphrasing, no "improvements".
- **Eyebrow.** If the locked hero has an eyebrow / kicker / small text
  above the headline, put it in \`hero.eyebrow\`. Otherwise leave it as
  an empty string.
- **CTA intent.** Primary CTA links to /collections/all (unless the
  locked hero strongly implies another route, e.g. /pages/about).

\`\`\`html
${html.trim().slice(0, 8000)}
\`\`\`
`;
}

/* ------------------------------------------------------------------ *
 * Identity + products blocks                                          *
 * ------------------------------------------------------------------ */

function renderIdentityBlock(i: BrandLayerIdentitySummary): string {
  const lines = [
    `- Brand: ${i.brandName}`,
    i.tagline    ? `- Tagline: ${i.tagline}`       : null,
    i.industry   ? `- Industry: ${i.industry}`     : null,
    i.tone       ? `- Tone: ${i.tone}`             : null,
    i.audience   ? `- Audience: ${i.audience}`     : null,
    i.valueProps && i.valueProps.length
      ? `- Value props: ${i.valueProps.slice(0, 6).join("; ")}`
      : null,
  ].filter(Boolean);
  return `### Brand identity
${lines.join("\n")}`;
}

function renderProductsBlock(products: ShopifyProductForPrompt[] | undefined): string {
  if (!products || products.length === 0) return "";
  const currency = products[0].currency || "USD";
  const lines = products.slice(0, 20).map((p, i) =>
    `${i + 1}. ${p.name} — ${currency} ${p.price}${p.description ? ` — ${p.description}` : ""}`
  );
  return `### Products in the store
${lines.join("\n")}`;
}

/* ------------------------------------------------------------------ *
 * Main prompt — FULL brand layer                                      *
 * ------------------------------------------------------------------ */

export function getGenerateShopifyBrandPrompt(
  opts: GenerateShopifyBrandOptions,
): string {
  const { identity, products, direction, lockedHero } = opts;

  return `You are the BRAND LAYER generator for a Yappaflow Shopify build.

A complete, production-ready Shopify 2.0 theme already exists — header,
footer, cart, product page, collections, search, customer accounts, the
whole plumbing layer. You are NOT generating Liquid files, you are
NOT writing JavaScript, you are NOT restructuring the theme.

Your only job is to make the pre-built scaffold look and read like THIS
specific brand. That means producing a single JSON object with:

  1. **Design tokens** — colors and font stacks that will be injected as
     CSS custom properties. Think carefully: the palette has to work in
     BOTH light and dark mode. No neon on white. Contrast AAA where
     possible, AA minimum on body text.
  2. **brand.css** — a small CSS override string. Typography polish,
     button refinements, a distinctive detail or two. NOT a full
     stylesheet. Under 4 KB. Reference only the CSS classes that exist
     in the scaffold (.btn, .btn--primary, .hero, .hero__headline,
     .section, .product-card, .heading, .display, .lede, .muted, etc.).
  3. **Hero section settings** — copy that matches the locked hero.
  4. **Homepage section composition** — which sections run on the
     homepage, with what heading/subheading/block content.

${renderIdentityBlock(identity)}

${direction ? renderDesignDirectionBlock(direction) : ""}

${renderLockedHeroBlock(lockedHero)}

${renderProductsBlock(products)}

## Hard rules

- **Output is ONE valid JSON object.** No prose before or after. No
  markdown fences. Just the JSON, parseable by \`JSON.parse\`.
- **Respect the schema EXACTLY.** Missing keys will break the build.
- **Colors are CSS hex (#rrggbb).** No rgb(), no hsl(), no named colors.
- **Fonts are CSS font-family stacks.** E.g.
  \`"Fraunces, ui-serif, Georgia, serif"\`. Use Google-Fonts-safe families.
  Always include a generic fallback.
- **Content depth.** feature_grid should have 4 blocks. testimonials
  3 blocks. faq 4-6 blocks. No single-block sections.
- **Voice.** All copy reads in the brand's tone. Short sentences. No AI
  filler ("Welcome to", "In today's fast-paced world", etc.). Concrete
  claims, not vague adjectives.
- **Light-by-default.** Light palette is the primary reading mode, dark
  palette is a legit toggle. Dark values should feel crafted, not
  auto-inverted.
- **No hero copy paraphrase.** If a locked hero is provided, copy is
  EXACT.

## Output schema

${OUTPUT_SCHEMA}

Return only the JSON object. Begin your response with \`{\`.`;
}

/* ------------------------------------------------------------------ *
 * Patch prompt — narrow regen of the brand JSON when validation fails *
 *                                                                     *
 * The validator may reject the brand JSON for concrete reasons        *
 * (e.g. missing dark-mode token, contrast too low, empty feature_grid *
 * blocks). Rather than a full regen, we hand the model the existing   *
 * JSON plus the specific issues and ask for a corrected JSON back.    *
 * ------------------------------------------------------------------ */

export interface PatchShopifyBrandIssue {
  /** Dot path inside the brand JSON, e.g. "tokens.color_fg_dark". */
  path:    string;
  /** Human-readable problem summary. */
  issue:   string;
  /** Optional hint at an acceptable resolution. */
  suggest?: string;
}

export interface PatchShopifyBrandOptions {
  identity:       BrandLayerIdentitySummary;
  direction?:     DesignDirection;
  lockedHero?:    string;
  previousJson:   string;
  issues:         PatchShopifyBrandIssue[];
}

export function getPatchShopifyBrandPrompt(
  opts: PatchShopifyBrandOptions,
): string {
  const { identity, direction, lockedHero, previousJson, issues } = opts;

  const issuesBlock = issues
    .map((i, idx) =>
      `${idx + 1}. \`${i.path}\` — ${i.issue}${i.suggest ? ` (try: ${i.suggest})` : ""}`,
    )
    .join("\n");

  return `You previously produced the brand-layer JSON below, and the validator
flagged specific problems. Return a CORRECTED JSON object with the same
top-level shape. Preserve anything that wasn't flagged.

${renderIdentityBlock(identity)}

${direction ? renderDesignDirectionBlock(direction) : ""}

${renderLockedHeroBlock(lockedHero)}

## Previous JSON

\`\`\`json
${previousJson}
\`\`\`

## Issues to fix

${issuesBlock}

## Output schema (unchanged)

${OUTPUT_SCHEMA}

Return only the corrected JSON. Begin your response with \`{\`.`;
}

/* ------------------------------------------------------------------ *
 * Back-compat shims — old callers imported these names.               *
 * The service is being rewritten in lockstep, but export aliases      *
 * keep the import list valid during the transition.                   *
 * ------------------------------------------------------------------ */

export type GenerateShopifyOptions = GenerateShopifyBrandOptions;
export type PatchShopifyOptions    = PatchShopifyBrandOptions;
export type PatchShopifyIssue      = PatchShopifyBrandIssue;
export const getGenerateShopifyPrompt = getGenerateShopifyBrandPrompt;
export const getPatchShopifyPrompt    = getPatchShopifyBrandPrompt;
