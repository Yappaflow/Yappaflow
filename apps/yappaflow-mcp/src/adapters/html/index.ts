/**
 * HTML adapter — the universal fallback. Ships a single-file index.html + styles.css.
 *
 * Flow:
 *   1. Compose a generation prompt: doctrine + brief + compact DNA summary + content blocks
 *   2. Call Sonnet (generation stage) for the HTML/CSS
 *   3. In offline mode, skip the LLM and produce a deterministic scaffold from the DNA so the
 *      rest of the pipeline can be exercised end-to-end without keys.
 */

import type { Config } from "../../config.js";
import type { OpenRouterClient } from "../../llm/openrouter.js";
import type { Brief } from "../../tools/brief.js";
import type { MergedDna } from "../../tools/merge-dna.js";
import type { BuildOutput, ContentBlocks } from "../../tools/build-site.js";
import { DESIGN_DOCTRINE, DARK_THEME_TOGGLE_SNIPPET } from "../doctrine.js";

export async function buildHtml(params: {
  brief: Brief;
  mergedDna: MergedDna;
  content?: ContentBlocks;
  config: Config;
  llm: OpenRouterClient;
}): Promise<BuildOutput> {
  const { brief, mergedDna, content, llm } = params;

  if (llm.offline) {
    return offlineScaffold(brief, mergedDna, content);
  }

  const dnaSummary = compactDna(mergedDna);
  const contentBlock = content ? JSON.stringify(content, null, 2) : "{}";

  const prompt = `Build a production-grade single-page HTML site following the DNA below.
Return a JSON object shaped as: {
  "index.html": string,
  "styles.css": string,
  "script.js": string
}. Do not wrap in a code fence.

BRIEF:
${JSON.stringify(brief, null, 2)}

DESIGN DNA (merged):
${dnaSummary}

CONTENT BLOCKS:
${contentBlock}

HARD RULES:
- Include the Yappaflow dark-theme toggle (a functional button in the header).
- Use CSS custom properties for every color and font token; default to light theme with
  [data-theme='dark'] overrides.
- Apply the DNA's motion easings and durations; no new cubic-bezier values.
- Keep accessibility intact: semantic landmarks, skip link, focus-visible outlines.`;

  const raw = await llm.complete({
    stage: "generation",
    system: DESIGN_DOCTRINE,
    user: prompt,
    responseFormat: "json",
    temperature: 0.3,
    maxTokens: 8192,
  });

  let parsed: { "index.html": string; "styles.css": string; "script.js"?: string };
  try {
    parsed = JSON.parse(cleanFence(raw)) as typeof parsed;
  } catch (err) {
    return offlineScaffold(brief, mergedDna, content, {
      reason: `model output not JSON: ${(err as Error).message}`,
    });
  }

  return {
    platform: "html",
    files: [
      { path: "index.html", content: parsed["index.html"] ?? "" },
      { path: "styles.css", content: parsed["styles.css"] ?? "" },
      ...(parsed["script.js"] ? [{ path: "script.js", content: parsed["script.js"] }] : []),
    ],
    summary: `HTML scaffold generated from ${mergedDna.mergeMeta.structureSource.url} (structure), ${mergedDna.mergeMeta.typographySource.url} (typography).`,
    nextSteps: [
      "Download the files",
      "Preview locally by opening index.html",
      "Iterate by editing the DNA or re-running build_site with revised content",
    ],
    doctrineUsed: "DESIGN_DOCTRINE v1",
  };
}

// ----------------- offline scaffold -----------------
/**
 * Produces a real, viewable HTML page straight from the DNA — no LLM required.
 * Not beautiful, but it proves the pipeline end-to-end and reveals whether the DNA
 * carries enough signal to build from.
 */
