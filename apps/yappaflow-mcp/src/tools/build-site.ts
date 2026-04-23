/**
 * build_site — two paths in one file as of the Phase 7 builder-first pivot:
 *
 *   (1) Legacy per-platform dispatcher: `buildSite(params)` routes to the
 *       html / shopify / wordpress / ikas / webflow adapter a given brief
 *       requested. Output is `BuildOutput` (platform-file tree). This path
 *       is LIVE in production — the current Shopify flow at
 *       /rpc/build_site platform:"shopify" depends on it. Do not break it
 *       while the adapters-v2 replacement is being built in Phase 10.
 *
 *   (2) Builder-first SiteProject assembler: `assembleSiteProject(params)`
 *       returns a canonical `SiteProject` JSON — a tree of typed sections,
 *       not platform files. This is the seed payload the in-house builder
 *       (Phase 8) loads, edits, and hands to adapters-v2 (Phase 10) for
 *       deterministic CMS conversion. Phase 7 ships a pragmatic version:
 *       the assembler uses the default content baked into @yappaflow/sections
 *       to stand up a complete site structure. Phase 9 replaces the content
 *       step with an LLM generation pass once the rest of the plumbing is in
 *       place.
 */

import { z } from "zod";
import type { Config } from "../config.js";
import type { OpenRouterClient } from "../llm/openrouter.js";
import type { Brief } from "./brief.js";
import type { MergedDna } from "./merge-dna.js";
import { buildHtml } from "../adapters/html/index.js";
import { buildShopify } from "../adapters/shopify/index.js";
import { buildWordpress } from "../adapters/wordpress/index.js";
import { buildIkas } from "../adapters/ikas/index.js";
import { buildWebflow } from "../adapters/webflow/index.js";
import {
  SITE_PROJECT_SCHEMA_VERSION,
  SectionSchema,
  SiteProjectSchema,
  type Section,
  type SectionType,
  type SiteProject,
} from "@yappaflow/types";
import { SECTION_DATA } from "@yappaflow/sections/data";

// ─────────────────────────────────────────────────────────────────────────────
// Path (1) — legacy per-platform dispatcher. Unchanged by the pivot.
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Path (2) — builder-first SiteProject assembler. New in Phase 7.
// ─────────────────────────────────────────────────────────────────────────────

export type AssembleSiteProjectOutput = {
  siteProject: SiteProject;
  summary: string;
  nextSteps: string[];
};

export type AssembleSiteProjectInput = {
  brief: Brief;
  mergedDna: MergedDna;
  /**
   * Optional overrides. Phase 7 only honours the simplest ones (site title,
   * header logo text); Phase 9 will expand this into an LLM-generated
   * content pack that slots into each section's default.
   */
  overrides?: {
    siteTitle?: string;
    logoText?: string;
  };
};

/**
 * Build a complete SiteProject seeded with the default content baked into
 * @yappaflow/sections. No LLM in this path — it's the mechanical "stand up
 * the structure" step. The builder (Phase 8) will let the agency edit it;
 * the content generation pass (Phase 9) will replace the placeholder text
 * before the builder sees it.
 *
 * Section order on the home page follows a typical marketing-site flow:
 *   announcement-bar (global) → header (global) → hero → feature-grid
 *   → feature-row → testimonial → cta-band → footer (global).
 *
 * E-commerce briefs (detected by `content_model` including "products" or
 * "shop") get a product-grid inserted after the first feature row.
 */
