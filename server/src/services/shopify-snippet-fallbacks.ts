/**
 * Dawn-style snippet fallbacks for the Shopify generator.
 *
 * ── Why this file exists ─────────────────────────────────────────────
 * The model was trained on thousands of Shopify Dawn themes and keeps
 * emitting `{% render 'icon-cart' %}`, `{% render 'icon-search' %}`,
 * `{% render 'price' %}`, `{% render 'social-meta-tags' %}` etc. in
 * `sections/header.liquid` without also emitting the corresponding
 * `snippets/*.liquid` files.
 *
 * The retry loop catches the dangling reference (good), but the retried
 * model output stubbornly keeps forgetting the SAME snippet (bad). Seen
 * in prod 2026-04-21: three full attempts exhausted on a single missing
 * `snippets/icon-cart.liquid`.
 *
 * Prompt tightening failed to close the loop. Deterministic synthesis
 * closes it permanently: we generate the snippet ourselves, in a style
 * compatible with how the model is using it (Dawn-flavoured), so every
 * retry gets a clean validation pass and a visible icon renders on the
 * merchant's storefront.
 *
 * ── How it's used ────────────────────────────────────────────────────
 *   1. `shopify-generator.service.ts` calls `synthesizeMissingSnippets`
 *      on every attempt's parsed file list BEFORE `validateShopifyBundle`.
 *   2. We scan every `.liquid` file for `{% render 'X' %}` /
 *      `{% include 'X' %}` references, check whether
 *      `snippets/X.liquid` is in the bundle, and if not, either:
 *        (a) emit a KNOWN-good Dawn-compatible fallback from the
 *            `SNIPPET_FALLBACKS` table below, OR
 *        (b) emit a soft "missing snippet" placeholder for names we
 *            don't recognise, so the validator still passes and the
 *            storefront still renders (with a comment-only snippet in
 *            place of whatever the model forgot).
 *   3. Returns the number of snippets synthesized so the generator can
 *      log what it did.
 *
 * The fallbacks are intentionally visual-neutral stroke-only SVGs
 * (currentColor everywhere, 1.5px stroke, 24x24 viewBox) so they look
 * acceptable against any of the six design directions defined in
 * `design-directions.ts` without us having to pick a direction-aware
 * variant.
 *
 * NOTE: all template-literal bodies in this file use plain quotes when
 * referring to code artifacts (e.g. `price.liquid` in a comment). We
 * intentionally avoid inner backticks — they'd close the template
 * literal early and TypeScript would explode with "expression expected"
 * errors in a file full of SVG.
 */

import type { ParsedFile } from "./liquid-validator.service";

/**
 * Regex mirror of the one in liquid-validator.service.ts. Duplicating
 * it here (rather than exporting) keeps the validator's surface small
 * and this file self-contained — they must evolve together, but both
 * files have a comment pointing at the other.
 *
 * Captures:
 *   group 1: render | include
 *   group 2: snippet name (without extension)
 */
const SNIPPET_REF_RE =
  /\{%-?\s*(render|include)\s+['"]([^'"]+)['"][^%]*%\}/g;

/** Extract literal snippet names referenced from any Liquid source. */
function findSnippetRefs(content: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  SNIPPET_REF_RE.lastIndex = 0;
  while ((m = SNIPPET_REF_RE.exec(content)) !== null) {
    const name = m[2].trim();
    if (name && !name.includes(".") && !name.includes(" ")) {
      out.push(name);
    }
  }
  return out;
}

/**
 * Every fallback is a stand-alone Liquid snippet. Rules:
 *   • No Liquid syntax errors (they must parse under @shopify/liquid-html-parser).
 *   • No dependency on variables not passed by Dawn's caller conventions
 *     — e.g. "price" reads "price" from the calling context with a
 *     liquid assign guard, so it works whether the caller passed one
 *     or not.
 *   • Stroke-only SVGs with currentColor, 24x24 viewBox. Lets the host
 *     stylesheet colour the icon via "color" instead of needing a
 *     direction-specific fill.
 *   • ~300+ bytes each — we don't want them tripping the content-depth
 *     floor if the validator ever adds a snippet minimum (it doesn't
 *     today, but this is a cheap hedge).
 */
