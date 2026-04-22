#!/usr/bin/env node
/**
 * CLI harness for the DNA extractor.
 *
 * Usage:
 *   tsx src/cli.ts --url https://linear.app --out samples
 *   tsx src/cli.ts --from references.json --out samples --concurrency 3
 *   tsx src/cli.ts --url https://x --no-cache
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";
import { extractDesignDnaWithBrowser } from "./extractor.js";
import { DnaCache } from "./cache.js";
import type { DesignDna } from "./types.js";

type CliArgs = {
  urls: string[];
  outDir: string;
  concurrency: number;
  useCache: boolean;
  cachePath: string;
  categories?: Map<string, string>;
  notes?: Map<string, string>;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    urls: [],
    outDir: "samples",
    concurrency: 3,
    useCache: true,
    cachePath: "data/dna-cache.db",
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--url":
        args.urls.push(argv[++i]!);
        break;
      case "--from": {
        const file = argv[++i]!;
        const parsed = JSON.parse(readFileSync(file, "utf8")) as
          | string[]
          | { sites: Array<{ url: string; category?: string; note?: string }> };
        if (Array.isArray(parsed)) {
          args.urls.push(...parsed);
        } else {
          args.categories = new Map();
          args.notes = new Map();
          for (const s of parsed.sites) {
            args.urls.push(s.url);
            if (s.category) args.categories.set(s.url, s.category);
            if (s.note) args.notes.set(s.url, s.note);
          }
        }
        break;
      }
      case "--out":
        args.outDir = argv[++i]!;
        break;
      case "--concurrency":
        args.concurrency = Math.max(1, Number.parseInt(argv[++i]!, 10) || 1);
        break;
      case "--no-cache":
        args.useCache = false;
        break;
      case "--cache":
        args.cachePath = argv[++i]!;
        break;
      case "-h":
      case "--help":
        printHelp();
        process.exit(0);
        break;
      default:
        if (!a?.startsWith("--")) {
          if (a) args.urls.push(a);
        }
    }
  }
  if (args.urls.length === 0) {
    printHelp();
    process.exit(1);
  }
  return args;
}

function printHelp() {
  console.log(`
yappaflow-dna — Phase 0 extractor CLI

Usage:
  --url <URL>             Add a URL (repeatable)
  --from <FILE>           Load URLs from a JSON file (array or { sites: [{url, category, note}] })
  --out <DIR>             Output directory (default: samples)
  --concurrency <N>       Parallel browser contexts (default: 3)
  --no-cache              Skip cache read/write
  --cache <PATH>          Cache path (default: data/dna-cache.db)
  -h, --help              Show help
`);
}

function slugify(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname.replace(/\/+$/g, "").replace(/\//g, "_");
    return (host + (path || "")).replace(/[^a-z0-9_.-]+/gi, "-").toLowerCase();
  } catch {
    return url.replace(/[^a-z0-9_.-]+/gi, "-").toLowerCase();
  }
}

async function main() {
  const args = parseArgs(process.argv);
  mkdirSync(args.outDir, { recursive: true });

  const cache = args.useCache ? new DnaCache(args.cachePath) : null;
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const run: Array<{
    url: string;
    slug: string;
    file: string;
    category?: string;
    note?: string;
    status: "ok" | "cached" | "error";
    error?: string;
    timings?: DesignDna["meta"]["timings"];
    warnings?: string[];
    topFonts?: string[];
    topColors?: string[];
    libraries?: string[];
  }> = [];

  const work = async (url: string) => {
    const slug = slugify(url);
    const file = path.join(args.outDir, `${slug}.json`);
    console.log(`→ ${url}`);
    try {
      if (cache) {
        const hit = cache.get(url);
        if (hit) {
          writeFileSync(file, JSON.stringify(hit.dna, null, 2));
          console.log(`  ✓ cached (${hit.sizeBytes} bytes)`);
          run.push({
            url,
            slug,
            file,
            status: "cached",
            category: args.categories?.get(url),
            note: args.notes?.get(url),
            timings: hit.dna.meta.timings,
            warnings: hit.dna.meta.warnings,
            topFonts: hit.dna.typography.families.slice(0, 3).map((f) => f.family),
            topColors: [
              ...hit.dna.colors.summary.backgrounds.slice(0, 2),
              ...hit.dna.colors.summary.foregrounds.slice(0, 2),
              ...hit.dna.colors.summary.accents.slice(0, 2),
            ],
            libraries: hit.dna.stack.libraries,
          });
          return;
        }
      }
      const dna = await extractDesignDnaWithBrowser(browser, url);
      writeFileSync(file, JSON.stringify(dna, null, 2));
      if (cache) cache.put(url, dna);
      console.log(
        `  ✓ extracted in ${dna.meta.timings.totalMs}ms (${dna.typography.styles.length} type styles, ${dna.colors.palette.length} colors)`,
      );
      run.push({
        url,
        slug,
        file,
        status: "ok",
        category: args.categories?.get(url),
        note: args.notes?.get(url),
        timings: dna.meta.timings,
        warnings: dna.meta.warnings,
        topFonts: dna.typography.families.slice(0, 3).map((f) => f.family),
        topColors: [
          ...dna.colors.summary.backgrounds.slice(0, 2),
          ...dna.colors.summary.foregrounds.slice(0, 2),
          ...dna.colors.summary.accents.slice(0, 2),
        ],
        libraries: dna.stack.libraries,
      });
    } catch (err) {
      const message = (err as Error).message;
      console.log(`  ✗ ${message}`);
      run.push({ url, slug, file, status: "error", error: message });
    }
  };

  // Simple concurrency limiter
  const queue = [...args.urls];
  const workers = Array.from({ length: args.concurrency }, async () => {
    while (queue.length) {
      const next = queue.shift();
      if (!next) return;
      await work(next);
    }
  });
  await Promise.all(workers);

  await browser.close();
  if (cache) cache.close();

  const manifest = {
    generatedAt: new Date().toISOString(),
    count: run.length,
    ok: run.filter((r) => r.status === "ok").length,
    cached: run.filter((r) => r.status === "cached").length,
    error: run.filter((r) => r.status === "error").length,
    items: run,
  };
  writeFileSync(path.join(args.outDir, "_run.json"), JSON.stringify(manifest, null, 2));
  console.log(
    `\nDone. ok=${manifest.ok} cached=${manifest.cached} error=${manifest.error}. Manifest at ${path.join(
      args.outDir,
      "_run.json",
    )}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