function offlineScaffold(
  brief: Brief,
  dna: MergedDna,
  content?: ContentBlocks,
  meta?: { reason?: string },
): BuildOutput {
  const family = dna.typography.families[0]?.family ?? "Inter";
  const secondary = dna.typography.families[1]?.family ?? family;
  const scale = dna.typography.scalePx;
  const h1Px = scale[scale.length - 1] ?? 56;
  const bodyPx = scale[Math.floor(scale.length / 2)] ?? 16;

  const bg = dna.colors.summary.backgrounds[0] ?? "#ffffff";
  const fg = dna.colors.summary.foregrounds[0] ?? "#111111";
  const accent = dna.colors.summary.accents[0] ?? "#3b82f6";

  const maxWidth = dna.grid.rhythm.maxWidth ?? "1200px";
  const gap = dna.grid.rhythm.gap ?? "24px";

  const heading = content?.copy?.heading ?? brief.tone ?? `A ${brief.industry} site, designed right.`;
  const sub = content?.copy?.subhead ?? `For ${brief.audience || "the right audience"}.`;
  const sections = content?.copy?.sections ?? defaultSections(brief);

  const html = `<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escape(heading)}</title>
  <meta name="description" content="${escape(sub)}" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <a class="skip-link" href="#main">Skip to main</a>
  <header class="site-header">
    <div class="brand">${escape(brief.industry)}</div>
    <nav aria-label="Primary">
      ${sections.map((s) => `<a href="#${slugify(s.title)}">${escape(s.title)}</a>`).join("\n      ")}
    </nav>
    ${DARK_THEME_TOGGLE_SNIPPET.trim()}
  </header>
  <main id="main">
    <section class="hero" aria-label="Hero">
      <h1>${escape(heading)}</h1>
      <p class="subhead">${escape(sub)}</p>
    </section>
    ${sections
      .map(
        (s) => `<section id="${slugify(s.title)}" class="content-section">
      <h2>${escape(s.title)}</h2>
      <p>${escape(s.body)}</p>
    </section>`,
      )
      .join("\n    ")}
  </main>
  <footer class="site-footer">
    <small>Built with Yappaflow — design DNA sourced from ${escape(
      dna.mergeMeta.structureSource.finalUrl,
    )} and ${escape(dna.mergeMeta.typographySource.finalUrl)}.</small>
  </footer>
</body>
</html>`;

  const topTransition = dna.motion.transitions[0];
  const transitionValue = topTransition
    ? `${topTransition.property} ${topTransition.duration} ${topTransition.timing} ${topTransition.delay}`
    : "color 150ms cubic-bezier(0.4, 0, 0.2, 1)";

  const css = `:root {
  --yf-bg: ${bg};
  --yf-fg: ${fg};
  --yf-accent: ${accent};
  --yf-font-sans: ${family}, system-ui, sans-serif;
  --yf-font-secondary: ${secondary}, system-ui, sans-serif;
  --yf-max-w: ${maxWidth};
  --yf-gap: ${gap};
  --yf-transition: ${transitionValue};
  --yf-fs-body: ${bodyPx}px;
  --yf-fs-h1: ${h1Px}px;
  --yf-line-body: 1.5;
  --yf-line-display: 1.05;
}
[data-theme='dark'] {
  --yf-bg: #0a0a0a;
  --yf-fg: #f5f5f4;
  --yf-accent: ${accent};
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--yf-bg);
  color: var(--yf-fg);
  font-family: var(--yf-font-sans);
  font-size: var(--yf-fs-body);
  line-height: var(--yf-line-body);
  -webkit-font-smoothing: antialiased;
  transition: background var(--yf-transition), color var(--yf-transition);
}
.skip-link { position: absolute; left: -9999px; }
.skip-link:focus { left: 1rem; top: 1rem; background: var(--yf-bg); padding: .5rem 1rem; }
.site-header {
  display: flex; gap: var(--yf-gap); align-items: center; justify-content: space-between;
  max-width: var(--yf-max-w); margin: 0 auto; padding: 1.5rem 1.25rem;
}
.brand { font-family: var(--yf-font-secondary); text-transform: uppercase; letter-spacing: .1em; }
.site-header nav { display: flex; gap: 1.5rem; }
.site-header nav a { color: currentColor; text-decoration: none; transition: var(--yf-transition); }
.site-header nav a:hover { opacity: .6; }
.theme-toggle {
  background: transparent; border: 1px solid currentColor; color: currentColor;
  border-radius: 999px; width: 40px; height: 40px; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  transition: var(--yf-transition);
}
.theme-toggle:focus-visible { outline: 2px solid var(--yf-accent); outline-offset: 2px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
main { max-width: var(--yf-max-w); margin: 0 auto; padding: 0 1.25rem; }
.hero { padding: 6rem 0; }
.hero h1 {
  font-size: clamp(40px, 6vw, var(--yf-fs-h1));
  line-height: var(--yf-line-display);
  margin: 0;
  letter-spacing: -0.02em;
}
.subhead { max-width: 48ch; color: color-mix(in srgb, var(--yf-fg) 70%, transparent); font-size: 1.125rem; margin-top: 1rem; }
.content-section { padding: 4rem 0; border-top: 1px solid color-mix(in srgb, var(--yf-fg) 15%, transparent); }
.content-section h2 { font-size: clamp(28px, 3.2vw, 40px); margin: 0 0 1rem; letter-spacing: -0.015em; }
.site-footer { max-width: var(--yf-max-w); margin: 4rem auto 2rem; padding: 2rem 1.25rem; opacity: .65; }
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}`;

  return {
    platform: "html",
    files: [
      { path: "index.html", content: html },
      { path: "styles.css", content: css },
    ],
    summary: meta?.reason
      ? `Offline scaffold (${meta.reason}). Generated directly from DNA with no LLM.`
      : `Offline scaffold generated directly from DNA (no OPENROUTER_API_KEY set). Structure from ${dna.mergeMeta.structureSource.url}; typography from ${dna.mergeMeta.typographySource.url}.`,
    nextSteps: [
      "Set OPENROUTER_API_KEY and re-run to get a Sonnet-authored version",
      "Open index.html in a browser — the dark-mode toggle works out of the box",
      "Edit the DNA and re-merge to try a different blend",
    ],
    doctrineUsed: "DESIGN_DOCTRINE v1 (offline)",
  };
}

