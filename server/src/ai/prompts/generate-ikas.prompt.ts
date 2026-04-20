/**
 * System prompt for the ikas storefront theme generator.
 *
 * ikas themes are Liquid-like — they use Handlebars-flavored template tags
 * (`{{product.name}}`, `{{#each product.variants}}…{{/each}}`) on top of
 * HTML/CSS/JS. Our output must be a complete, uploadable theme directory
 * that the pusher drops into a new draft theme version via the Admin API.
 *
 * A separate `products.json` catalog is generated outside this prompt by
 * `ikas-generator.service.ts` so the model doesn't need to be perfectly
 * correct about the Admin API product schema.
 *
 * Hard constraints (same as every Yappaflow output):
 *   • Light default, dark toggle, WCAG AA, prefers-color-scheme + localStorage.
 *   • No external CDNs and no external fonts — system stacks only.
 *   • Top-designer aesthetic — not a default ikas starter clone.
 */

export interface IkasProductForPrompt {
  slug:        string;
  name:        string;
  price:       number;
  currency?:   string;
  description?: string;
  variantKind?: string;
  variants?:   Array<{ label: string; price?: number }>;
}

export interface GenerateIkasOptions {
  products?: IkasProductForPrompt[];
}

export function getGenerateIkasPrompt(opts: GenerateIkasOptions = {}): string {
  const hasProducts = Array.isArray(opts.products) && opts.products.length > 0;

  return `## Task: Generate ikas Storefront Theme Bundle

You are generating a complete, uploadable ikas theme that the agency will
push via the ikas Admin API (Create Theme Version → Upload Theme Asset per
file). The theme must boot on a brand-new ikas store with the default
storefront settings.

A separate \`products.json\` catalog is generated outside of this prompt
and pushed via the Admin API — you do NOT need to emit it.

### Required directory layout (each file is a separate fenced block)

\`\`\`
theme.json
layout/theme.html
templates/home.html
templates/product.html
templates/collection.html
templates/page.about.html
templates/page.contact.html
templates/cart.html
partials/header.html
partials/footer.html
partials/hero.html
partials/product-card.html
partials/theme-toggle.html
assets/theme.css
assets/theme.js
locales/en.json
locales/tr.json
\`\`\`

### Hard requirements

1. **Valid ikas theme.** Use ikas's Handlebars-flavored template syntax:
   \`{{store.name}}\`, \`{{product.name}}\`, \`{{product.price}}\`,
   \`{{#each product.variants}}…{{/each}}\`, \`{% section 'hero' %}\`-style
   partials imported via \`{{> partials/header}}\`. No PHP, no Liquid.
2. **\`theme.json\`** declares the theme name, version, and settings schema
   (one section per high-level theme option — colors, typography, nav links).
3. **No external CDNs and no external fonts.** All styling lives in
   \`assets/theme.css\`. All JavaScript lives in \`assets/theme.js\` and is
   referenced via \`<script src="/theme/assets/theme.js"></script>\`.
4. **Cart.** \`templates/cart.html\` is a real cart page. \`assets/theme.js\`
   adds an Ajax "Add to cart" handler that calls ikas's Storefront API
   (\`POST /api/storefront/cart/add\`) and updates a header cart badge.
5. **Locales.** Ship both \`en.json\` AND \`tr.json\` — ikas is a Turkish
   platform; Turkish is table-stakes for every storefront we generate.
   Every string referenced via \`{{t 'some.key'}}\` must be defined in both.

### Dual theme (MANDATORY)

Same rule as every other Yappaflow output: light by default, dark toggle that:
- Reads \`localStorage.yappaflow_theme\` then \`prefers-color-scheme\` then light.
- Sets \`document.documentElement.dataset.theme\` BEFORE first paint via an
  inline script in \`layout/theme.html\` \`<head>\` (above the stylesheet).
- Renders a button via \`{{> partials/theme-toggle}}\` inside the header.
- Both palettes pass WCAG AA. Dark palette derived from the brand accent.

### Design guidance

The output should feel like a top-tier ikas theme — NOT the default
"Classic" starter.

- Pick a cohesive aesthetic direction tied to the identity tone
  (editorial / luxury / playful / brutalist / etc.) and commit to it.
- Distinctive typography pairing via system fallbacks
  (e.g. \`Georgia, "Times New Roman", serif\` for display).
- ONE dominant color, ONE accent. Avoid pure black/white.
- Hero with one strong visual idea (oversized lockup, diagonal rule, etc.).
- Subtle motion only. \`prefers-reduced-motion\` respected.
- Inline SVGs for logo/icons. CSS-only decorative details preferred.

${hasProducts
  ? `### Products

Products will be pushed to ikas via the Admin API (separate service).
Build \`templates/collection.html\` and \`partials/product-card.html\` so
the storefront renders iterate over \`{{#each products}}\` to show cards.
The card shows the first image, name, price, and a quick "Add to cart" CTA
that targets the first available variant. Variant pickers (size, color) live
on the full product page (\`templates/product.html\`) and use a segmented
pill control bound to ikas's Storefront cart API
(\`POST /api/storefront/cart/add\` with \`variantId\`).`
  : `### Products

No catalog provided. Still generate \`collection.html\` and \`product-card.html\`
so the theme works once the merchant adds products via the ikas Admin — make
the section gracefully render an empty state when there are no products.`}

### Output format

Emit each file as a fenced code block with a \`filepath:\` marker on the
opening fence line, in the order listed under "Required directory layout".
Nothing outside these fences — no prose, no commentary.

Example fence:

\`\`\`filepath:layout/theme.html
<!doctype html>
...
\`\`\`

Begin.`;
}
