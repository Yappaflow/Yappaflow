/**
 * @yappaflow/sections — the Yappaflow section library.
 *
 * Exports the full SECTIONS registry keyed by SectionType, plus per-section
 * definitions and content types for tree-shakeable deep imports
 * (e.g. `@yappaflow/sections/hero`).
 *
 * The registry is the single source of truth the rest of the system queries:
 *
 *   - MCP assembler: `SECTIONS[type].defaultContent` + `.defaultVariant` when
 *     seeding a SiteProject.
 *   - Builder right rail: `.variants` drives the variant dropdown;
 *     `.contentSchema` drives per-field property controls.
 *   - Builder canvas: `.Component` renders the section in the iframe.
 *   - CMS adapters-v2 (Phase 10+): per-adapter mappers key off the same
 *     section type and consume the same schema.
 */

import type { SectionType } from "@yappaflow/types";
import type { SectionDefinition } from "./internal/define-section.js";

import { headerDefinition } from "./header/index.js";
import { footerDefinition } from "./footer/index.js";
import { announcementBarDefinition } from "./announcement-bar/index.js";
import { heroDefinition } from "./hero/index.js";
import { featureGridDefinition } from "./feature-grid/index.js";
import { featureRowDefinition } from "./feature-row/index.js";
import { productGridDefinition } from "./product-grid/index.js";
import { ctaBandDefinition } from "./cta-band/index.js";
import { testimonialDefinition } from "./testimonial/index.js";
import { richTextDefinition } from "./rich-text/index.js";

/**
 * The registry. Keys are exhaustive over SectionType — TypeScript will fail
 * compilation if a new section type is added to @yappaflow/types without a
 * matching entry here (see the `Record<SectionType, ...>` constraint).
 */
export const SECTIONS = {
  header: headerDefinition,
  footer: footerDefinition,
  "announcement-bar": announcementBarDefinition,
  hero: heroDefinition,
  "feature-grid": featureGridDefinition,
  "feature-row": featureRowDefinition,
  "product-grid": productGridDefinition,
  "cta-band": ctaBandDefinition,
  testimonial: testimonialDefinition,
  "rich-text": richTextDefinition,
} as const satisfies Record<SectionType, SectionDefinition>;

/** Strongly typed lookup: SECTIONS[type] yields the exact per-type definition. */
export type SectionsRegistry = typeof SECTIONS;

/** Convenience iterable over every (type, definition) pair. */
export function listSections(): Array<SectionDefinition> {
  return Object.values(SECTIONS) as Array<SectionDefinition>;
}

export type { SectionDefinition } from "./internal/define-section.js";
export { defineSection } from "./internal/define-section.js";
export { PlaceholderSection } from "./internal/placeholder.js";

// Per-section re-exports for consumers that want a single type's content
// schema without pulling the whole registry into their bundle.
export { headerDefinition } from "./header/index.js";
export { footerDefinition } from "./footer/index.js";
export { announcementBarDefinition } from "./announcement-bar/index.js";
export { heroDefinition } from "./hero/index.js";
export { featureGridDefinition } from "./feature-grid/index.js";
export { featureRowDefinition } from "./feature-row/index.js";
export { productGridDefinition } from "./product-grid/index.js";
export { ctaBandDefinition } from "./cta-band/index.js";
export { testimonialDefinition } from "./testimonial/index.js";
export { richTextDefinition } from "./rich-text/index.js";
