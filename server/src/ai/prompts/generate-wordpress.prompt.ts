/**
 * System prompt for the WordPress one-click bundle generator.
 *
 * The output of this prompt is:
 *   • A full WordPress THEME directory (PHP classic theme + theme.json so it
 *     works on both classic and block-editor setups).
 *   • HTML bodies for the Pages we'll create via REST (Home / About / Contact).
 *   • A WooCommerce CSV (generated separately by `wordpress-generator.service.ts`
 *     — the AI is not in the loop for that file).
 *
 * Hard constraints baked into the prompt:
 *   • Output a complete, installable WordPress theme directory.
 *   • Default LIGHT, with a working DARK toggle (same rule as all Yappaflow outputs).
 *   • Top-designer aesthetic — NOT a Twenty-Twenty-Five clone.
 *   • PHP in theme files only. No `eval()`, no remote `include`s, no database
 *     writes from theme code — themes must stay read-only at runtime.
 */

export interface WordPressProductForPrompt {
  slug:        string;
  name:        string;
  price:       number;
  currency?:   string;
  description?: string;
  variantKind?: string;
  variants?:   Array<{ label: string; price?: number }>;
}

export interface GenerateWordPressOptions {
  products?: WordPressProductForPrompt[];
}

export function getGenerateWordPressPrompt(opts: GenerateWordPressOptions = {}): string {
  const hasProducts = Array.isArray(opts.products) && opts.products.length > 0;

  return `## Task: Generate WordPress Theme + Content Bundle (one-click import)

You are generating a complete, installable WordPress theme PLUS the HTML
content bodies for Home, About, and Contact pages. The agency will:

  1. Upload the theme as a ZIP via  Appearance → Themes → Add New →
     "Upload Theme"  and click  Activate.
  2. Pages and (optional) WooCommerce products are pushed straight into
     the site via the REST API by Yappaflow — you do NOT need to emit
     them as PHP shortcodes; emit them as clean semantic HTML.

The theme MUST boot on a brand-new WordPress 6.x install with no extra
plugins. WooCommerce is optional — if installed, the theme should render
its shortcodes; if not, the e-commerce sections degrade gracefully.

### Required directory layout (each file is a separate fenced block)

\`\`\`
style.css
functions.php
theme.json
index.php
header.php
footer.php
front-page.php
page.php
single.php
sidebar.php
404.php
searchform.php
comments.php
inc/customizer.php
inc/template-tags.php
inc/enqueue.php
assets/css/main.css
assets/js/main.js
templates/page-about.php
templates/page-contact.php
pages/index.html
pages/about.html
pages/contact.html
\`\`\`

Notes on the \`pages/\` files:
  • \`pages/*.html\` are NOT theme files. They are the HTML bodies Yappaflow
    will POST to  /wp-json/wp/v2/pages  to create the site's Home, About,
    and Contact pages. Write them as editor-safe HTML — no \`<html>\`/\`<body>\`
    wrappers, no \`<script>\` tags. Use semantic blocks the block editor will
    leave alone (\`<section>\`, \`<h2>\`, \`<p>\`, \`<ul>\`, \`<a>\`, \`<img>\`, etc.).

### Hard requirements for the theme

1. **Valid WordPress classic theme.** \`style.css\` starts with the standard
   theme header comment (Theme Name, Author: Yappaflow, Version: 1.0.0,
   License: GPL-2.0-or-later, Text Domain: yappaflow-{slug}). \`functions.php\`
   registers menus, adds theme support for title-tag, post-thumbnails,
   custom-logo, wp-block-styles, editor-styles, html5, responsive-embeds.
2. **Block-editor compatibility.** \`theme.json\` declares color palette,
   typography, spacing, layout content/wide sizes — with BOTH light and dark
   palettes under \`styles.elements\` + \`styles.color\`. Use CSS custom
   properties so the JS toggle can flip them at runtime.
3. **No remote calls from PHP.** All assets (fonts, JS libs, CSS) ship
   inside \`assets/\`. Do NOT \`wp_enqueue_script( 'https://cdnjs…' )\`.
4. **Security.** Every \`echo\` of user-derived data goes through \`esc_html()\`,
   \`esc_attr()\`, \`esc_url()\`, or \`wp_kses_post()\`. Every form submit
   nonce-verifies via \`wp_verify_nonce( $_POST['_wpnonce'], '…' )\`.
5. **Enqueuing.** Scripts and styles load via \`wp_enqueue_style\` /
   \`wp_enqueue_script\` inside an \`inc/enqueue.php\` helper hooked on
   \`wp_enqueue_scripts\`. Never inline \`<link>\` or \`<script>\` tags in the
   \`header.php\` body.
6. **i18n.** All user-facing strings wrapped in \`__( 'Hello', 'yappaflow-{slug}' )\`
   or \`_e( … )\`. Text Domain matches \`style.css\`.
7. **Menus.** Register one menu location \`primary\` in \`functions.php\`,
   rendered in \`header.php\` via \`wp_nav_menu( array( 'theme_location' => 'primary' ) )\`
   — and the theme must still render a hard-coded fallback nav when no menu
   is assigned, so the site is usable before the user opens Appearance → Menus.

### Dual theme (MANDATORY — same rule as every Yappaflow output)

Default light. Always ship a working dark toggle:
  - Inline script in \`header.php\` \`<head>\` (above the enqueued stylesheet)
    that reads \`localStorage.yappaflow_theme\`, then \`prefers-color-scheme\`,
    then falls back to light. It sets \`document.documentElement.dataset.theme\`
    BEFORE first paint.
  - A visible toggle button in the header (keyboard-focusable, aria-labelled,
    updates the localStorage value and the \`dataset.theme\` attr).
  - Both palettes MUST pass WCAG AA.
  - Derive the dark palette from the identity's brand accent — never pure black.
  - \`theme.json\` exposes both palettes; \`assets/css/main.css\` defines
    \`[data-theme="light"] { --bg: …; --fg: …; }\` and
    \`[data-theme="dark"]  { --bg: …; --fg: …; }\` custom properties and the
    whole theme consumes those vars.

### Design guidance

This should feel like a top-tier WordPress theme the agency would proudly hand
to a client — NOT a Twenty-Twenty-Five fork.

- Pick a cohesive aesthetic direction tied to the identity tone
  (editorial / luxury / playful / brutalist / etc.) and commit to it.
- Distinctive typography pairing via system fallbacks (e.g. Georgia display
  + Inter body, or SF Pro display + Georgia body). No Google Fonts — ship
  everything from \`assets/\`.
- ONE dominant color, ONE accent. Avoid pure black/white.
- Hero with one strong visual idea (oversized lockup, diagonal rule, etc.).
- Subtle motion only. \`prefers-reduced-motion\` respected.
- Inline SVGs for logo/icons.

${hasProducts
  ? `### WooCommerce support (e-commerce flavor)

The identity includes a product catalog — Yappaflow will push those products
into WooCommerce via /wc/v3/products, and a \`products.csv\` for manual import
is generated separately. You do NOT emit the CSV.

What you DO emit:
  • A \`templates/page-shop.php\` (or a shop block inside \`front-page.php\`) that
    calls \`echo do_shortcode( '[products limit="8" columns="4"]' )\` when the
    WooCommerce plugin is active, with a \`class_exists( 'WooCommerce' )\` guard
    that renders a polished "Shop coming soon" block when it isn't.
  • Product-card styling in \`assets/css/main.css\` that restyles the Woo
    \`.woocommerce ul.products li.product\` grid so the Yappaflow-generated
    theme controls the look rather than Woo's default templates.
  • A featured-products section on \`pages/index.html\` that shows the
    product cards as editor-safe HTML placeholders (for the Pages REST push).`
  : `### WooCommerce

No catalog provided. The theme must still gracefully handle the case where
WooCommerce is activated later — if you include any Woo shortcodes, gate them
behind \`class_exists( 'WooCommerce' )\` so nothing breaks on a plain install.`}

### Output format

Emit each file as a fenced code block with a \`filepath:\` marker on the
opening fence line, in the order listed under "Required directory layout".
Nothing outside these fences — no prose, no commentary.

Example fence:

\`\`\`filepath:style.css
/*
Theme Name: …
*/
\`\`\`

Begin.`;
}