const SNIPPET_FALLBACKS: Record<string, string> = {
  // ── Icon snippets (classic Dawn naming) ───────────────────────────
  "icon-cart": `{%- comment -%}
  Stand-alone cart icon — mirrors Dawn's icon-cart.liquid signature.
  Uses currentColor so the section's CSS controls the stroke color.
{%- endcomment -%}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-cart">
  <path d="M4 6h2l2.2 11.02a2 2 0 0 0 2 1.6h7.5a2 2 0 0 0 2-1.54l1.4-7.08H6.5"/>
  <circle cx="10" cy="21" r="1.2"/>
  <circle cx="18" cy="21" r="1.2"/>
</svg>
`,
  "icon-cart-empty": `{%- comment -%} Dawn-style empty-cart variant — same glyph, different class hook for CSS. {%- endcomment -%}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-cart icon-cart-empty">
  <path d="M4 6h2l2.2 11.02a2 2 0 0 0 2 1.6h7.5a2 2 0 0 0 2-1.54l1.4-7.08H6.5"/>
  <circle cx="10" cy="21" r="1.2"/>
  <circle cx="18" cy="21" r="1.2"/>
</svg>
`,
  "icon-search": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-search">
  <circle cx="10.5" cy="10.5" r="6.5"/>
  <path d="m20 20-4.8-4.8"/>
</svg>
`,
  "icon-account": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-account">
  <circle cx="12" cy="8.5" r="3.5"/>
  <path d="M4.5 20.5c1.2-4 4-6 7.5-6s6.3 2 7.5 6"/>
</svg>
`,
  "icon-user": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-user">
  <circle cx="12" cy="8.5" r="3.5"/>
  <path d="M4.5 20.5c1.2-4 4-6 7.5-6s6.3 2 7.5 6"/>
</svg>
`,
  "icon-hamburger": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true" focusable="false" class="icon icon-hamburger">
  <path d="M4 7h16"/>
  <path d="M4 12h16"/>
  <path d="M4 17h16"/>
</svg>
`,
  "icon-menu": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true" focusable="false" class="icon icon-menu">
  <path d="M4 7h16"/>
  <path d="M4 12h16"/>
  <path d="M4 17h16"/>
</svg>
`,
  "icon-close": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true" focusable="false" class="icon icon-close">
  <path d="m6 6 12 12"/>
  <path d="m18 6-12 12"/>
</svg>
`,
  "icon-plus": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true" focusable="false" class="icon icon-plus">
  <path d="M12 5v14"/>
  <path d="M5 12h14"/>
</svg>
`,
  "icon-minus": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true" focusable="false" class="icon icon-minus">
  <path d="M5 12h14"/>
</svg>
`,
  "icon-chevron-down": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-chevron-down">
  <path d="m6 9 6 6 6-6"/>
</svg>
`,
  "icon-chevron-up": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-chevron-up">
  <path d="m6 15 6-6 6 6"/>
</svg>
`,
  "icon-chevron-right": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-chevron-right">
  <path d="m9 6 6 6-6 6"/>
</svg>
`,
  "icon-chevron-left": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-chevron-left">
  <path d="m15 6-6 6 6 6"/>
</svg>
`,
  "icon-caret": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 6" fill="currentColor" aria-hidden="true" focusable="false" class="icon icon-caret">
  <path d="M1 1 5 5l4-4"/>
</svg>
`,
  "icon-arrow": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-arrow">
  <path d="M5 12h14"/>
  <path d="m13 6 6 6-6 6"/>
</svg>
`,
  "icon-arrow-right": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-arrow-right">
  <path d="M5 12h14"/>
  <path d="m13 6 6 6-6 6"/>
</svg>
`,
  "icon-arrow-left": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-arrow-left">
  <path d="M19 12H5"/>
  <path d="m11 6-6 6 6 6"/>
</svg>
`,
  "icon-check": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-check">
  <path d="m5 12 5 5 9-11"/>
</svg>
`,
  "icon-info": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-info">
  <circle cx="12" cy="12" r="9"/>
  <path d="M12 11v5"/>
  <circle cx="12" cy="8" r=".6" fill="currentColor"/>
</svg>
`,
  "icon-error": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-error">
  <circle cx="12" cy="12" r="9"/>
  <path d="m9 9 6 6"/>
  <path d="m15 9-6 6"/>
</svg>
`,
  "icon-success": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-success">
  <circle cx="12" cy="12" r="9"/>
  <path d="m8 12 3 3 5-6"/>
</svg>
`,
  "icon-heart": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-heart">
  <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>
</svg>
`,
  "icon-filter": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-filter">
  <path d="M4 6h16"/>
  <path d="M7 12h10"/>
  <path d="M10 18h4"/>
</svg>
`,
  "icon-play": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-play">
  <path d="m8 5 12 7-12 7z"/>
</svg>
`,
  "icon-pause": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-pause">
  <path d="M8 5v14"/>
  <path d="M16 5v14"/>
</svg>
`,
  "icon-mute": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-mute">
  <path d="M4 10v4h3l5 4V6l-5 4z"/>
  <path d="m22 10-6 4"/>
  <path d="m16 10 6 4"/>
</svg>
`,
  "icon-unmute": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-unmute">
  <path d="M4 10v4h3l5 4V6l-5 4z"/>
  <path d="M16 8a6 6 0 0 1 0 8"/>
  <path d="M18.5 5.5a10 10 0 0 1 0 13"/>
</svg>
`,
  "icon-share": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-share">
  <circle cx="6" cy="12" r="2.5"/>
  <circle cx="18" cy="6" r="2.5"/>
  <circle cx="18" cy="18" r="2.5"/>
  <path d="m8.2 11 7.6-3.5"/>
  <path d="m8.2 13 7.6 3.5"/>
</svg>
`,
  "icon-clipboard": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-clipboard">
  <rect x="6" y="5" width="12" height="16" rx="2"/>
  <rect x="9" y="3" width="6" height="4" rx="1"/>
</svg>
`,
  "icon-link": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-link">
  <path d="M10 14a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1 1"/>
  <path d="M14 10a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1-1"/>
</svg>
`,
  "icon-star": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-star">
  <path d="m12 3 2.9 6 6.6.9-4.8 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5-4.8-4.6 6.6-.9z"/>
</svg>
`,

  // ── Social icons ──────────────────────────────────────────────────
  "icon-instagram": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon icon-instagram">
  <rect x="4" y="4" width="16" height="16" rx="4"/>
  <circle cx="12" cy="12" r="3.5"/>
  <circle cx="17" cy="7" r=".9" fill="currentColor"/>
</svg>
`,
  "icon-facebook": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" class="icon icon-facebook">
  <path d="M13.5 22v-8h2.7l.4-3.2H13.5V8.7c0-.9.3-1.5 1.6-1.5h1.7V4.4a21 21 0 0 0-2.5-.1c-2.5 0-4.2 1.5-4.2 4.3v2.2H7.4V14h2.7v8z"/>
</svg>
`,
  "icon-twitter": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" class="icon icon-twitter">
  <path d="M18.8 6.4 14.3 11l5.2 7h-4.1l-3.2-4.2L8.3 18H5.8l5-5.3L5.4 6h4.2l2.9 3.8L16.4 6z"/>
</svg>
`,
  "icon-tiktok": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" class="icon icon-tiktok">
  <path d="M16 3v3.5a4.5 4.5 0 0 0 4 4.4v3.4a7.9 7.9 0 0 1-4-1v5.1a5.6 5.6 0 1 1-5.6-5.6l.6 0v3.5a2.1 2.1 0 1 0 1.5 2V3z"/>
</svg>
`,
  "icon-youtube": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" class="icon icon-youtube">
  <path d="M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 32 32 0 0 0 1.6 12 32 32 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c2 .5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1 32 32 0 0 0 .4-3.8 32 32 0 0 0-.4-3.8zM10 15V9l5 3z"/>
</svg>
`,
  "icon-pinterest": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" class="icon icon-pinterest">
  <path d="M12 3a9 9 0 0 0-3.3 17.4c-.1-.7-.2-1.8 0-2.6l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.7 1.3 1.5 0 .9-.6 2.2-.9 3.4-.2 1 .5 1.9 1.5 1.9 1.8 0 3.2-1.9 3.2-4.6 0-2.4-1.7-4.1-4.2-4.1-2.8 0-4.5 2.1-4.5 4.3 0 .9.3 1.8.8 2.3.1.1.1.2.1.3l-.3 1.2c0 .2-.2.2-.4.1-1.3-.6-2.1-2.5-2.1-4 0-3.2 2.4-6.2 6.9-6.2 3.6 0 6.4 2.6 6.4 6 0 3.6-2.2 6.4-5.4 6.4-1 0-2-.5-2.4-1.2l-.6 2.4c-.2.8-.8 1.9-1.2 2.6A9 9 0 1 0 12 3z"/>
</svg>
`,

  // ── Functional snippets ───────────────────────────────────────────
  "price": `{%- comment -%}
  Money-formatting snippet compatible with Dawn's price.liquid.
  Accepts "price" (money value) or falls back to product.price.
{%- endcomment -%}
{%- liquid
  if price == null and product != null
    assign price = product.price
  endif
-%}
<span class="price">
  {%- if price == null -%}
    <span class="price-item price-item--regular">—</span>
  {%- else -%}
    <span class="price-item price-item--regular">{{ price | money }}</span>
  {%- endif -%}
</span>
`,
  "loading-spinner": `{%- comment -%}
  Minimal loading spinner — mirrors Dawn's loading-spinner.liquid
  so sections calling render 'loading-spinner' still render.
{%- endcomment -%}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false" class="spinner">
  <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="40 60" stroke-linecap="round">
    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
  </circle>
</svg>
`,
  "social-meta-tags": `{%- comment -%}
  Stand-alone OpenGraph / Twitter meta tag block. Pulls from page_title,
  page_description and canonical_url — all Shopify globals — so it
  works inside the layout head without any caller args.
{%- endcomment -%}
<meta property="og:site_name" content="{{ shop.name | escape }}">
<meta property="og:url" content="{{ canonical_url }}">
<meta property="og:title" content="{{ page_title | escape }}">
<meta property="og:type" content="{% if request.page_type == 'product' %}product{% else %}website{% endif %}">
<meta property="og:description" content="{{ page_description | default: shop.description | default: shop.name | escape }}">
{%- if request.page_type == 'product' and product -%}
  {%- if product.featured_media -%}
    <meta property="og:image" content="http:{{ product.featured_media | image_url: width: 1200 }}">
    <meta property="og:image:secure_url" content="https:{{ product.featured_media | image_url: width: 1200 }}">
  {%- endif -%}
{%- elsif settings.share_image -%}
  <meta property="og:image" content="http:{{ settings.share_image | image_url: width: 1200 }}">
  <meta property="og:image:secure_url" content="https:{{ settings.share_image | image_url: width: 1200 }}">
{%- endif -%}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{{ page_title | escape }}">
<meta name="twitter:description" content="{{ page_description | default: shop.description | default: shop.name | escape }}">
`,
  "meta-tags": `{%- comment -%}
  Dawn-compatible meta-tags.liquid — title, description, canonical.
{%- endcomment -%}
<title>{{ page_title }}{% if current_tags %} &ndash; {{ 'general.meta.tags' | t: tags: current_tags | join: ', ' }}{% endif %}{% if current_page != 1 %} &ndash; {{ 'general.meta.page' | t: page: current_page }}{% endif %}{% unless page_title contains shop.name %} &ndash; {{ shop.name }}{% endunless %}</title>
{%- if page_description -%}
  <meta name="description" content="{{ page_description | escape }}">
{%- endif -%}
<link rel="canonical" href="{{ canonical_url }}">
{% render 'social-meta-tags' %}
`,
  "share": `{%- comment -%}
  Native-share button with a clipboard fallback. Works on any page.
{%- endcomment -%}
<details class="share-button" data-share-button>
  <summary class="share-button__button" aria-label="Share">
    {% render 'icon-share' %}
    <span>Share</span>
  </summary>
  <div class="share-button__fallback">
    <button type="button" class="share-button__copy" data-share-copy data-url="{{ canonical_url | default: request.url }}">
      {% render 'icon-clipboard' %} Copy link
    </button>
  </div>
</details>
`,
  "card-product": `{%- comment -%}
  Minimal product card — used as a fallback when sections call
  render 'card-product', card_product: product without the snippet
  being emitted. Accepts card_product from the caller and degrades
  cleanly if it's missing.
{%- endcomment -%}
{%- liquid
  assign p = card_product | default: product
-%}
{%- if p -%}
  <a href="{{ p.url | default: '#' }}" class="card card-product" aria-label="{{ p.title | default: 'Product' | escape }}">
    {%- if p.featured_image -%}
      <div class="card__media">
        <img src="{{ p.featured_image | image_url: width: 600 }}" alt="{{ p.featured_image.alt | default: p.title | escape }}" loading="lazy" width="600" height="600">
      </div>
    {%- endif -%}
    <div class="card__content">
      <h3 class="card__heading">{{ p.title }}</h3>
      <div class="card__price">{% render 'price', price: p.price %}</div>
    </div>
  </a>
{%- endif -%}
`,
  "pagination": `{%- comment -%}
  Dawn-compatible pagination — expects paginate from the caller.
{%- endcomment -%}
{%- if paginate.pages > 1 -%}
  <nav class="pagination" role="navigation" aria-label="Pagination">
    {%- if paginate.previous -%}
      <a href="{{ paginate.previous.url }}" class="pagination__prev" rel="prev">← Prev</a>
    {%- endif -%}
    <ol class="pagination__list">
      {%- for part in paginate.parts -%}
        <li class="pagination__item {% if part.is_link == false and part.title == paginate.current_page %}is-current{% endif %}">
          {%- if part.is_link -%}
            <a href="{{ part.url }}">{{ part.title }}</a>
          {%- else -%}
            <span>{{ part.title }}</span>
          {%- endif -%}
        </li>
      {%- endfor -%}
    </ol>
    {%- if paginate.next -%}
      <a href="{{ paginate.next.url }}" class="pagination__next" rel="next">Next →</a>
    {%- endif -%}
  </nav>
{%- endif -%}
`,
};

