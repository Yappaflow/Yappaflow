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
 *   • Commit to ONE design direction (see `direction` option) so the bundle
 *     reads as a signature theme, not a hybrid template. Directions are
 *     grounded in real Awwwards SOTD references (Dialect, Telha Clarke,
 *     Lightweight, OCCUPY, Better Off\u00ae) and come from
 *     `src/ai/design-directions.ts`.
 */

import {
  renderDesignDirectionBlock,
  type DesignDirection,
} from "../design-directions";

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
  products?:  ShopifyProductForPrompt[];
  /**
   * The chosen design archetype for this build. Passed in by the generator
   * service after calling `pickDesignDirection(identity)`. The SAME direction
   * must flow into any patch calls on subsequent attempts so the patched
   * files speak the same visual language as the files we're keeping.
   */
  direction?: DesignDirection;
  /**
   * If the user went through the hero-chooser flow, the srcdoc HTML of the
   * variant they picked (post-refinement if they refined). The generator
   * uses this as a COMPOSITION + COPY reference — the Liquid theme's hero
   * must honour the same headline, subhead, CTA text, and overall layout
   * archetype (typographic / full-bleed / asymmetric). We pass the full
   * HTML rather than a structured spec because the model can read the
   * layout, extract the copy, and translate visual primitives (inline
   * SVG scene → Liquid + CSS classes) more accurately than a paraphrased
   * summary would allow.
   */
  lockedHero?: string;
}

/**
 * Render the "here's the hero the user picked — match it" block that
 * gets injected into the Shopify / Yappaflow prompts. The surrounding
 * fence keeps the HTML from being parsed as prompt text.
 */
function renderLockedHeroBlock(html: string | undefined): string {
  if (!html) return "";
  return `### Locked hero (USER-PICKED — match this composition + copy)

The user reviewed three hero variants before this build and picked the
one below. Your generated theme's hero + first-fold MUST match it on:

- **Copy.** Use the EXACT headline, subhead, and CTA text from the locked
  HTML. Do not paraphrase or "improve" it.
- **Composition archetype.** If the locked hero is typographic (no
  imagery), your hero is typographic. If it's full-bleed, yours fills the
  viewport with a single visual. If it's asymmetric, yours splits into
  two columns with the same ratio the locked hero used.
- **Typography treatment.** Headline scale, tracking, and case match the
  locked hero. If it uses uppercase, you use uppercase.
- **Below-the-fold section.** The locked hero's below-fold section (the
  second screen-full, whatever that is — about strip, feature row, index
  list) seeds your below-fold section. Same content archetype, translated
  to the platform's native primitives.

You may, and should, translate it from a standalone HTML document into
platform-native primitives (Liquid sections + your CSS class system, or
the Yappaflow UI components). The LOOK is the spec; the implementation
is yours.

\`\`\`html
${html}
\`\`\`

`;
}

