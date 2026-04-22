/**
 * build_site — dispatcher. Given brief + merged DNA + content + platform, route to the
 * single adapter the agency requested. We deliberately do NOT generate all platforms for
 * one site — that's a product decision in the plan.
 */

import type { Config } from "../config.js";
import type { OpenRouterClient } from "../llm/openrouter.js";
import type { Brief } from "./brief.js";
import type { MergedDna } from "./merge-dna.js";
import { buildHtml } from "../adapters/html/index.js";
import { buildShopify } from "../adapters/shopify/index.js";
import { buildWordpress } from "../adapters/wordpress/index.js";
import { buildIkas } from "../adapters/ikas/index.js";
import { buildWebflow } from "../adapters/webflow/index.js";

export const PLATFORMS = ["html", "shopify", "wordpress", "ikas", "webflow"] as const;
export type Platform = (typeof PLATFORMS)[number];

export type ContentBlocks = Record<string, unknown> & {
  copy?: { heading?: string; subhead?: string; sections?: Array<{ title: string; body: string }> };
  images?: Array<{ url: string; alt?: string }>;
};

export type BuildOutput = {
  platform: Platform;
  files: Array<{ path: string; content: string }>;
  summary: string;
  nextSteps: string[];
  doctrineUsed: string;
};

export async function buildSite(params: {
  brief: Brief;
  mergedDna: MergedDna;
  content?: ContentBlocks;
  platform: Platform;
  config: Config;
  llm: OpenRouterClient;
}): Promise<BuildOutput> {
  const { platform } = params;
  switch (platform) {
    case "html":
      return buildHtml(params);
    case "shopify":
      return buildShopify(params);
    case "wordpress":
      return buildWordpress(params);
    case "ikas":
      return buildIkas(params);
    case "webflow":
      return buildWebflow(params);
    default: {
      const _exhaustive: never = platform;
      throw new Error(`unknown platform: ${String(_exhaustive)}`);
    }
  }
}
