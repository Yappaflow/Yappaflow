/**
 * WordPress FSE (Full Site Editing) block-theme adapter.
 *
 * Scope for this skeleton:
 *   - Canonical FSE layout: style.css (theme header), theme.json (tokens),
 *     templates/*.html, parts/*.html, functions.php
 *   - theme.json seeded with DNA-derived color palette, typography scale, layout sizes
 *   - Home template composed of core/group blocks so it loads in the Site Editor
 *   - Dark-mode toggle as a small inline script in functions.php (wp_footer)
 *
 * TODO (Phase 7+):
 *   - Emit a proper /patterns/*.php library instead of inlining markup in templates
 *   - Add a child-theme bootstrap so agencies can iterate without losing updates
 *   - Expose custom block-editor settings (layout, spacing presets) keyed to DNA rhythm
 *   - Generate a translations/pot file so content can be localized
 */

import type { Config } from "../../config.js";
import type { OpenRouterClient } from "../../llm/openrouter.js";
import type { Brief } from "../../tools/brief.js";
import type { MergedDna } from "../../tools/merge-dna.js";
import type { BuildOutput, ContentBlocks } from "../../tools/build-site.js";
import { DESIGN_DOCTRINE, DARK_THEME_TOGGLE_SNIPPET } from "../doctrine.js";