export function getGenerateShopifyPrompt(opts: GenerateShopifyOptions = {}): string {
  const hasProducts = Array.isArray(opts.products) && opts.products.length > 0;
  const directionBlock = opts.direction
    ? renderDesignDirectionBlock(opts.direction)
    : "";
  const lockedHeroBlock = renderLockedHeroBlock(opts.lockedHero);

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
templates/404.liquid
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
7. **Snippet closure (CRITICAL).** Every \`{% render 'NAME' %}\` and
   \`{% include 'NAME' %}\` you write MUST correspond to a
   \`snippets/NAME.liquid\` file you ALSO emit in this same response.
   Shopify hard-fails at render time with "Could not find asset
   snippets/NAME.liquid" if the snippet is missing — and when that happens
   the entire page stops rendering at that point. Do NOT reference any of
   the classic Dawn/Debut snippets (\`social-meta-tags\`, \`icon-cart\`,
   \`icon-search\`, \`icon-account\`, \`price\`, \`loading-spinner\`, etc.)
   unless you are ALSO emitting \`snippets/social-meta-tags.liquid\`,
   \`snippets/icon-cart.liquid\`, etc. as standalone fenced blocks in your
   output. Prefer inline SVG + inline \`<meta>\` tags in \`layout/theme.liquid\`
   over extracting them into snippets. The ONLY snippets listed in the
   required layout above are \`snippets/product-card.liquid\` and
   \`snippets/theme-toggle.liquid\` — if you want any other snippet, you
   must add it as an extra fenced block AND stay within the overall output
   budget.
8. **Inline SVG sizing (CRITICAL).** Every inline \`<svg>\` element MUST
   declare BOTH \`width\` and \`height\` attributes (in px, rem, or em) —
   not just a \`viewBox\`. An SVG with only \`viewBox\` defaults to filling
   100% of its parent, so a header cart icon will stretch to the full
   viewport width. Icons should be sized \`width="20" height="20"\` or
   similar; logo marks \`width="120" height="32"\`. Do NOT rely on CSS to
   constrain icon size — set the HTML attributes so it Just Works even if
   a stylesheet fails to load.
9. **Class-naming consistency (CRITICAL).** Pick ONE BEM-style naming
   convention (\`block\`, \`block__element\`, \`block--modifier\`) and use
   it consistently across every Liquid file AND \`assets/theme.css\`. If a
   Liquid template writes \`<h1 class="hero__title">\`, then
   \`assets/theme.css\` MUST declare a \`.hero__title\` rule. Do NOT mix
   naming systems (\`.hero-title\` in Liquid and \`.hero__title\` in CSS)
   — that's the #1 reason generated stores render as unstyled walls of
   text. Before finishing \`assets/theme.css\`, re-read the class names
   you coined in your Liquid files and make sure every one of them has a
   matching CSS rule.

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
- \`templates/404.liquid\` — a DESIGNED 404 page that carries the theme's
  typography + palette + copy voice. Not Shopify's default search-box
  fallback — that's the failure state we're trying to avoid. Include a
  large display-type 404 mark (use the direction's display font, respect
  its tracking), a short on-brand sentence explaining the page wasn't
  found, a link back to the home page (\`{{ shop.url }}\` or \`/\`), and
  a link to the all-products collection (\`/collections/all\`). Match the
  direction's copy voice — Dialect Brutalist's 404 reads "\`[NOT FOUND]\`" in
  brackets with mono coordinate metadata; Editorial Minimal's 404 is a
  warm serif lockup with a single sentence. Target **at least ~500 bytes**.
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

${directionBlock}

${lockedHeroBlock}### Scroll & image animation primitives (MANDATORY — Liquid/CSS track)

The signature motion described in the DESIGN DIRECTION block above is the
standard. Implement it with the following primitives — no JS animation
libraries, no external CDNs:

1. **Entry choreography (page load).**
   In \`assets/theme.js\` add an \`IntersectionObserver\` that toggles a
   \`.is-revealed\` class on every element with \`data-reveal\`. In
   \`assets/theme.css\` define:

   \`\`\`css
   [data-reveal] {
     opacity: 0;
     transform: translate3d(0, 24px, 0);
     transition:
       opacity 900ms cubic-bezier(0.16, 1, 0.3, 1),
       transform 900ms cubic-bezier(0.16, 1, 0.3, 1);
     transition-delay: calc(var(--reveal-index, 0) * 80ms);
     will-change: opacity, transform;
   }
   [data-reveal].is-revealed {
     opacity: 1;
     transform: translate3d(0, 0, 0);
   }
   @media (prefers-reduced-motion: reduce) {
     [data-reveal] { opacity: 1 !important; transform: none !important; transition: none !important; }
   }
   \`\`\`

   Sprinkle \`data-reveal\` on hero headline lines, section titles, product
   cards. Use \`style="--reveal-index:N"\` (0, 1, 2, …) to stagger.

2. **Scroll-driven reveal for below-the-fold imagery.**
   Use the same \`IntersectionObserver\` (\`threshold: 0.2\`) to add
   \`.is-in-view\` to any element with \`data-scroll-reveal\`. For the
   image-treatment animation described in the direction above, express it
   as a CSS transition between \`data-scroll-reveal\` and
   \`.is-in-view\` states (clip-path sweep, scale, filter-saturate, etc.
   — pick whichever matches the direction).

3. **Product-card hover animations.**
   Match the direction's image-treatment spec EXACTLY. Default transitions
   are \`transform 500ms\` + \`filter 500ms\` with the expo-out easing above.
   Use \`transform: scale(1.03)\` + \`filter: saturate(0.6)\` for any
   "others desaturate, hovered pops" pattern. Drop shadows are banned.

4. **Smooth scroll.**
   Add \`html { scroll-behavior: smooth; }\` at the top of
   \`assets/theme.css\` and \`@supports (scroll-behavior: smooth) { ... }\`.
   Do NOT try to import Lenis — this is a Liquid theme, no Node runtime.

5. **No parallax on text.** Parallax is reserved for decorative background
   elements (grain layers, gradient drifts) only. Headlines and body copy
   never move relative to scroll.

6. **60fps floor.** Only animate \`transform\` and \`opacity\` (plus
   \`filter\` and \`clip-path\` when explicitly specified above). Never
   animate \`width\`, \`height\`, \`top\`, \`left\`, or \`margin\`.

7. **prefers-reduced-motion.** Every animation + transition must fall back
   to no-op when the user opts out. Use the \`@media (prefers-reduced-motion)\`
   guard shown in primitive #1.

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

### Pre-send self-check (REQUIRED)

Before you stop, mentally re-read your output and verify:

- □  Every \`{% render '...' %}\` and \`{% include '...' %}\` you wrote
     refers to a \`snippets/NAME.liquid\` you ALSO emitted. If not, either
     add the snippet file as an extra fenced block, or rewrite the caller
     to inline the content.
- □  Every \`<svg>\` in your output has BOTH \`width\` and \`height\`
     attributes — no bare \`viewBox\`-only SVGs.
- □  Every class name used in a Liquid template has a matching rule in
     \`assets/theme.css\` (same BEM convention).
- □  \`templates/index.json\` has a non-empty \`sections\` object AND a
     matching \`order\` array.
- □  \`layout/theme.liquid\` contains BOTH
     \`{{ content_for_header }}\` and \`{{ content_for_layout }}\`.

An automated validator re-runs these checks on your output; if any fail
your bundle gets rejected and you'll be asked to regenerate everything.

Begin.`;
}

