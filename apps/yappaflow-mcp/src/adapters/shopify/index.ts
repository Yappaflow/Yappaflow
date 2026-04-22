/**
 * Shopify OS 2.0 adapter — emits a canonical theme folder (Dawn-shaped).
 *
 * Scope for this skeleton:
 *   - Correct folder layout (layout/, sections/, snippets/, assets/, templates/, config/, locales/)
 *   - Minimal *valid* Liquid that renders a DNA-derived hero + feature grid
 *   - Theme settings schema seeded with DNA tokens (colors, type scale) so merchants can tweak
 *   - Dark-theme toggle via the shared Yappaflow snippet, embedded in layout
 *
 * TODO (Phase 7+):
 *   - Swap the inline hero/feature sections for dynamic-section JSON templates
 *   - Wire product/collection/cart templates (we only ship index.json here)
 *   - Add a metaobject-driven content pipeline so content blocks can be edited in admin
 *   - Generate locale strings from the brief (currently en.default.json is empty)
 */

import type { Config } from "../../config.js";
import type { OpenRouterClient } from "../../llm/openrouter.js";
import type { Brief } from "../../tools/brief.js";
import type { MergedDna } from "../../tools/merge-dna.js";
import type { BuildOutput, ContentBlocks } from "../../tools/build-site.js";
import { DESIGN_DOCTRINE, DARK_THEME_TOGGLE_SNIPPET } from "../doctrine.js";

