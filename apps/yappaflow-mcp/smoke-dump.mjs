import { OpenRouterClient } from "./dist/llm/openrouter.js";
import { classifyBrief } from "./dist/tools/classify-brief.js";
import { mergeDna } from "./dist/tools/merge-dna.js";
import { rankReferences } from "./dist/tools/rank.js";
import { buildSite } from "./dist/tools/build-site.js";
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SAMPLES_DIR = new URL("./samples", import.meta.url).pathname;
const OUT_DIR = new URL("./smoke-output", import.meta.url).pathname;

function loadSamples() {
  return readdirSync(SAMPLES_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_") && f !== "VERIFICATION.md")
    .map((f) => ({ url: f.replace(/\.json$/, ""), dna: JSON.parse(readFileSync(join(SAMPLES_DIR, f), "utf8")) }));
}

const config = {
  port: 7777, host: "127.0.0.1",
  auth: { token: "dev" },
  cache: { sqlitePath: ":memory:" },
  offline: true,
  openrouter: { apiKey: "", baseUrl: "", analysisModel: "x", planningModel: "x", generationModel: "x" },
  exa: { apiKey: "", baseUrl: "" },
  voyage: { apiKey: "", baseUrl: "", model: "voyage-3-lite" },
};

const llm = new OpenRouterClient(config);

const classified = await classifyBrief({ transcript: "Luxury skincare ecommerce with editorial hero.", llm, offline: true });
const samples = loadSamples();
const ranked = await rankReferences({ brief: classified, references: samples, config });
const top = ranked.slice(0, 4);
const merged = mergeDna({
  structure_from: top[0].dna,
  typography_from: top[1].dna,
  motion_from: top[2].dna,
  palette_from: top[3].dna,
});

mkdirSync(OUT_DIR, { recursive: true });
for (const platform of ["html", "shopify", "wordpress", "ikas", "webflow"]) {
  const out = await buildSite({ brief: classified, mergedDna: merged, platform, config, llm });
  for (const f of out.files) {
    const p = join(OUT_DIR, platform, f.path);
    mkdirSync(join(p, ".."), { recursive: true });
    writeFileSync(p, f.content);
  }
  console.log(platform, "→", out.files.length, "files");
}
