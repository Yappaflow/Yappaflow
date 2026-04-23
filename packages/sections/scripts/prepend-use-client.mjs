#!/usr/bin/env node
/**
 * Post-build banner script.
 *
 * tsc strips the "use client" directive when it emits JS (it treats it as a
 * comment). Next.js's RSC compiler needs the directive at the top of the
 * imported JS module for hook/context usage to cross the server→client
 * boundary. We re-attach it for every section's built entry.
 *
 * Keeping the list here in lockstep with the SECTION_ENTRIES in src/index.ts.
 * The barrel (dist/index.js) and the data entry (dist/data.js) intentionally
 * stay directive-free — Node-only consumers (MCP, adapters-v2) import those,
 * and adding a "use client" to a Node module does nothing useful but may
 * confuse downstream tooling that inspects the first line.
 */

import { readFile, writeFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const distRoot = resolve(here, "..", "dist");

const SECTION_ENTRIES = [
  "header",
  "footer",
  "announcement-bar",
  "hero",
  "feature-grid",
  "feature-row",
  "product-grid",
  "cta-band",
  "testimonial",
  "rich-text",
  // Phase 8b — Exhibit-backed sections
  "faq",
  "pricing",
  "stats-band",
  "timeline",
  "logo-cloud",
  "team",
  "newsletter",
  "contact",
];

async function prependUseClient(path) {
  try {
    await stat(path);
  } catch {
    console.warn(`[use-client] missing build output: ${path}`);
    return;
  }
  const source = await readFile(path, "utf8");
  if (source.startsWith('"use client"') || source.startsWith("'use client'")) {
    return;
  }
  await writeFile(path, `"use client";\n${source}`);
}

for (const section of SECTION_ENTRIES) {
  await prependUseClient(resolve(distRoot, section, "index.js"));
}

console.log(`[use-client] prepended on ${SECTION_ENTRIES.length} section entries`);
