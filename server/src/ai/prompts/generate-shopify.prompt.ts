/**
 * System prompt for the Shopify one-click-import bundle generator.
 *
 * The output of this prompt is the *theme* portion of the bundle (Liquid +
 * CSS + JS + a couple of JSON files). The product catalog is generated
 * separately as `products.csv` by `shopify-generator.service.ts` so that the
 * AI doesn't need to be perfectly correct about Shopify's CSV schema.
 *
 * Hard constraints baked into the prompt:
 *   • Output a complete, uploadable Shopify theme directory structure.
 *   • Default LIGHT, with a working DARK toggle (same rule as custom sites).
 *   • Top-designer aesthetic — not a default Dawn fork.
 */

export interface ShopifyProductForPrompt {
  handle:     string;
  name:       string;
  price:      number;
  currency?:  string;
  description?: string;
  variantKind?: string;
  variants?:  Array<{ label: string; price?: number }>;
}

export interface GenerateShopifyOptions {
  products?: ShopifyProductForPrompt[];
}

export function getGenerateShopifyPrompt(opts: GenerateShopifyOptions = {}): string {
  const hasProducts = Array.isArray(opts.products) && opts.products.length > 0;

  return `## Task: Generate Shopify Theme Bundle (one-click import)

You are generating a complete, uploadable Shopify theme that the agency will
ZIP and drop into the Shopify Admin via "Online Store → Themes → Upload zip
file". The theme must boot on a brand-new Shopify store with the default
sales-channel set to Online Store.

A separate \`products.csv\` will be generated outside of this prompt and
imported through "Products → Import" — you do NOT need to emit it.

### Required directory layout (each file is a separate fenced block)

\`\`\`
layout/theme.liquid
templates/index.json
templates/product.json
templates/page.about.liquid
templates/page.contact.liquid
templates/cart.liquid
sections/header.liquid
sections/footer.liquid
sections/hero.liquid
sections/featured-products.liquid
sections/main-product.liquid
snippets/product-card.liquid
snippets/theme-toggle.liquid
config/settings_schema.json
config/settings_data.json
assets/theme.css
assets/theme.js
locales/en.default.json
\`\`\`

### Hard requirements

1. **Valid Shopify theme.** All Liquid tags must be syntactically correct.
   Use \`{{ asset_url }}\`, \`{{ shop.url }}\`, \`{{ product.title }}\`,
   \`{{ product.featured_image | img_url: 'medium' }}\`, etc. No PHP, no Twig.
2. **No external CDNs and no external fonts.** All styling lives in
   \`assets/theme.css\`. All JavaScript lives in \`assets/theme.js\` and is
   referenced via \`{{ 'theme.js' | asset_url | script_tag }}\`.
3. **Sections architecture.** \`templates/index.json\` MUST declare a
   non-empty \`sections\` object referencing the hero and featured-products
   sections by name with sensible default settings, plus an \`order\` array
   listing them. An empty \`sections: {}\` renders a blank store —
   unacceptable. Every \`templates/*.json\` file must declare at least one
   real section.
4. **Cart.** \`templates/cart.liquid\` is a real cart page that POSTs to
   \`/cart\` and shows line items. \`assets/theme.js\` adds an Ajax
   "Add to cart" handler that calls \`/cart/add.js\` and updates a header
   cart badge from \`/cart.js\`.
5. **Locales.** \`locales/en.default.json\` must include the keys you reference
   via \`{{ 'general.cart' | t }}\` etc.
6. **Mandatory layout tokens.** \`layout/theme.liquid\` MUST include BOTH
   \`{{ content_for_header }}\` (inside \`<head>\`, before other tags) AND
   \`{{ content_for_layout }}\` (inside \`<body>\`). Without these, Shopify
   renders a blank page even if every other file is perfect.

### Content depth (MANDATORY — no placeholder stubs)

Near-empty files that merely *resemble* the right shape are rejected by our
pre-upload validator and will NOT ship. Every file must contain real,
production-grade content:

- \`layout/theme.liquid\` — a full HTML document: \`<!doctype html>\`, a
  populated \`<head>\` (charset, viewport, SEO meta, title, stylesheet link,
  \`{{ content_for_header }}\`, the theme-pre-paint inline script), and a
  \`<body>\` that renders \`{% section 'header' %}\`, the
  \`{{ content_for_layout }}\` output, and \`{% section 'footer' %}\`.
  Target **well over 1 KB** — a Dawn-equivalent theme.liquid is ~2 KB+.
- \`sections/header.liquid\` and \`sections/footer.liquid\` — real navigation,
  logo, cart icon, newsletter/socials, with a \`{% schema %}\` block. Target
  **at least ~500 bytes** of substantive markup each. A 57-byte header is a
  stub, not a header.
- Every other \`sections/*.liquid\` — complete markup for that section's
  role (hero with headline/subhead/CTA; featured-products iterating
  \`collections.all.products\` with \`{% render 'product-card' %}\`;
  main-product with image gallery + variant picker + add-to-cart form),
  plus a \`{% schema %}\` block defining settings. Target **at least
  ~400 bytes** each.
- \`snippets/*.liquid\` — real reusable partials with branching logic for
  the states that can occur (e.g. product-card must handle no-image,
  on-sale, sold-out).
- \`assets/theme.css\` — a full stylesheet with light + dark palettes,
  typography scale, layout primitives, section-specific rules. Target
  **at least 2 KB**.
- \`assets/theme.js\` — theme-toggle bootstrap, Ajax add-to-cart, header
  cart-badge update, variant-picker wiring. Target **at least 1.5 KB**.
- \`config/settings_schema.json\` — a real schema with at least the
  \`theme_info\` block and several settings groups (colors, typography,
  layout). Not \`[]\`.
- \`locales/en.default.json\` — all keys the Liquid files reference,
  organized into logical groups (\`general\`, \`products\`, \`cart\`,
  \`customer\`, \`accessibility\`).

If a file genuinely has nothing to say, it's because you picked the wrong
architecture — add content, don't ship a stub.

### Dual theme (MANDATORY)

Same rule as our custom sites: light by default, dark toggle that:
- Reads \`localStorage.yappaflow_theme\` then \`prefers-color-scheme\` then light.
- Sets \`document.documentElement.dataset.theme\` BEFORE first paint via an
  inline script in \`layout/theme.liquid\` \`<head>\` (above the stylesheet).
- Renders a button via \`{% render 'theme-toggle' %}\` inside the header.
- Both palettes pass WCAG AA. Dark palette derived from the brand accent.

### Design guidance

This should feel like a top-tier Shopify theme — NOT a Dawn clone.

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

Products will be imported via the accompanying CSV. Build
\`sections/featured-products.liquid\` to iterate \`collections.all.products\`
(or a configured collection) and render product cards via
\`{% render 'product-card', product: product %}\`. \`product-card.liquid\`
shows the first image, name, price, and a quick "Add to cart" that targets
the first available variant. Variant pickers (sizes / colors) live on the
full product page (\`sections/main-product.liquid\` → \`templates/product.json\`).
The picker uses a segmented pill control bound to Shopify's variant API
(\`variant.id\` updates the \`#product-form\` hidden input).`
  : `### Products

No catalog provided. Still generate \`featured-products.liquid\` and
\`product-card.liquid\` so the theme works once the merchant adds products
via the Shopify Admin — just make the section gracefully render an empty
state when there are no products.`}

### Output format

Emit each file as a fenced code block with a \`filepath:\` marker on the
opening fence line, in the order listed under "Required directory layout".
Nothing outside these fences — no prose, no commentary.

Example fence:

\`\`\`filepath:layout/theme.liquid
<!doctype html>
...
\`\`\`

Begin.`;
}