export async function buildWordpress(params: {
  brief: Brief;
  mergedDna: MergedDna;
  content?: ContentBlocks;
  config: Config;
  llm: OpenRouterClient;
}): Promise<BuildOutput> {
  const { brief, mergedDna, content } = params;

  const heading = content?.copy?.heading ?? `[[ headline for ${brief.industry} ]]`;
  const subhead = content?.copy?.subhead ?? "[[ subhead ]]";
  const featureBlocks =
    content?.copy?.sections ??
    (brief.content_model ?? ["What it is", "How it works", "Proof"]).map((title) => ({
      title,
      body: `[[ body for ${title} ]]`,
    }));

  const primaryFamily = mergedDna.typography.families[0]?.family ?? "Inter, system-ui, sans-serif";
  const secondaryFamily = mergedDna.typography.families[1]?.family ?? primaryFamily;
  const bg = mergedDna.colors.summary.backgrounds[0] ?? "#ffffff";
  const fg = mergedDna.colors.summary.foregrounds[0] ?? "#111111";
  const accent =
    mergedDna.colors.summary.accents[0] ?? mergedDna.colors.summary.foregrounds[0] ?? "#111111";

  const slug = `yf-${sanitizeSlug(brief.industry || "theme")}`;
  const prettyName = `Yappaflow — ${capitalize(brief.industry || "theme")}`;

  const styleCss = `/*
Theme Name: ${prettyName}
Theme URI: https://yappaflow.app
Author: Yappaflow
Description: DNA-driven FSE block theme. Light-default with dark toggle per Yappaflow doctrine.
Version: 0.1.0
License: GPL-2.0-or-later
Text Domain: ${slug}
*/
`;

  const themeJson = JSON.stringify(
    {
      $schema: "https://schemas.wp.org/trunk/theme.json",
      version: 2,
      settings: {
        appearanceTools: true,
        color: {
          palette: [
            { slug: "background", color: bg, name: "Background" },
            { slug: "foreground", color: fg, name: "Foreground" },
            { slug: "accent", color: accent, name: "Accent" },
          ],
        },
        typography: {
          fluid: true,
          fontFamilies: [
            { slug: "primary", name: "Primary", fontFamily: primaryFamily },
            { slug: "secondary", name: "Secondary", fontFamily: secondaryFamily },
          ],
          fontSizes: mergedDna.typography.scalePx.slice(0, 6).map((px, i) => ({
            slug: ["xs", "sm", "base", "md", "lg", "xl"][i] ?? `scale-${i}`,
            name: ["XS", "SM", "Base", "MD", "LG", "XL"][i] ?? `Scale ${i}`,
            size: `${px}px`,
          })),
        },
        layout: {
          contentSize: mergedDna.grid.rhythm.maxWidth ?? "1200px",
          wideSize: mergedDna.grid.rhythm.maxWidth ?? "1400px",
        },
      },
      styles: {
        color: { background: bg, text: fg },
        typography: { fontFamily: "var(--wp--preset--font-family--primary)" },
        elements: { link: { color: { text: "var(--wp--preset--color--accent)" } } },
      },
    },
    null,
    2,
  );

  const headerPart = `<!-- wp:group {"tagName":"header","layout":{"type":"constrained"}} -->
<header class="wp-block-group">
  <!-- wp:site-title /-->
  <!-- wp:navigation /-->
</header>
<!-- /wp:group -->`;

  const footerPart = `<!-- wp:group {"tagName":"footer","layout":{"type":"constrained"}} -->
<footer class="wp-block-group">
  <!-- wp:paragraph --><p>&copy; <!-- wp:site-title /--></p><!-- /wp:paragraph -->
</footer>
<!-- /wp:group -->`;

  const frontPage = `<!-- wp:template-part {"slug":"header","tagName":"header"} /-->

<!-- wp:group {"layout":{"type":"constrained"},"style":{"spacing":{"padding":{"top":"120px","bottom":"120px"}}}} -->
<div class="wp-block-group">
  <!-- wp:heading {"level":1,"fontSize":"xl"} -->
  <h1 class="has-xl-font-size">${escapeHtml(heading)}</h1>
  <!-- /wp:heading -->
  <!-- wp:paragraph --><p>${escapeHtml(subhead)}</p><!-- /wp:paragraph -->
</div>
<!-- /wp:group -->

<!-- wp:columns -->
<div class="wp-block-columns">
  ${featureBlocks
    .map(
      (b) =>
        `<!-- wp:column -->
  <div class="wp-block-column">
    <!-- wp:heading {"level":3} --><h3>${escapeHtml(b.title)}</h3><!-- /wp:heading -->
    <!-- wp:paragraph --><p>${escapeHtml(b.body)}</p><!-- /wp:paragraph -->
  </div>
  <!-- /wp:column -->`,
    )
    .join("\n  ")}
</div>
<!-- /wp:columns -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->`;

  const indexTemplate = `<!-- wp:template-part {"slug":"header","tagName":"header"} /-->
<!-- wp:post-content /-->
<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->`;

  const functionsPhp = `<?php
/**
 * ${prettyName} — theme bootstrap.
 * Generated by Yappaflow. Safe to edit; regenerated output respects child themes.
 */
if ( ! function_exists( 'yf_theme_setup' ) ) {
  function yf_theme_setup() {
    add_theme_support( 'wp-block-styles' );
    add_theme_support( 'responsive-embeds' );
    add_theme_support( 'editor-styles' );
    add_theme_support( 'title-tag' );
  }
  add_action( 'after_setup_theme', 'yf_theme_setup' );
}

function yf_theme_toggle_markup() {
  // Dark-theme toggle — Yappaflow doctrine mandates light default + toggle on every site.
  echo <<<'HTML'
${DARK_THEME_TOGGLE_SNIPPET}
HTML;
}
add_action( 'wp_footer', 'yf_theme_toggle_markup' );
`;

  const files: BuildOutput["files"] = [
    { path: "style.css", content: styleCss },
    { path: "theme.json", content: themeJson },
    { path: "functions.php", content: functionsPhp },
    { path: "parts/header.html", content: headerPart },
    { path: "parts/footer.html", content: footerPart },
    { path: "templates/index.html", content: indexTemplate },
    { path: "templates/front-page.html", content: frontPage },
    {
      path: "README.md",
      content: `# ${prettyName}

Install by zipping this folder and uploading in **Appearance → Themes → Add new**.

## TODO
- Replace [[ placeholder ]] copy in templates/front-page.html.
- Add /patterns/*.php for reusable block patterns.
- Ship a child-theme starter so agencies can iterate.
- Verify theme.json in the Site Editor preview (Tools → Site Editor).
`,
    },
  ];

  return {
    platform: "wordpress",
    files,
    summary: `FSE block theme "${prettyName}" with ${files.length} files. Dark toggle wired via wp_footer.`,
    nextSteps: [
      "Zip the folder and upload via Appearance → Themes → Add new",
      "Open Site Editor and verify theme.json tokens load correctly",
      "Replace placeholder copy in templates/front-page.html",
      "Add block patterns under /patterns/*.php for reusable sections",
    ],
    doctrineUsed: DESIGN_DOCTRINE,
  };
}

function sanitizeSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "theme";
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
