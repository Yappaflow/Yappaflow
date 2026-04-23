/**
 * Regression smoke test for the legacy per-platform dispatcher path. Runs the
 * html adapter in offline mode (no LLM keys needed) and asserts the
 * BuildOutput contract the /rpc/build_site REST route depends on:
 *   { platform, files[], summary, nextSteps[], doctrineUsed }
 *
 * We do NOT exercise shopify here because its offline path may be minimal;
 * html is the canonical adapter and shares the BuildOutput contract. If html
 * still returns the right shape, the Shopify live path isn't regressed by
 * Phase 7's type re-exports.
 */

import { buildSite } from "../src/tools/build-site.js";
import { FIXTURE_BRIEF, type MergedDna } from "@yappaflow/types";
import { OpenRouterClient } from "../src/llm/openrouter.js";

const offlineLlm = new OpenRouterClient({ apiKey: "" }, true);

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
    summary: { backgrounds: ["#0b0b0b"], foregrounds: ["#f6f5f2"], accents: ["#d4af37"] },
  },
  motion: {
    keyframes: [],
    transitions: [],
    runtimeAnimations: [],
    scrollHints: [],
  },
  grid: {
    containers: [],
    rhythm: { maxWidth: "1200px", padding: "24px", gap: "24px" },
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
    reasoning: ["stub for legacy smoke test"],
  },
};

const result = await buildSite({
  brief: FIXTURE_BRIEF,
  mergedDna: stubDna,
  platform: "html",
  config: { offlineMode: true } as never,
  llm: offlineLlm,
});

const fail = (msg: string): never => {
  console.error(`LEGACY REGRESSION: ${msg}`);
  process.exit(1);
};

if (result.platform !== "html") fail(`platform mismatch: ${result.platform}`);
if (!Array.isArray(result.files) || result.files.length === 0) fail("files[] empty");
if (typeof result.summary !== "string") fail("summary missing");
if (!Array.isArray(result.nextSteps)) fail("nextSteps missing");
if (typeof result.doctrineUsed !== "string") fail("doctrineUsed missing");

console.log(
  `legacy path OK — platform=${result.platform}, files=${result.files.length}, ` +
    `paths=${result.files.map((f) => f.path).join(", ")}`,
);
