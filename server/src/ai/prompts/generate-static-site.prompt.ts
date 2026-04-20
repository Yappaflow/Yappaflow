/**
 * System prompt for the custom-platform static site generator.
 *
 * The prompt is built at request time so we can bake the product catalog
 * (for e-commerce clients) straight into the instructions — that way the
 * model has a concrete list to render into the `#shop` section instead of
 * hallucinating placeholders.
 *
 * Every site shipped from Yappaflow must:
 *   • look like a top-designer built it (distinctive typography, committed
 *     aesthetic direction, considered motion, no "AI slop")
 *   • default to LIGHT theme but expose a working DARK-theme toggle that
 *     respects `prefers-color-scheme` on first load and persists the
 *     user's choice in `localStorage`
 *   • render a `#shop` products section with variants when the identity
 *     includes a non-empty `products` array
 */

export interface ProductVariantForPrompt {
  label:  string;
  price?: number;
}

export interface ProductForPrompt {
  name:        string;
  price:       number;
  currency?:   string;
  description?: string;
  images?:     string[];
  variants?:   ProductVariantForPrompt[];
  variantKind?: string; // e.g. "size", "color"
}

export interface GenerateStaticSiteOptions {
  products?: ProductForPrompt[];
}

export function getGenerateStaticSitePrompt(opts: GenerateStaticSiteOptions = {}): string {
  const hasProducts = Array.isArray(opts.products) && opts.products.length > 0;

  const productsBlock = hasProducts
    ? `

### E-commerce mode (products are present)

A product catalog will be passed in the user message under \`products\`. You MUST render
an \`id="shop"\` section in \`index.html\` (linked from the nav as "Shop") that contains:

- One product card per item (CSS grid, responsive). Each card includes:
  - All images as a small gallery. The first image is the primary; clicking/tapping a
    thumbnail swaps the primary image (progressive enhancement in \`script.js\`).
  - Product name, short description, and formatted price (respect \`currency\`; default USD).
  - If the product has \`variants\` (e.g. sizes S/M/L/XL or colors), render them as a
    segmented control of pill-buttons. Selected state is visually obvious. The selected
    variant's \`data-variant\` attribute is mirrored onto the parent \`<article data-product>\`.
  - A primary "Add to cart" button. There is no real backend, so the button calls a
    \`yappaCart.add(productId, variant)\` function defined in \`script.js\` which maintains
    a cart in \`localStorage\` (key: \`yappaflow_cart\`) and updates a header cart badge.
- A minimal cart drawer (right-side slide-over) rendered once in \`index.html\` with:
  line items, quantity +/-, subtotal, and a "Checkout" button that links to
  \`/contact.html?checkout=1\`. Contact form should detect the \`checkout=1\` query and
  prefill the message with the cart contents.
- Clean empty state if the cart is empty ("Your cart is empty — keep browsing").

If a product has no \`images\`, render a tasteful SVG placeholder styled to the brand
palette (no stock-photo URLs, no external assets).

All money formatting happens in \`script.js\` via \`new Intl.NumberFormat(...)\`.`
    : `

### E-commerce mode

No \`products\` array is provided, so do NOT render a Shop section or cart UI.`;

  return `## Task: Generate Static Site (Yappaflow Custom Platform)

You are generating a complete, production-ready marketing website using ONLY static
HTML, CSS, and JavaScript. No build step, no frameworks, no npm, no CDNs, no external
fonts, no external images. The agency will download a ZIP of your output and upload
it directly to any static host (Namecheap / Hostinger / S3 / Netlify).

This is the flagship deliverable of Yappaflow. Your output must read as if a
top-tier independent studio shipped it — NOT as a template, NOT as generic AI slop.

### Hard requirements

1. **Zero dependencies.** No React, Vue, Tailwind, Bootstrap, jQuery, or any CDN
   scripts. Everything inline or in the files you emit. No external fonts
   (use system / pairing stacks defined in CSS variables).
2. **Files exactly (in this order):** \`index.html\`, \`about.html\`, \`contact.html\`,
   \`assets/style.css\`, \`assets/script.js\`.
3. **Mobile-first, responsive.** Use \`clamp()\` for fluid type, CSS grid/flex for
   layout, container queries where it clarifies the component.
4. **Semantic HTML5.** \`<header>\`, \`<nav>\`, \`<main>\`, \`<section>\`, \`<article>\`,
   \`<footer>\`, proper heading hierarchy, ARIA labels on interactive controls.
5. **Relative links between pages** (\`/about.html\`, \`/contact.html\`, \`/\`,
   \`#shop\`, \`#contact\`).
6. **Accessibility baseline:** \`lang\` on \`<html>\`, \`alt\` on every image, focus-
   visible styles with obvious contrast, \`prefers-reduced-motion\` respected on
   every animation, AA contrast in BOTH themes.
7. **Performance:** no blocking scripts, no heavy animations, no layout shift.
   \`<script>\` at end of \`<body>\` with \`defer\` where applicable.

### Dual theme (MANDATORY — non-negotiable)

Every site must ship in LIGHT theme by default and expose a DARK theme.

- Define the full palette as CSS custom properties on \`:root\` (light) and
  \`[data-theme="dark"]\` (dark). Both themes must pass WCAG AA for body text.
- On page load, a small inline script at the TOP of \`<head>\` resolves the
  effective theme in this order: (1) \`localStorage.yappaflow_theme\`,
  (2) \`window.matchMedia("(prefers-color-scheme: dark)")\`, (3) light.
  It sets \`document.documentElement.dataset.theme\` BEFORE first paint to
  avoid a flash.
- A clearly-visible toggle button sits in the \`<header>\` on every page. It
  shows a sun icon in dark mode and a moon icon in light mode (inline SVG).
  Clicking it flips \`data-theme\`, writes to \`localStorage\`, and the change
  is picked up by CSS transitions on \`background-color\` and \`color\`
  (\`transition: background-color .25s ease, color .25s ease\`).
- The dark palette is DERIVED from the brand — NOT slate-900/white. It feels
  like the same brand at night, not a different site.

### Design guidance (aim: top-tier studio, not "AI template")

Before writing a line, pick a cohesive aesthetic direction that is true to the
identity JSON (tone + industry). Commit to it. Possible directions include:
brutally minimal, editorial magazine, warm organic, art-deco geometric,
retro-futuristic, soft pastel, refined luxury, playful toy-like, raw brutalist,
industrial utilitarian. Mix and match where it serves the brand, but don't
defang it into "safe corporate".

- **Typography.** Pair a distinctive DISPLAY stack (e.g. Georgia / Palatino
  serif, or a condensed sans like "Helvetica Neue Condensed", or a rounded
  stack for warm brands) with a clean BODY stack. Use \`font-feature-settings\`
  for small-caps / ligatures where the tone allows. Never use Arial / Inter /
  "system-ui" alone as the hero font.
- **Color.** ONE dominant color, ONE accent, neutrals built around them. Avoid
  pure black and pure white — use warm-tinted near-neutrals (e.g. #FAF7F2 and
  #1A1714). Avoid purple-gradients-on-white unless it's truly right for the
  brand.
- **Layout.** Asymmetry, intentional overlap, grid-breaking moments. Generous
  negative space OR controlled density — commit to one. The hero should have
  one unforgettable visual idea (an oversized type lockup, a diagonal rule,
  a hand-drawn SVG frame, something).
- **Motion.** One orchestrated page-load reveal with staggered delays. Subtle
  hover states. \`ease-out\`, <500ms. No parallax, no carousels, no marquees
  unless the tone specifically calls for them.
- **Visual details.** Inline SVGs for logos, icons, decorative elements.
  Grain/noise textures via \`background-image\` with inline SVG data URIs are
  allowed. CSS-only illustrations preferred over any image request.

### Page content

- **index.html** — Hero (name, tagline, primary CTA), About snippet, Services
  or Offering grid, (Shop section if products present), Testimonial or Signal,
  Contact CTA.
- **about.html** — Long-form story, founder note, values, location (use \`city\`
  from identity if present).
- **contact.html** — Working form (POSTs to a configurable endpoint via
  \`data-form-action\`; falls back to \`mailto:hello@<domain>\` if unset),
  business hours placeholder, map-style address block (CSS only, no Google
  Maps embed).
${productsBlock}

### Output format

Emit each file as a fenced code block with a \`filepath:\` marker on the
opening fence line. Nothing outside these fences — no prose, no commentary,
no explanations.

\`\`\`filepath:index.html
<!DOCTYPE html>
...
\`\`\`

\`\`\`filepath:about.html
<!DOCTYPE html>
...
\`\`\`

\`\`\`filepath:contact.html
<!DOCTYPE html>
...
\`\`\`

\`\`\`filepath:assets/style.css
/* all site styles, both themes */
...
\`\`\`

\`\`\`filepath:assets/script.js
// theme toggle, cart, form enhancements
...
\`\`\`

Emit all five blocks, in that order, with no text between them.`;
}
