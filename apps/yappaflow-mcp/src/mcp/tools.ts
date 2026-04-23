/**
 * Tool registry. Each tool is one phase's public API.
 *
 * Keeping them in one place is deliberate: the MCP surface stays small and readable,
 * and future phases can compose tools (e.g. build_site can invoke merge_dna internally).
 */

import { z } from "zod";
import type { Config } from "../config.js";
import type { DnaCache } from "../cache.js";
import { extractDesignDnaWithBrowser } from "../extractor.js";
import { getBrowser } from "../browser.js";
import { OpenRouterClient } from "../llm/openrouter.js";
import { searchReferences } from "../tools/search-references.js";
import { classifyBrief } from "../tools/classify-brief.js";
import { rankReferences } from "../tools/rank.js";
import { mergeDna } from "../tools/merge-dna.js";
import {
  buildSite,
  PLATFORMS,
  assembleSiteProject,
  AssembleSiteProjectArgsSchema,
} from "../tools/build-site.js";

export type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
};

export function buildToolRegistry(config: Config, cache: DnaCache) {
  const llm = new OpenRouterClient(config.openrouter, config.offlineMode);
  const tools = new Map<string, Tool>();

  const extractArgs = z.object({
    url: z.string().url(),
    forceRefresh: z.boolean().optional().default(false),
  });
  tools.set("extract_design_dna", {
    name: "extract_design_dna",
    description:
      "Load a URL with Playwright, scroll, and return structured Design DNA (typography, colors, motion, grid, stack, assets). Cached in SQLite.",
    inputSchema: {
      type: "object",
      required: ["url"],
      properties: {
        url: { type: "string", description: "URL to analyze" },
        forceRefresh: { type: "boolean", description: "Bypass cache", default: false },
      },
    },
    handler: async (args) => {
      const { url, forceRefresh } = extractArgs.parse(args);
      if (!forceRefresh) {
        const cached = cache.get(url);
        if (cached) return cached.dna;
      }
      const browser = await getBrowser();
      const dna = await extractDesignDnaWithBrowser(browser, url);
      cache.put(url, dna);
      return dna;
    },
  });

  const searchArgs = z.object({
    brief: z.object({}).passthrough(),
    k: z.number().int().min(1).max(20).optional().default(8),
  });
  tools.set("search_references", {
    name: "search_references",
    description:
      "Find design references for a brief. Runs 5 semantic queries (3 concept, 2 craft) via Exa, resolves outbound URLs on Awwwards-style galleries, extracts DNA in parallel, returns up to k ranked references.",
    inputSchema: {
      type: "object",
      required: ["brief"],
      properties: {
        brief: { type: "object", description: "Brief JSON from classify_brief" },
        k: { type: "integer", minimum: 1, maximum: 20, default: 8 },
      },
    },
    handler: async (args) => {
      const { brief, k } = searchArgs.parse(args);
      return searchReferences({
        brief: brief as Parameters<typeof searchReferences>[0]["brief"],
        k,
        config,
        cache,
        llm,
      });
    },
  });

  const classifyArgs = z.object({
    transcript: z.string().min(1),
  });
  tools.set("classify_brief", {
    name: "classify_brief",
    description:
      "Convert a free-form agency conversation into a structured Brief JSON (industry, content model, palette character, motion ambition, grid archetype, named comparables, tone).",
    inputSchema: {
      type: "object",
      required: ["transcript"],
      properties: {
        transcript: { type: "string", description: "Conversation transcript or intake notes" },
      },
    },
    handler: async (args) => {
      const { transcript } = classifyArgs.parse(args);
      return classifyBrief({ transcript, llm, offline: config.offlineMode });
    },
  });

  const rankArgs = z.object({
    brief: z.object({}).passthrough(),
    references: z.array(
      z.object({
        url: z.string().url(),
        dna: z.object({}).passthrough(),
      }),
    ),
  });
  tools.set("rank_references", {
    name: "rank_references",
    description:
      "Score candidate references on concept fit and craft fit, return Pareto-ranked list. Uses Voyage embeddings when VOYAGE_API_KEY is set; otherwise deterministic token-overlap.",
    inputSchema: {
      type: "object",
      required: ["brief", "references"],
      properties: {
        brief: { type: "object" },
        references: {
          type: "array",
          items: { type: "object", required: ["url", "dna"], properties: { url: { type: "string" }, dna: { type: "object" } } },
        },
      },
    },
    handler: async (args) => {
      const parsed = rankArgs.parse(args);
      return rankReferences({
        brief: parsed.brief as Parameters<typeof rankReferences>[0]["brief"],
        references: parsed.references as Parameters<typeof rankReferences>[0]["references"],
        config,
      });
    },
  });

  const mergeArgs = z.object({
    blend: z.object({
      structure_from: z.object({}).passthrough(),
      typography_from: z.object({}).passthrough(),
      motion_from: z.object({}).passthrough(),
      palette_from: z.object({}).passthrough(),
    }),
    weights: z
      .object({
        structure: z.number().min(0).max(1).optional(),
        typography: z.number().min(0).max(1).optional(),
        motion: z.number().min(0).max(1).optional(),
        palette: z.number().min(0).max(1).optional(),
      })
      .optional(),
  });
  tools.set("merge_dna", {
    name: "merge_dna",
    description:
      "Blend up to four source DNAs by field ownership: structure / typography / motion / palette. Returns MergedDNA — the input for build_site.",
    inputSchema: {
      type: "object",
      required: ["blend"],
      properties: {
        blend: {
          type: "object",
          required: ["structure_from", "typography_from", "motion_from", "palette_from"],
          properties: {
            structure_from: { type: "object" },
            typography_from: { type: "object" },
            motion_from: { type: "object" },
            palette_from: { type: "object" },
          },
        },
        weights: { type: "object" },
      },
    },
    handler: async (args) => {
      const parsed = mergeArgs.parse(args);
      return mergeDna(parsed.blend as Parameters<typeof mergeDna>[0], parsed.weights);
    },
  });

  const buildArgs = z.object({
    brief: z.object({}).passthrough(),
    mergedDna: z.object({}).passthrough(),
    content: z.object({}).passthrough().optional(),
    platform: z.enum(PLATFORMS),
  });
  tools.set("build_site", {
    name: "build_site",
    description:
      "Generate a site for the chosen platform (html / shopify / wordpress / ikas / webflow) given a brief, a MergedDNA, and optional content blocks. LEGACY — per the Phase 7 builder-first pivot, new flows should prefer build_site_project and let the in-house builder + adapters-v2 handle CMS conversion. This tool stays live because the current Shopify REST path depends on it.",
    inputSchema: {
      type: "object",
      required: ["brief", "mergedDna", "platform"],
      properties: {
        brief: { type: "object" },
        mergedDna: { type: "object" },
        content: { type: "object" },
        platform: { type: "string", enum: [...PLATFORMS] },
      },
    },
    handler: async (args) => {
      const parsed = buildArgs.parse(args);
      return buildSite({
        brief: parsed.brief as Parameters<typeof buildSite>[0]["brief"],
        mergedDna: parsed.mergedDna as Parameters<typeof buildSite>[0]["mergedDna"],
        content: parsed.content as Parameters<typeof buildSite>[0]["content"],
        platform: parsed.platform,
        config,
        llm,
      });
    },
  });

  // Phase 7 (builder-first pivot) — canonical SiteProject assembly. Output is
  // JSON data, not platform files. The in-house builder (Phase 8) loads it;
  // adapters-v2 (Phase 10+) convert it to CMS files deterministically. Until
  // adapters-v2 ships we keep build_site live for the Shopify REST path.
  tools.set("build_site_project", {
    name: "build_site_project",
    description:
      "Assemble a canonical SiteProject (JSON tree of typed sections) from a brief + MergedDNA. Returns { siteProject, summary, nextSteps } — no CMS files. This is the Phase 7 entry point for the builder-first pipeline.",
    inputSchema: {
      type: "object",
      required: ["brief", "mergedDna"],
      properties: {
        brief: { type: "object" },
        mergedDna: { type: "object" },
        overrides: {
          type: "object",
          properties: {
            siteTitle: { type: "string" },
            logoText: { type: "string" },
          },
        },
      },
    },
    handler: async (args) => {
      const parsed = AssembleSiteProjectArgsSchema.parse(args);
      return assembleSiteProject({
        brief: parsed.brief as Parameters<typeof assembleSiteProject>[0]["brief"],
        mergedDna: parsed.mergedDna as Parameters<
          typeof assembleSiteProject
        >[0]["mergedDna"],
        overrides: parsed.overrides,
      });
    },
  });

  return {
    list(): Tool[] {
      return Array.from(tools.values());
    },
    get(name: string): Tool | undefined {
      return tools.get(name);
    },
    toolNames(): string[] {
      return Array.from(tools.keys());
    },
  };
}