// ─────────────────────────────────────────────────────────────────────────
// Patch prompt — regenerate just the files the validator flagged
// ─────────────────────────────────────────────────────────────────────────

export interface PatchShopifyIssue {
  filePath: string;
  kind:     "liquid-parse" | "json-parse" | "content-empty" | "missing-required" | "missing-token" | "missing-snippet";
  message:  string;
}

export interface PatchShopifyOptions {
  issues:    PatchShopifyIssue[];
  /**
   * Paths of files that already exist in the previous attempt and must NOT
   * be re-emitted — they're working fine. We tell the model this so it
   * doesn't accidentally "help" by rewriting files we didn't ask for.
   */
  keepPaths: string[];
  products?: ShopifyProductForPrompt[];
  /**
   * The SAME design direction used on the full-regen attempt. Critical:
   * without this, a patched \`sections/header.liquid\` can drift into
   * Editorial Minimal while the rest of the bundle is Dialect Brutalist,
   * and the whole theme reads as a hybrid template. We re-inject the
   * direction's palette + type + copy voice as non-negotiable anchors.
   */
  direction?: DesignDirection;
  /**
   * Same locked-hero HTML as the original generation — the patch should
   * still honour the user's picked hero composition + copy.
   */
  lockedHero?: string;
}

/**
 * Build the system prompt for a *targeted* regeneration of ONLY the files
 * the validator flagged. Much shorter than the full-bundle prompt because
 * the expensive parts (whole directory layout, section architecture
 * lecture, content-depth floors for every section, design direction) are
 * already baked into the files we're keeping. All we need here is:
 *
 *   • The constraints that keep patched files compatible with the rest of
 *     the bundle (BEM naming, SVG sizing, snippet closure, Liquid syntax).
 *   • A concrete list of (filePath, kind, message) tuples — the model
 *     does its best work when told exactly what to fix.
 *   • An explicit ban on re-emitting the "keep" files.
 *
 * Cost: typical patch is 2–5 files × ~1 KB each = comfortably under 4 k
 * tokens, vs. ~30 k for a full regeneration.
 */