function defaultSections(brief: Brief): Array<{ title: string; body: string }> {
  const map: Record<string, Array<{ title: string; body: string }>> = {
    photography: [
      { title: "Work", body: "Selected projects and editorial series." },
      { title: "About", body: "About the studio and the practice." },
      { title: "Contact", body: "Inquiries and booking information." },
    ],
    saas: [
      { title: "Product", body: "What the product does and who it's for." },
      { title: "Pricing", body: "Transparent plans with concrete quotas." },
      { title: "Docs", body: "Reference documentation for the API." },
    ],
    "ecommerce-fashion": [
      { title: "Shop", body: "The current season." },
      { title: "Lookbook", body: "Visual index of the collection." },
      { title: "Stores", body: "Find us in person." },
    ],
  };
  return map[brief.industry] ?? map["saas"]!;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function cleanFence(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

function compactDna(dna: MergedDna): string {
  return JSON.stringify(
    {
      typography: {
        top: dna.typography.styles.slice(0, 6),
        families: dna.typography.families.slice(0, 4),
        scale: dna.typography.scalePx,
      },
      colors: {
        summary: dna.colors.summary,
        vars: dna.colors.customProperties.slice(0, 40),
      },
      motion: {
        keyframeNames: dna.motion.keyframes.map((k) => k.name).slice(0, 12),
        transitions: dna.motion.transitions.slice(0, 6),
        scrollHints: dna.motion.scrollHints,
      },
      grid: dna.grid.rhythm,
      stack: dna.stack.libraries,
      mergeMeta: dna.mergeMeta,
    },
    null,
    2,
  );
}
