/**
 * IKAS adapter — Turkish headless commerce platform with a React/TS storefront.
 *
 * Scope for this skeleton:
 *   - Canonical IKAS theme layout: /config.json + /src/* with TSX pages and components
 *   - Tokens emitted as a plain TS module so they can be imported anywhere in the theme
 *   - Home page composed of three components (Hero, FeatureGrid, Footer)
 *   - Yappaflow dark-toggle ported to a tiny TSX component
 *
 * TODO (Phase 7+):
 *   - Hook IKAS GraphQL data (products, collections, storefront config)
 *   - Replace the static feature grid with an IKAS CMS-driven section
 *   - Generate Turkish-default strings (IKAS is TR-first; most agencies ship TR/EN together)
 *   - Add the IKAS theme manifest for storefront settings panels
 */

import type { Config } from "../../config.js";
import type { OpenRouterClient } from "../../llm/openrouter.js";
import type { Brief } from "../../tools/brief.js";
import type { MergedDna } from "../../tools/merge-dna.js";
import type { BuildOutput, ContentBlocks } from "../../tools/build-site.js";
import { DESIGN_DOCTRINE } from "../doctrine.js";

export async function buildIkas(params: {
  brief: Brief;
  mergedDna: MergedDna;
  content?: ContentBlocks;
  config: Config;
  llm: OpenRouterClient;
}): Promise<BuildOutput> {
  const { brief, mergedDna, content } = params;

  const heading = content?.copy?.heading ?? `[[ headline for ${brief.industry} ]]`;
  const subhead = content?.copy?.subhead ?? "[[ subhead ]]";
  const features =
    content?.copy?.sections ??
    (brief.content_model ?? ["What it is", "How it works", "Proof"]).map((title) => ({
      title,
      body: `[[ body for ${title} ]]`,
    }));

  const primaryFamily = mergedDna.typography.families[0]?.family ?? "Inter, system-ui, sans-serif";
  const bg = mergedDna.colors.summary.backgrounds[0] ?? "#ffffff";
  const fg = mergedDna.colors.summary.foregrounds[0] ?? "#111111";
  const accent = mergedDna.colors.summary.accents[0] ?? fg;

  const configJson = JSON.stringify(
    {
      name: `yappaflow-${brief.industry || "store"}`,
      version: "0.1.0",
      description: `Yappaflow-generated IKAS theme for ${brief.industry}`,
      author: "Yappaflow",
      entry: "src/pages/index.tsx",
      locales: ["tr", "en"],
      defaultLocale: "tr",
    },
    null,
    2,
  );

  const tokensTs = `export const tokens = {
  colors: {
    background: "${bg}",
    foreground: "${fg}",
    accent: "${accent}",
  },
  fonts: {
    primary: "${primaryFamily}",
  },
  layout: {
    maxWidth: "${mergedDna.grid.rhythm.maxWidth ?? "1200px"}",
    gap: "${mergedDna.grid.rhythm.gap ?? "24px"}",
  },
} as const;
`;

  const globalCss = `:root {
  --yf-bg: ${bg};
  --yf-fg: ${fg};
  --yf-accent: ${accent};
  --yf-font-primary: ${primaryFamily};
  --yf-max-width: ${mergedDna.grid.rhythm.maxWidth ?? "1200px"};
}
[data-theme="dark"] { --yf-bg: #0a0a0a; --yf-fg: #f5f5f5; }
html, body { margin: 0; background: var(--yf-bg); color: var(--yf-fg); font-family: var(--yf-font-primary); }
main { max-width: var(--yf-max-width); margin: 0 auto; padding: 24px; }
.yf-hero { padding: 120px 0; }
.yf-hero h1 { font-size: clamp(2.5rem, 6vw, 5rem); line-height: 1.02; margin: 0 0 24px; }
.yf-feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; padding: 64px 0; }
.yf-feature { border: 1px solid color-mix(in srgb, var(--yf-fg) 12%, transparent); padding: 32px; border-radius: 12px; }
.theme-toggle { position: fixed; top: 16px; right: 16px; background: transparent; color: currentColor; border: 1px solid currentColor; padding: 6px 10px; border-radius: 999px; cursor: pointer; }
`;

  const headerTsx = `import React from "react";
export function Header() {
  return (
    <header>
      <nav>
        <a href="/">{/* TODO: wire IKAS storefront logo */}Logo</a>
      </nav>
    </header>
  );
}
`;

  const footerTsx = `import React from "react";
export function Footer() {
  return (
    <footer>
      <p>&copy; {new Date().getFullYear()} {/* TODO: replace with storefront.name */}</p>
    </footer>
  );
}
`;

  const heroTsx = `import React from "react";
export function Hero() {
  return (
    <section className="yf-hero">
      <h1>${escapeTsx(heading)}</h1>
      <p>${escapeTsx(subhead)}</p>
    </section>
  );
}
`;

  const featureGridTsx = `import React from "react";
type Feature = { title: string; body: string };
const features: Feature[] = ${JSON.stringify(features, null, 2)};
export function FeatureGrid() {
  return (
    <section className="yf-feature-grid">
      {features.map((f) => (
        <article className="yf-feature" key={f.title}>
          <h3>{f.title}</h3>
          <p>{f.body}</p>
        </article>
      ))}
    </section>
  );
}
`;

  const themeToggleTsx = `import React, { useEffect, useState } from "react";
/**
 * Yappaflow dark-toggle. Light by default (doctrine), dark on demand, persists to localStorage.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const saved = (localStorage.getItem("yf-theme") as "light" | "dark" | null) ?? "light";
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label="Toggle dark mode"
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        document.documentElement.dataset.theme = next;
        localStorage.setItem("yf-theme", next);
      }}
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
`;

  const indexTsx = `import React from "react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Hero } from "../components/Hero";
import { FeatureGrid } from "../components/FeatureGrid";
import { ThemeToggle } from "../components/ThemeToggle";
import "../styles/global.css";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <FeatureGrid />
      </main>
      <Footer />
      <ThemeToggle />
    </>
  );
}
`;

  const files: BuildOutput["files"] = [
    { path: "config.json", content: configJson },
    { path: "src/tokens.ts", content: tokensTs },
    { path: "src/styles/global.css", content: globalCss },
    { path: "src/components/Header.tsx", content: headerTsx },
    { path: "src/components/Footer.tsx", content: footerTsx },
    { path: "src/components/Hero.tsx", content: heroTsx },
    { path: "src/components/FeatureGrid.tsx", content: featureGridTsx },
    { path: "src/components/ThemeToggle.tsx", content: themeToggleTsx },
    { path: "src/pages/index.tsx", content: indexTsx },
    {
      path: "README.md",
      content: `# IKAS theme (Yappaflow skeleton)

Install with IKAS CLI:

\`\`\`sh
ikas theme push
\`\`\`

## TODO
- Wire IKAS storefront GraphQL (products, collections, navigation).
- Swap static FeatureGrid data for an IKAS CMS section.
- Translate strings to TR (default) and EN.
- Register theme manifest so storefront settings panel surfaces editable tokens.
`,
    },
  ];

  return {
    platform: "ikas",
    files,
    summary: `IKAS TSX storefront with ${files.length} files. Dark toggle component included.`,
    nextSteps: [
      "ikas theme push",
      "Wire IKAS GraphQL for products/collections/navigation",
      "Translate placeholder strings to Turkish (default) and English",
      "Register theme manifest so merchant-editable tokens appear in storefront settings",
    ],
    doctrineUsed: DESIGN_DOCTRINE,
  };
}

function escapeTsx(s: string): string {
  return s.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\{/g, "&#123;").replace(/\}/g, "&#125;");
}