/**
 * Generic fallback for snippets we don't recognise. Still valid Liquid,
 * still passes the dangling-reference validator, and logs itself in a
 * comment so the merchant (or us on the next build) can see what was
 * synthesized. We make it a <span> with the snippet name as a class
 * so CSS/JS hooks can target it if needed.
 */
function genericFallback(name: string): string {
  return `{%- comment -%}
  Auto-synthesized fallback for missing snippet "${name}".
  The generator referenced {% raw %}{% render '${name}' %}{% endraw %} but
  didn't emit snippets/${name}.liquid. This placeholder keeps the theme
  valid until the section is regenerated with the real snippet.
{%- endcomment -%}
<span class="ys-missing-snippet ys-missing-snippet--${name}" data-missing-snippet="${name}" aria-hidden="true"></span>
`;
}

export interface SynthesisResult {
  /** Files to ADD to the bundle (all under snippets/). */
  added: ParsedFile[];
  /** Names of snippets synthesized — useful for logging/telemetry. */
  namesAdded: string[];
}

/**
 * Inspect `files` for every {% render 'X' %} / {% include 'X' %}
 * reference; for each X that has no matching snippets/X.liquid,
 * emit a synthesized fallback. Pure function — does NOT mutate `files`.
 *
 * The generator then concatenates `added` onto its file list before
 * calling validateShopifyBundle (which will no longer see any
 * missing-snippet issues for names we synthesized).
 *
 * ── Iterative closure ────────────────────────────────────────────────
 * A few of our fallbacks reference OTHER snippets internally (e.g.
 * meta-tags calls social-meta-tags; share calls icon-share and
 * icon-clipboard; card-product calls price). If we only did one pass
 * we'd synthesize meta-tags, then the validator would see a NEW
 * missing-snippet for social-meta-tags and the loop would still fail.
 *
 * So we iterate: scan, synth, scan again on the combined file list,
 * repeat until no new refs appear. Capped at MAX_PASSES to defend
 * against pathological mutual recursion (none exists today, but a
 * future edit to SNIPPET_FALLBACKS could introduce one).
 */
