/**
 * Webflow adapter — Webflow doesn't accept raw HTML import; instead we emit a design-tokens
 * spec + a sitemap JSON + a paste-ready HTML snippet that the agency can drop into a
 * Webflow embed block until the Designer API (currently closed beta) lands.
 *
 * Scope for this skeleton:
 *   - design-tokens.json (brand colors, typography, spacing) for the Variables panel
 *   - site-map.json describing the canonical page tree
 *   - pages/home.json declarative section spec — the agency manually rebuilds it in Designer
 *   - embeds/home.html — working HTML that can be pasted into an Embed element as a temporary
 *     shortcut while the agency reconstructs the page natively
 *
 * TODO (Phase 7+):
 *   - Switch to the Webflow Designer API once out of closed beta (then we can emit real
 *     components and page structures, not JSON specs).
 *   - Map DNA motion to Webflow Interactions 2.0 JSON
 *   - Generate CMS collection specs from brief.content_model
 */

import type { Config } from "../../config.js";
import type { OpenRouterClient } from "../../llm/openrouter.js";
import type { Brief } from "../../tools/brief.js";
import type { MergedDna } from "../../tools/merge-dna.js";
import type { BuildOutput, ContentBlocks } from "../../tools/build-site.js";
import { DESIGN_DOCTRINE, DARK_THEME_TOGGLE_SNIPPET } from "../doctrine.js";

export async function buildWebflow(params: {
  brief: Brief;
  mergedDna: MergedDna;
  content?: ContentBlocks;
  config: Config;
  llm: OpenRouterClient;
}): Promise<BuildOutput> {
  const { brief, mergedDna, content } = params;

  const heading = content?.copy?.heading ?? `[[ headline for ${brief.industry} ]]`;
  const subhead = content?.copy?.subhead ?? "[[ subhead ]]";
  const sections =
    content?.copy?.sections ??
    (brief.content_model ?? ["What it is", "How it works", "Proof"]).map((title) => ({
      title,
      body: `[[ body for ${title} ]]`,
    }));

  const primaryFamily = mergedDna.typography.families[0]?.family ?? "Inter, system-ui, sans-serif";
  const bg = mergedDna.colors.summary.backgrounds[0] ?? "#ffffff";
  const fg = mergedDna.colors.summary.foregrounds[0] ?? "#111111";
  const accent = mergedDna.colors.summary.accents[0] ?? fg;

  const designTokens = JSON.stringify(
    {
      description: "Paste into Webflow Variables → Import JSON (beta). Otherwise recreate by hand.",
      modes: ["Light", "Dark"],
      variables: {
        "Color/Background": { Light: bg, Dark: "#0a0a0a" },
        "Color/Foreground": { Light: fg, Dark: "#f5f5f5" },
        "Color/Accent": { Light: accent, Dark: accent },
        "Font/Primary": primaryFamily,
        "Space/Container": mergedDna.grid.rhythm.maxWidth ?? "1200px",
        "Space/Gap": mergedDna.grid.rhythm.gap ?? "24px",
        "Radius/Card": "12px",
      },
      typographyScale: mergedDna.typography.scalePx.slice(0, 6),
    },
    null,
    2,
  );

  const siteMap = JSON.stringify(
    {
      description: "Canonical page tree for a Yappaflow-generated Webflow site.",
      pages: [
        { slug: "/", title: "Home", template: "home" },
        { slug: "/about", title: "About", template: "basic" },
        { slug: "/contact", title: "Contact", template: "basic" },
      ],
      cms: (brief.content_model ?? []).map((c) => ({
        collectionName: c,
        fields: [
          { name: "title", type: "PlainText", required: true },
          { name: "body", type: "RichText", required: false },
        ],
      })),
    },
    null,
    2,
  );

  const homeSpec = JSON.stringify(
    {
      description:
        "Declarative section spec — rebuild in Webflow Designer. Each section lists the component, its classes, and its children.",
      sections: [
        {
          component: "section",
          classes: ["section", "section--hero"],
          children: [
            { component: "container", classes: ["container"], children: [
              { component: "h1", classes: ["heading-xl"], text: heading },
              { component: "paragraph", classes: ["paragraph-lg"], text: subhead },
              { component: "button", classes: ["btn", "btn--primary"], text: "Get started", href: "#" },
            ] },
          ],
        },
        {
          component: "section",
          classes: ["section", "section--features"],
          children: sections.map((s) => ({
            component: "div",
            classes: ["feature"],
            children: [
              { component: "h3", classes: ["heading-sm"], text: s.title },
              { component: "paragraph", classes: ["paragraph"], text: s.body },
            ],
          })),
        },
      ],
    },
    null,
    2,
  );

  const embedHtml = `<!-- Temporary shortcut: paste into a Webflow Embed element until the Designer API ships real imports. -->
<style>
  .yf-embed { font-family: ${primaryFamily}; color: ${fg}; background: ${bg}; }
  .yf-embed [data-theme="dark"] { background: #0a0a0a; color: #f5f5f5; }
  .yf-embed .hero { padding: 120px 24px; max-width: ${mergedDna.grid.rhythm.maxWidth ?? "1200px"}; margin: 0 auto; }
  .yf-embed .hero h1 { font-size: clamp(2.5rem, 6vw, 5rem); margin: 0 0 24px; line-height: 1.02; }
  .yf-embed .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; padding: 64px 24px; max-width: ${mergedDna.grid.rhythm.maxWidth ?? "1200px"}; margin: 0 auto; }
  .yf-embed .feature { border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; padding: 32px; }
</style>
<div class="yf-embed">
  <section class="hero">
    <h1>${escapeHtml(heading)}</h1>
    <p>${escapeHtml(subhead)}</p>
  </section>
  <section class="features">
    ${sections
      .map(
        (s) =>
          `<article class="feature"><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.body)}</p></article>`,
      )
      .join("\n    ")}
  </section>
</div>
${DARK_THEME_TOGGLE_SNIPPET}`;

  const files: BuildOutput["files"] = [
    { path: "design-tokens.json", content: designTokens },
    { path: "site-map.json", content: siteMap },
    { path: "pages/home.json", content: homeSpec },
    { path: "embeds/home.html", content: embedHtml },
    {
      path: "README.md",
      content: `# Webflow handoff (Yappaflow skeleton)

Webflow does not import raw HTML. Two paths:

1. **Native rebuild (recommended)**: Use \`design-tokens.json\` to populate Variables, \`site-map.json\` for the page tree, and \`pages/home.json\` as the section-by-section blueprint. Rebuild in Designer.
2. **Temporary shortcut**: drop \`embeds/home.html\` into an Embed element. Not production-quality but useful for fast client review.

## TODO
- Wait for Webflow Designer API (closed beta); switch to programmatic import when available.
- Map DNA motion hints to Webflow Interactions 2.0 JSON once supported.
- Generate CMS collection definitions from \`brief.content_model\`.
`,
    },
  ];

  return {
    platform: "webflow",
    files,
    summary: `Webflow handoff bundle: ${files.length} files. Tokens + sitemap + embed fallback.`,
    nextSteps: [
      "Import design-tokens.json into Webflow Variables (or recreate by hand)",
      "Use site-map.json to create pages in Designer",
      "Rebuild pages/home.json section-by-section, or drop embeds/home.html into an Embed block for a preview",
      "Once Webflow Designer API exits closed beta, swap this adapter for a real programmatic importer",
    ],
    doctrineUsed: DESIGN_DOCTRINE,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
