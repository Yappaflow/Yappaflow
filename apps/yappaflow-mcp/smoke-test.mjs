/**
 * End-to-end offline smoke test for the Yappaflow MCP pipeline.
 *
 * Exercises: classify_brief → search_references → rank → merge_dna → build_site(html/shopify/etc.)
 * All in offline mode (no Exa/OpenRouter/Voyage keys) so it can run anywhere.
 */

import { OpenRouterClient } from "./dist/llm/openrouter.js";
import { classifyBrief } from "./dist/tools/classify-brief.js";
import { FIXTURE_BRIEF } from "./dist/tools/brief.js";
import { mergeDna } from "./dist/tools/merge-dna.js";
import { rankReferences } from "./dist/tools/rank.js";
import { buildSite } from "./dist/tools/build-site.js";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SAMPLES_DIR = new URL("./samples", import.meta.url).pathname;

function loadSamples() {
  const files = readdirSync(SAMPLES_DIR).filter(
    (f) => f.endsWith(".json") && !f.startsWith("_") && f !== "VERIFICATION.md",
  );
  return files.map((f) => ({
    url: f.replace(/\.json$/, ""),
    dna: JSON.parse(readFileSync(join(SAMPLES_DIR, f), "utf8")),
  }));
}

const config = {
  port: 7777,
  host: "127.0.0.1",
  auth: { token: "dev" },
  cache: { sqlitePath: ":memory:" },
  offline: true,
  openrouter: { apiKey: "", baseUrl: "", analysisModel: "x", planningModel: "x", generationModel: "x" },
  exa: { apiKey: "", baseUrl: "" },
  voyage: { apiKey: "", baseUrl: "", model: "voyage-3-lite" },
};

const llm = new OpenRouterClient(config);

async function main() {
  console.log("1) classifyBrief (offline)…");
  const classified = await classifyBrief({
    transcript:
      "We make a luxury skincare ecommerce — warm editorial type, calm restrained motion, full-bleed hero on Shopify.",
    llm,
    offline: true,
  });
  console.log("   industry:", classified.industry, "| grid:", classified.grid_archetype);

  console.log("2) loadSamples → rank");
  const samples = loadSamples().map((s) => ({ url: s.url, dna: s.dna }));
  console.log("   samples:", samples.length);
  const ranked = await rankReferences({ brief: classified, references: samples, config });
  console.log("   top-3:", ranked.slice(0, 3).map((r) => `${r.url}[c=${r.conceptScore.toFixed(2)},k=${r.craftScore.toFixed(2)},pr=${r.paretoRank}]`).join(" "));

  console.log("3) mergeDna");
  const top = ranked.slice(0, 4);
  const merged = mergeDna({
    structure_from: top[0]?.dna ?? samples[0].dna,
    typography_from: top[1]?.dna ?? samples[0].dna,
    motion_from: top[2]?.dna ?? samples[0].dna,
    palette_from: top[3]?.dna ?? samples[0].dna,
  });
  console.log("   families:", merged.typography.families.slice(0, 2));
  console.log("   bg/fg/accent:", merged.colors.summary.backgrounds[0], merged.colors.summary.foregrounds[0], merged.colors.summary.accents[0]);

  for (const platform of ["html", "shopify", "wordpress", "ikas", "webflow"]) {
    console.log(`4.${platform}) buildSite`);
    const out = await buildSite({
      brief: classified,
      mergedDna: merged,
      content: { copy: { heading: "Yappaflow test run", subhead: "End-to-end offline pipeline." } },
      platform,
      config,
      llm,
    });
    console.log(`   ${platform}: ${out.files.length} files, summary: ${out.summary}`);
    for (const f of out.files) {
      if (f.content.length === 0) {
        throw new Error(`empty file ${f.path} in ${platform}`);
      }
    }
  }

  console.log("\nSMOKE TEST PASSED");
}

main().catch((e) => {
  console.error("SMOKE TEST FAILED:", e);
  process.exit(1);
});