export function synthesizeMissingSnippets(
  files: ParsedFile[]
): SynthesisResult {
  const MAX_PASSES = 5;

  // Snapshot existing snippet names so we don't overwrite a snippet
  // the model DID emit — their version always wins over ours. This
  // set GROWS as we synthesize so subsequent passes see what the
  // previous pass already added.
  const emittedSnippets = new Set<string>();
  for (const f of files) {
    const lower = f.filePath.toLowerCase();
    if (lower.startsWith("snippets/") && lower.endsWith(".liquid")) {
      emittedSnippets.add(f.filePath.slice("snippets/".length, -".liquid".length));
    }
  }

  const added: ParsedFile[] = [];
  const namesAdded: string[] = [];

  let scanTargets: ParsedFile[] = files;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const thisPassNeeded = new Set<string>();
    for (const f of scanTargets) {
      if (!f.filePath.toLowerCase().endsWith(".liquid")) continue;
      for (const ref of findSnippetRefs(f.content)) {
        if (!emittedSnippets.has(ref)) thisPassNeeded.add(ref);
      }
    }
    if (thisPassNeeded.size === 0) break; // fixed point reached

    const justAdded: ParsedFile[] = [];
    for (const name of thisPassNeeded) {
      const content = SNIPPET_FALLBACKS[name] ?? genericFallback(name);
      const file: ParsedFile = {
        filePath: `snippets/${name}.liquid`,
        content,
        language: "liquid",
      };
      added.push(file);
      justAdded.push(file);
      namesAdded.push(name);
      emittedSnippets.add(name);
    }
    // Next pass only needs to scan the snippets we just added — the
    // existing files have already been scanned and their refs are
    // either satisfied or queued.
    scanTargets = justAdded;
  }

  return { added, namesAdded };
}
