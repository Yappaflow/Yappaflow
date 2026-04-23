/**
 * MCP-local type surface.
 *
 * As of Phase 7 (2026-04-23 builder-first pivot), the canonical DesignDna and
 * its nested types live in `@yappaflow/types` so the builder app, the section
 * library, and the CMS adapters-v2 can share them without depending on this
 * MCP app. This file re-exports the shared types unchanged, and keeps only the
 * MCP-specific extractor tuning knobs (ExtractorOptions, DEFAULT_OPTIONS) local
 * — those describe the Playwright extractor, not the data it produces.
 *
 * Import paths from the rest of the MCP (`../types.js`, `../../types.js`) are
 * unchanged by design; the declaration moved, the import surface did not.
 */

export type {
  DesignDna,
  TypographyStyle,
  ColorRole,
  MergedDna,
} from "@yappaflow/types";

export type ExtractorOptions = {
  viewport?: { width: number; height: number };
  navigationTimeoutMs?: number;
  scrollPasses?: number;
  userAgent?: string;
  includeRuntimeAnimations?: boolean;
};

export const DEFAULT_OPTIONS: Required<ExtractorOptions> = {
  viewport: { width: 1440, height: 900 },
  navigationTimeoutMs: 25_000,
  scrollPasses: 3,
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 YappaflowDNA/0.0.1",
  includeRuntimeAnimations: true,
};