export async function buildShopify(params: {
  brief: Brief;
  mergedDna: MergedDna;
  content?: ContentBlocks;
  config: Config;
  llm: OpenRouterClient;
}): Promise<BuildOutput> {
  const { brief, mergedDna, content } = params;

  const heading = content?.copy?.heading ?? defaultHeading(brief);
  const subhead = content?.copy?.subhead ?? "[[ subhead: describe the product in one line ]]";
  const sections =
    content?.copy?.sections ??
    defaultSections(brief).map((title) => ({ title, body: `[[ body for ${title} ]]` }));

  const primaryFamily = mergedDna.typography.families[0]?.family ?? "Inter, system-ui, sans-serif";
  const secondaryFamily = mergedDna.typography.families[1]?.family ?? primaryFamily;
  const accent =
    mergedDna.colors.summary.accents[0] ?? mergedDna.colors.summary.foregrounds[0] ?? "#111111";
  const bg = mergedDna.colors.summary.backgrounds[0] ?? "#ffffff";
  const fg = mergedDna.colors.summary.foregrounds[0] ?? "#111111";
  const maxWidth = mergedDna.grid.rhythm.maxWidth ?? "1200px";

  const themeLiquid = `<!doctype html>
<html lang="{{ request.locale.iso_code }}" data-theme="light">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>{{ page_title }}{% if current_tags %} &ndash; tagged "{{ current_tags | join: ', ' }}"{% endif %}{% if current_page != 1 %} &ndash; Page {{ current_page }}{% endif %}{% unless page_title contains shop.name %} &ndash; {{ shop.name }}{% endunless %}</title>
    <meta name="description" content="{{ page_description | escape }}">
    {{ content_for_header }}
    {{ 'base.css' | asset_url | stylesheet_tag }}
  </head>
  <body class="yf-shopify">
    {% section 'header' %}
    <main id="MainContent" role="main">
      {{ content_for_layout }}
    </main>
    {% section 'footer' %}
    ${DARK_THEME_TOGGLE_SNIPPET}
  </body>
</html>`;

  const baseCss = `:root {
  --yf-bg: ${bg};
  --yf-fg: ${fg};
  --yf-accent: ${accent};
  --yf-font-primary: ${primaryFamily};
  --yf-font-secondary: ${secondaryFamily};
  --yf-max-width: ${maxWidth};
}
[data-theme="dark"] {
  --yf-bg: #0a0a0a;
  --yf-fg: #f5f5f5;
}
html, body {
  margin: 0;
  background: var(--yf-bg);
  color: var(--yf-fg);
  font-family: var(--yf-font-primary);
}
.yf-container { max-width: var(--yf-max-width); margin: 0 auto; padding: 24px; }
.yf-hero { padding: 120px 24px; }
.yf-hero h1 { font-size: clamp(2.5rem, 6vw, 5rem); line-height: 1.02; margin: 0 0 24px; }
.yf-hero p { font-size: 1.25rem; opacity: 0.8; max-width: 60ch; }
.yf-feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; padding: 64px 24px; }
.yf-feature { border: 1px solid color-mix(in srgb, var(--yf-fg) 12%, transparent); padding: 32px; border-radius: 12px; }
.theme-toggle { position: fixed; top: 16px; right: 16px; background: transparent; color: var(--yf-fg); border: 1px solid currentColor; padding: 6px 10px; border-radius: 999px; cursor: pointer; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
`;

  const headerSection = `<header class="yf-container yf-header">
  <a href="{{ routes.root_url }}" class="yf-logo">{{ shop.name }}</a>
  <nav>
    {% for link in linklists.main-menu.links %}
      <a href="{{ link.url }}">{{ link.title }}</a>
    {% endfor %}
  </nav>
</header>
{% schema %}
{
  "name": "Header",
  "settings": []
}
{% endschema %}`;

  const footerSection = `<footer class="yf-container yf-footer">
  <p>&copy; {{ 'now' | date: '%Y' }} {{ shop.name }}</p>
</footer>
{% schema %}
{
  "name": "Footer",
  "settings": []
}
{% endschema %}`;

  const heroSection = `<section class="yf-container yf-hero">
  <h1>${escapeLiquid(heading)}</h1>
  <p>${escapeLiquid(subhead)}</p>
  <a class="yf-cta" href="{{ section.settings.cta_url }}">{{ section.settings.cta_label }}</a>
</section>
{% schema %}
{
  "name": "Hero",
  "settings": [
    { "type": "text", "id": "cta_label", "label": "CTA label", "default": "Get started" },
    { "type": "url", "id": "cta_url", "label": "CTA destination" }
  ],
  "presets": [{ "name": "Hero" }]
}
{% endschema %}`;

  const featureGridSection = `<section class="yf-container yf-feature-grid">
  ${sections
    .map(
      (s) =>
        `<article class="yf-feature">
    <h3>${escapeLiquid(s.title)}</h3>
    <p>${escapeLiquid(s.body)}</p>
  </article>`,
    )
    .join("\n  ")}
</section>
{% schema %}
{
  "name": "Feature grid",
  "settings": [],
  "presets": [{ "name": "Feature grid" }]
}
{% endschema %}`;

  const indexTemplate = `{
  "sections": {
    "hero": { "type": "hero" },
    "features": { "type": "feature-grid" }
  },
  "order": ["hero", "features"]
}`;

  const settingsSchema = `[
  { "name": "theme_info", "theme_name": "Yappaflow — ${escapeJson(brief.industry)}", "theme_version": "0.1.0", "theme_author": "Yappaflow" },
  {
    "name": "Colors",
    "settings": [
      { "type": "color", "id": "color_background", "label": "Background", "default": "${bg}" },
      { "type": "color", "id": "color_foreground", "label": "Foreground", "default": "${fg}" },
      { "type": "color", "id": "color_accent", "label": "Accent", "default": "${accent}" }
    ]
  },
  {
    "name": "Typography",
    "settings": [
      { "type": "font_picker", "id": "font_primary", "label": "Primary font", "default": "assistant_n4" }
    ]
  }
]`;

  const files: BuildOutput["files"] = [
    { path: "layout/theme.liquid", content: themeLiquid },
    { path: "assets/base.css", content: baseCss },
    { path: "sections/header.liquid", content: headerSection },
    { path: "sections/footer.liquid", content: footerSection },
    { path: "sections/hero.liquid", content: heroSection },
    { path: "sections/feature-grid.liquid", content: featureGridSection },
    { path: "templates/index.json", content: indexTemplate },
    { path: "config/settings_schema.json", content: settingsSchema },
    { path: "config/settings_data.json", content: `{ "current": {} }` },
    { path: "locales/en.default.json", content: `{}` },
    {
      path: "README.md",
      content: `# Shopify theme (Yappaflow skeleton)

Upload with:

\`\`\`sh
shopify theme push
\`\`\`

## TODO
- Replace [[ placeholder ]] copy with final content.
- Wire product / collection templates (only templates/index.json is shipped).
- Move hero media into a metaobject-backed block so merchants can edit in admin.
- Embed Yappaflow analytics tag in theme.liquid <head>.
`,
    },
  ];

  return {
    platform: "shopify",
    files,
    summary: `Shopify OS 2.0 theme with ${files.length} files. Light theme default, dark toggle wired.`,
    nextSteps: [
      "shopify theme push",
      "Fill placeholder copy in sections/hero.liquid and sections/feature-grid.liquid",
      "Wire product/collection templates (templates/product.json, templates/collection.json)",
      "Register the theme in Shopify CLI and preview with `shopify theme dev`",
    ],
    doctrineUsed: DESIGN_DOCTRINE,
  };
}

function defaultHeading(b: Brief): string {
  return `[[ headline for ${b.industry} / ${b.subcategory} ]]`;
}

function defaultSections(b: Brief): string[] {
  return b.content_model?.length
    ? b.content_model.slice(0, 4)
    : ["What it is", "How it works", "Proof", "Start now"];
}

function escapeLiquid(s: string): string {
  return s.replace(/\{\{/g, "{ {").replace(/\{%/g, "{ %");
}
function escapeJson(s: string): string {
  return s.replace(/["\\]/g, "\\$&");
}
