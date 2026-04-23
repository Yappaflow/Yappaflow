/**
 * Brief — the structured intake schema shared by classify_brief, search_references,
 * rank_references, and build_site. Keeping it separate from the DNA schema so the
 * two can evolve independently.
 *
 * Moved here from apps/yappaflow-mcp/src/tools/brief.ts as part of the Phase 7
 * builder-first pivot. The MCP's tools/brief.ts re-exports from here so no call
 * site import path changes.
 */

import { z } from "zod";

export const BriefSchema = z.object({
  industry: z.string(),
  subcategory: z.string().optional().default(""),
  audience: z.string().optional().default(""),
  content_model: z.array(z.string()).default([]),
  palette_character: z.string().optional().default(""),
  motion_ambition: z.string().optional().default(""),
  grid_archetype: z
    .enum([
      "asymmetric_editorial",
      "centered_marketing",
      "full_bleed_product",
      "dense_dashboard",
      "split_hero",
      "any",
    ])
    .default("any"),
  named_comparables: z.array(z.string().url()).default([]),
  tone: z.string().optional().default(""),
  preferred_platform: z
    .enum(["html", "shopify", "wordpress", "ikas", "webflow"])
    .default("html"),
});

export type Brief = z.infer<typeof BriefSchema>;

/** A deterministic fallback brief for offline/dev mode. */
export const FIXTURE_BRIEF: Brief = {
  industry: "photography",
  subcategory: "luxury fashion",
  audience: "brand buyers",
  content_model: ["hero", "case_studies", "contact"],
  palette_character: "monochrome tension",
  motion_ambition: "editorial cinema",
  grid_archetype: "asymmetric_editorial",
  named_comparables: [],
  tone: "confident, slow, weighted",
  preferred_platform: "html",
};

/**
 * Flatten a Brief to a single sentence that's useful as an embedding anchor
 * or as context in prompts. Keep it compact so prompt caching stays effective.
 */
export function briefToSentence(b: Brief): string {
  const parts = [
    `A ${b.tone || "clear"} ${b.industry}${b.subcategory ? ` / ${b.subcategory}` : ""} site`,
    b.audience ? `for ${b.audience}` : "",
    b.palette_character ? `with a ${b.palette_character} palette` : "",
    b.motion_ambition ? `and ${b.motion_ambition} motion` : "",
    b.grid_archetype !== "any" ? `on a ${b.grid_archetype.replace(/_/g, " ")} grid` : "",
    b.content_model.length ? `covering ${b.content_model.join(", ")}` : "",
  ];
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim() + ".";
}