export function assembleSiteProject(
  input: AssembleSiteProjectInput,
): AssembleSiteProjectOutput {
  const { brief, mergedDna, overrides } = input;
  const idGen = createIdGenerator();

  const isCommerce = brief.content_model.some((tag) =>
    /(products?|shop|store|commerce)/i.test(tag),
  );

  // Globals — every site gets a header, footer, and (unless suppressed) an
  // announcement bar. If the agency deletes it in the builder, that's fine;
  // Phase 7's job is to put every section on the canvas so nothing's hidden.
  const header = buildSection("header", idGen(), {
    logo: { text: overrides?.logoText ?? deriveLogoText(brief, overrides?.siteTitle) },
  });
  const footer = buildSection("footer", idGen());
  const announcementBar = buildSection("announcement-bar", idGen());

  // Home page sections.
  const homeSections: Section[] = [
    buildSection("hero", idGen(), seedHeroFromBrief(brief)),
    buildSection("feature-grid", idGen()),
    buildSection("feature-row", idGen()),
    ...(isCommerce ? [buildSection("product-grid", idGen())] : []),
    buildSection("testimonial", idGen()),
    buildSection("cta-band", idGen()),
  ];

  const siteProject: SiteProject = {
    schemaVersion: SITE_PROJECT_SCHEMA_VERSION,
    brief,
    dna: mergedDna,
    pages: [
      {
        id: idGen(),
        slug: "/",
        title: overrides?.siteTitle ?? deriveSiteTitle(brief),
        seo: {
          description: brief.tone
            ? `${brief.industry} — ${brief.tone}.`
            : `${brief.industry} site.`,
        },
        sections: homeSections,
      },
    ],
    globals: {
      header,
      footer,
      announcementBar,
    },
  };

  // Cheap self-check: fail loudly if assembly produced an invalid SiteProject,
  // so callers never see a half-baked tree. Zod's error message points at the
  // exact path; in Phase 8 the builder will do the same check on load.
  const parsed = SiteProjectSchema.safeParse(siteProject);
  if (!parsed.success) {
    throw new Error(
      `assembleSiteProject produced an invalid SiteProject: ${parsed.error.message}`,
    );
  }

  return {
    siteProject,
    summary: `Assembled a ${homeSections.length}-section home page with ${
      announcementBar ? "three globals" : "two globals"
    } (header${announcementBar ? ", announcement bar" : ""}, footer). Open in the builder to edit.`,
    nextSteps: [
      "Load this SiteProject into the in-house builder (apps/builder) to let the agency edit sections, text, and media.",
      "Phase 10: run adapters-v2 to convert the edited SiteProject into CMS files (Shopify first).",
      "Phase 11: bind animation presets per section; the runtime attaches via data-yf-anim on export.",
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — section construction + content seeding.
// ─────────────────────────────────────────────────────────────────────────────

function createIdGenerator(): () => string {
  let counter = 0;
  return () => `sec_${(++counter).toString(36)}`;
}

/**
 * Build a Section of the given type with the library's default content
 * shallow-merged with the supplied overrides. Zod parses the result with
 * schema defaults applied so the returned Section is guaranteed valid under
 * the top-level SectionSchema.
 */
function buildSection<T extends SectionType>(
  type: T,
  id: string,
  contentOverrides: Partial<Record<string, unknown>> = {},
): Section {
  const data = SECTION_DATA[type];
  const mergedContent = { ...data.defaultContent, ...contentOverrides };
  const candidate = {
    id,
    type,
    variant: data.defaultVariant,
    content: mergedContent,
    style: {},
  };
  const parsed = SectionSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error(
      `buildSection("${type}") produced an invalid Section: ${parsed.error.message}`,
    );
  }
  return parsed.data;
}

function deriveLogoText(brief: Brief, siteTitle: string | undefined): string {
  if (siteTitle && siteTitle.trim()) return siteTitle.trim();
  // Two-word industry → initials; single word → capitalised first 6 chars.
  const words = brief.industry.trim().split(/\s+/);
  if (words.length >= 2) {
    return words.map((w) => w[0]?.toUpperCase() ?? "").join("");
  }
  const first = words[0] ?? "Studio";
  return first.charAt(0).toUpperCase() + first.slice(1, 8).toLowerCase();
}

function deriveSiteTitle(brief: Brief): string {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const industry = cap(brief.industry);
  if (brief.subcategory) return `${industry} · ${cap(brief.subcategory)}`;
  return industry;
}

/**
 * Seed the hero with a heading/subhead shaped from the brief. Placeholder-
 * quality copy — it beats the library default when we know the brief context.
 * Phase 9 replaces this with real LLM-generated variants.
 */
function seedHeroFromBrief(brief: Brief): Record<string, unknown> {
  const headingBits: string[] = [];
  if (brief.tone) headingBits.push(brief.tone);
  headingBits.push(brief.industry);
  if (brief.audience) headingBits.push(`for ${brief.audience}`);
  const heading =
    headingBits
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^./, (c) => c.toUpperCase()) || "A site built for outcomes.";

  const subhead = brief.palette_character
    ? `A ${brief.palette_character} take on a ${brief.industry} site.`
    : "";

  return { heading, subhead };
}

// ─────────────────────────────────────────────────────────────────────────────
// MCP tool input schema — re-exported for tools.ts to mount the RPC.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Input schema for the `build_site_project` MCP tool. `brief` and `mergedDna`
 * are passed through as unknown objects; they are typed by the caller (the
 * server already validates them with their own schemas).
 */
export const AssembleSiteProjectArgsSchema = z.object({
  brief: z.object({}).passthrough(),
  mergedDna: z.object({}).passthrough(),
  overrides: z
    .object({
      siteTitle: z.string().optional(),
      logoText: z.string().optional(),
    })
    .optional(),
});

export type AssembleSiteProjectArgs = z.infer<typeof AssembleSiteProjectArgsSchema>;