export function getPatchShopifyPrompt(opts: PatchShopifyOptions): string {
  const hasProducts = Array.isArray(opts.products) && opts.products.length > 0;
  const directionBlock = opts.direction
    ? renderDesignDirectionBlock(opts.direction)
    : "";
  const lockedHeroBlock = renderLockedHeroBlock(opts.lockedHero);

  const issueLines = opts.issues
    .map((i) => `- \`${i.filePath}\` [${i.kind}]: ${i.message}`)
    .join("\n");

  const toEmit = Array.from(new Set(opts.issues.map((i) => i.filePath)));
  const toEmitLines = toEmit.map((p) => `- \`${p}\``).join("\n");

  // We pass a truncated list of kept paths to anchor the "don't touch these"
  // rule. If the model tries to re-emit one, the merge step below will
  // overwrite what was working — worth an explicit warning.
  const keepLines = opts.keepPaths.map((p) => `- \`${p}\``).join("\n");

  return `## Task: Patch a Shopify theme (regenerate ONLY these files)

You previously generated a full Shopify theme bundle. An automated validator
ran and found problems in a small subset of files. Your job now is to
regenerate ONLY those files — keep the rest of the bundle as-is.

### Files to regenerate

Emit each of the following as a separate fenced \`filepath:\` block,
completely rewritten (not a partial diff). Nothing else.

${toEmitLines}

### What was wrong with each file

${issueLines}

### DO NOT re-emit these — they are already correct

${keepLines}

${directionBlock ? directionBlock + "\n\nThe palette, type pair, copy voice, and signature micro-detail above\nMUST match the rest of the bundle. If the flagged files currently use a\ndifferent palette or typography than what's described above, that's a bug\n— re-emit them aligned with this direction.\n\n" : ""}${lockedHeroBlock}### Constraints (same as the original generation)

1. **Liquid syntax must parse.** No unbalanced \`{% if %}/{% endif %}\`,
   no mis-closed \`{% for %}\` loops, no malformed \`{{ }}\` expressions.
2. **JSON files must parse** (\`templates/*.json\`,
   \`config/settings_*.json\`, \`locales/*.json\`). \`templates/*.json\`
   must declare at least one section AND an \`order\` array.
3. **Snippet closure.** Every \`{% render 'NAME' %}\` / \`{% include 'NAME' %}\`
   MUST refer to a \`snippets/NAME.liquid\` that either (a) exists in the
   "DO NOT re-emit" list above or (b) you ALSO emit as part of this patch.
   Do NOT introduce new references to snippets that don't exist in either
   set. This was the validator's top complaint — don't make it worse by
   patching in more dangling references.
4. **Inline SVG sizing.** Every \`<svg>\` in your patch MUST have both
   \`width\` and \`height\` attributes (in px / rem / em). No bare
   \`viewBox\`-only SVGs — they expand to fill their parent.
5. **Class-naming consistency.** The existing \`assets/theme.css\` (which
   you are NOT re-emitting) uses BEM naming (\`block\`, \`block__element\`,
   \`block--modifier\`). Your patched Liquid files MUST use the same
   convention. Don't invent new class names that won't have matching CSS.
6. **No external CDNs, no external fonts.** All styling still lives in the
   existing \`assets/theme.css\`.
7. **\`{% schema %}\` blocks.** Every \`sections/*.liquid\` must end with a
   valid \`{% schema %}\` block (JSON) declaring settings.
8. **Mandatory tokens.** If you are regenerating \`layout/theme.liquid\`,
   it MUST contain BOTH \`{{ content_for_header }}\` (in \`<head>\`) AND
   \`{{ content_for_layout }}\` (in \`<body>\`).

### Content depth

Don't ship stubs. Each regenerated file must have real, production-grade
content — same floors as the original generation: \`layout/theme.liquid\`
at least 500 meaningful bytes, \`sections/header.liquid\` and
\`sections/footer.liquid\` at least 300, any other \`sections/*.liquid\`
at least 200. Comments and whitespace don't count.

${hasProducts
  ? `### Product catalog reference (unchanged since the first pass)

\`\`\`json
${JSON.stringify(opts.products, null, 2)}
\`\`\``
  : ""}

### Output format

Emit ONLY the files listed under "Files to regenerate". Each as a fenced
block with a \`filepath:\` marker, e.g.:

\`\`\`filepath:snippets/social-meta-tags.liquid
<meta property="og:title" content="{{ page_title | escape }}">
...
\`\`\`

No prose outside the fences. No commentary. No re-emission of files in
the "DO NOT re-emit" list. Begin.`;
}
