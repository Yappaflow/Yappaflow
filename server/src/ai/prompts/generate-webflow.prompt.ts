/**
 * System prompt for the Webflow bundle generator.
 *
 * Webflow's Designer owns layout, so the output of this prompt has two parts:
 *
 *   1. A **pre-Webflow HTML/CSS/JS** draft of the site, which the agency can
 *      either paste into Webflow's "Add code" embed block or use as the
 *      reference when rebuilding in the Designer. This half looks a lot like
 *      the custom static-site output — one-page marketing site with light +
 *      dark themes.
 *
 *   2. A set of **CMS item JSON files** (one per blog post / portfolio piece
 *      / team member), each including the `collectionId` placeholder the
 *      agency swaps for the real Webflow collection id. These are the rows
 *      `webflow-admin.service.ts` can push via the Data API.
 *
 * A separate `products.json` catalog is generated outside this prompt by
 * `webflow-generator.service.ts` so the model doesn't have to be perfectly
 * correct about the Data API's SKU schema.
 *
 * Hard constraints baked into the prompt (same standing rules as every
 * Yappaflow output):
 *   • Light default, dark toggle, WCAG AA, prefers-color-scheme + localStorage.
 *   • No external CDNs or external fonts — system stacks only.
 *   • Top-designer aesthetic — not the default Webflow demo clone.
 */

export interface WebflowProductForPrompt {
  slug:        string;
  name:        string;
  price:       number;
  currency?:   string;
  description?: string;
  variantKind?: string;
  variants?:   Array<{ label: string; price?: number }>;
}

export interface GenerateWebflowOptions {
  products?: WebflowProductForPrompt[];
}

export function getGenerateWebflowPrompt(opts: GenerateWebflowOptions = {}): string {
  const hasProducts = Array.isArray(opts.products) && opts.products.length > 0;

  return `## Task: Generate Webflow Bundle (Designer-ready + Data-API-ready)

You are generating a Webflow-ready bundle for an agency that will either:
  (a) Use the HTML/CSS/JS half as a visual reference while rebuilding in the
      Webflow Designer, OR
  (b) Paste the JS snippets into Webflow's "Before </body>" / "Inside <head>"
      custom code fields for a minimum-viable site.

The product catalog + CMS items are pushed via the Webflow Data API v2 by a
separate service — you do NOT need to emit a products CSV, and you MUST use
the exact file layout below so the downstream pusher can find everything.

### Required file layout (each file is a separate fenced block)

\`\`\`
site/index.html
site/assets/theme.css
site/assets/theme.js
site/assets/theme-toggle.js
webflow/custom-code-head.html
webflow/custom-code-body.html
webflow/collections.json
${hasProducts ? "webflow/product-page.html\n" : ""}README.md
\`\`\`

### Hard requirements

1. **\`site/index.html\`** is a complete, standalone HTML document. It includes
   a header with nav, hero, features/services section, and (for ecommerce
   clients) a featured-products grid rendered from client-side JS that
   fetches \`./products.json\` (the service writes this file next to the
   bundle). No external CDNs, no external fonts. All styling via
   \`<link rel="stylesheet" href="assets/theme.css">\`.
2. **\`site/assets/theme.css\`** holds the FULL design system — CSS variables
   for both themes, typography, buttons, cards, nav, hero, footer, grid.
3. **\`site/assets/theme.js\`** handles interactive behavior (mobile nav
   toggle, product card "add to cart" stub that calls an \`onAddToCart\` hook,
   and lazy image reveal).
4. **\`site/assets/theme-toggle.js\`** implements the mandatory light/dark
   toggle (see "Dual theme" below). It sets
   \`document.documentElement.dataset.theme\` BEFORE first paint — so this
   file must be referenced as a \`<script>\` tag placed in the \`<head>\`
   above the stylesheet link.
5. **\`webflow/custom-code-head.html\`** contains ONLY the \`<script>\` and
   \`<style>\` tags the agency needs to paste into Webflow → Site settings →
   Custom code → "Head code". In practice this is the theme-toggle bootstrap
   and a tiny CSS overrides block that makes Webflow's default elements
   match your palette (\`--accent\`, \`--bg\`, \`--fg\`, \`--bg-dark\`, …).
6. **\`webflow/custom-code-body.html\`** is the "Before </body>" block —
   analytics stub, mobile-nav handlers, the same product grid initializer
   (guarded with \`if (document.querySelector('[data-yappaflow-products]'))\`).
7. **\`webflow/collections.json\`** describes the CMS collections the site
   expects (one per content type the industry calls for — e.g. Posts for a
   blog, Projects for a portfolio, Team for an agency). For each collection:
   \`{ slug, displayName, fields: [{ slug, displayName, type }], sampleItems:
   [{ fieldData: {...} }] }\`. The pusher uses this to create rows via the
   Data API.
${hasProducts
  ? `8. **\`webflow/product-page.html\`** is the full product-detail page
   template (standalone HTML). Variant picker bound to the Webflow Ecommerce
   \`data-variant-id\` attribute pattern. "Add to cart" posts to
   \`/api/ecommerce/add-to-cart\` (the Webflow cart endpoint).
`
  : ""}
${hasProducts ? "9" : "8"}. **\`README.md\`** is a short one-pager for the
   agency: (a) how to paste the Head / Body custom-code blocks, (b) how to
   let Yappaflow push the products + CMS items automatically, (c) the
   fallback "drag the files from \`site/\` into Webflow Designer" path.

### Dual theme (MANDATORY)

Same rule as every other Yappaflow output: light by default, dark toggle that:
- Reads \`localStorage.yappaflow_theme\` then \`prefers-color-scheme\` then light.
- Sets \`document.documentElement.dataset.theme\` BEFORE first paint (from the
  \`theme-toggle.js\` script in \`<head>\`).
- Renders a visible toggle button in the header (inline SVG sun/moon).
- Both palettes pass WCAG AA. Dark palette derived from the brand accent —
  NOT pure black.

### Design guidance

Webflow output should look like it came out of a top agency's Webflow
template, not the default Starter template.

- Pick a cohesive aesthetic direction tied to the identity tone
  (editorial / luxury / playful / brutalist / etc.) and commit to it.
- Distinctive typography pairing via system fallbacks
  (e.g. \`Georgia, "Times New Roman", serif\` for display, \`system-ui\` for body).
- ONE dominant color, ONE accent. Avoid pure black/white.
- Hero with one strong visual idea (oversized lockup, diagonal rule,
  CSS-only marquee, etc.).
- Subtle motion only. \`prefers-reduced-motion\` respected.
- Inline SVGs for logo/icons. CSS-only decorative details preferred.

${hasProducts
  ? `### Products

A catalog will be pushed to Webflow Ecommerce via the Data API. For the
HTML half, hard-code the featured grid from inline \`<template>\` elements
that JS hydrates from \`products.json\` (the service writes this file next
to the bundle at deploy time). On \`product-page.html\`, build a variant
picker that reads \`data-variants\` off a hidden JSON script tag — the
agency will bind those to the Webflow Ecommerce SKU variables.`
  : `### Products

No catalog provided. Still ship a featured-grid section that reads from
\`products.json\` so the site works once the agency adds products via
Webflow Ecommerce. Render an empty state when the array is empty.`}

### Output format

Emit each file as a fenced code block with a \`filepath:\` marker on the
opening fence line, in the order listed under "Required file layout".
Nothing outside these fences — no prose, no commentary.

Example fence:

\`\`\`filepath:site/index.html
<!doctype html>
...
\`\`\`

Begin.`;
}
