/**
 * Smoke test for the Phase 7 SiteProject assembler.
 *
 * Exercises `assembleSiteProject()` end-to-end with the fixture brief and a
 * minimal merged DNA, then re-parses the output through SiteProjectSchema to
 * confirm round-trip validity. Prints a short summary and exits 0 on success.
 *
 * Run: `npx tsx scripts/smoke-assemble.ts` from apps/yappaflow-mcp/, or
 * `node --experimental-strip-types scripts/smoke-assemble.ts` on Node 22+.
 */

import { assembleSiteProject } from "../src/tools/build-site.js";
import { FIXTURE_BRIEF, SiteProjectSchema, type MergedDna } from "@yappaflow/types";

// Minimal MergedDna — just enough shape to satisfy SiteProject.dna's
// passthrough check. The assembler doesn't inspect DNA internals yet; it
// merely carries the DNA through for the builder/adapters-v2 to resolve.
const stubDna: MergedDna = {
  schemaVersion: 1,
  meta: {
    url: "https://stub.example",
    finalUrl: "https://stub.example",
    title: "Stub",
    description: null,
    capturedAt: new Date().toISOString(),
    viewport: { width: 1440, height: 900 },
    timings: { navigateMs: 0, scrollMs: 0, analyzeMs: 0, totalMs: 0 },
    warnings: [],
  },
  typography: { styles: [], families: [], scalePx: [] },
  colors: {
    palette: [],
    customProperties: [],
    summary: { backgrounds: [], foregrounds: [], accents: [] },
  },
  motion: {
    keyframes: [],
    transitions: [],
    runtimeAnimations: [],
    scrollHints: [],
  },
  grid: {
    containers: [],
    rhythm: { maxWidth: null, padding: null, gap: null },
  },
  stack: { libraries: [], frameworks: [] },
  assets: {
    fonts: [],
    images: [],
    videos: [],
    scripts: [],
    stylesheets: [],
    totalTransferKb: 0,
  },
  mergeMeta: {
    structureSource: { url: "a", finalUrl: "a", title: null },
    typographySource: { url: "b", finalUrl: "b", title: null },
    motionSource: { url: "c", finalUrl: "c", title: null },
    paletteSource: { url: "d", finalUrl: "d", title: null },
    reasoning: ["stub for smoke test"],
  },
};

const { siteProject, summary, nextSteps } = assembleSiteProject({
  brief: FIXTURE_BRIEF,
  mergedDna: stubDna,
});

const reparse = SiteProjectSchema.safeParse(siteProject);
if (!reparse.success) {
  console.error("ASSEMBLED SITEPROJECT FAILED RE-VALIDATION:");
  console.error(reparse.error.message);
  process.exit(1);
}

const homePage = siteProject.pages[0];
if (!homePage) {
  console.error("assembled SiteProject has no pages");
  process.exit(1);
}

const lines = [
  "Phase 7 smoke test — assembleSiteProject",
  `  schemaVersion: ${siteProject.schemaVersion}`,
  `  brief industry: ${siteProject.brief.industry}`,
  `  pages: ${siteProject.pages.length}`,
  `  home slug: ${homePage.slug}`,
  `  home title: ${homePage.title}`,
  `  home section types: ${homePage.sections.map((s) => s.type).join(" → ")}`,
  `  globals: header, footer${siteProject.globals.announcementBar ? ", announcement-bar" : ""}`,
  `  summary: ${summary}`,
  `  nextSteps: ${nextSteps.length} step(s)`,
];
console.log(lines.join("\n"));
