/**
 * @yappaflow/sections — the Yappaflow section library.
 *
 * Exports the full SECTIONS registry keyed by SectionType, plus per-section
 * definitions and content types for tree-shakeable deep imports
 * (e.g. `@yappaflow/sections/hero`).
 *
 * Two generations of sections live here:
 *   1. The 10 MVP section types that ship their own Tailwind-styled render
 *      components (header, footer, announcement-bar, hero, feature-grid,
 *      feature-row, product-grid, cta-band, testimonial, rich-text).
 *   2. The 8 Exhibit-backed section types added in Phase 8b that wrap
 *      components from `yappaflow-ui`'s Exhibits layer (faq, pricing,
 *      stats-band, timeline, logo-cloud, team, newsletter, contact).
 *
 * The registry is the single source of truth the rest of the system queries
 * — MCP assembler, builder right rail, builder canvas, CMS adapters-v2.
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
import { faqDefinition } from "./faq/index.js";
import { pricingDefinition } from "./pricing/index.js";
import { statsBandDefinition } from "./stats-band/index.js";
import { timelineDefinition } from "./timeline/index.js";
import { logoCloudDefinition } from "./logo-cloud/index.js";
import { teamDefinition } from "./team/index.js";
import { newsletterDefinition } from "./newsletter/index.js";
import { contactDefinition } from "./contact/index.js";

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
  faq: faqDefinition,
  pricing: pricingDefinition,
  "stats-band": statsBandDefinition,
  timeline: timelineDefinition,
  "logo-cloud": logoCloudDefinition,
  team: teamDefinition,
  newsletter: newsletterDefinition,
  contact: contactDefinition,
} as const satisfies Record<SectionType, SectionDefinition>;

export type SectionsRegistry = typeof SECTIONS;

export function listSections(): Array<SectionDefinition> {
  return Object.values(SECTIONS) as Array<SectionDefinition>;
}

export type { SectionDefinition } from "./internal/define-section.js";
export { defineSection } from "./internal/define-section.js";
export { PlaceholderSection } from "./internal/placeholder.js";

// Per-section re-exports.
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
export { faqDefinition } from "./faq/index.js";
export { pricingDefinition } from "./pricing/index.js";
export { statsBandDefinition } from "./stats-band/index.js";
export { timelineDefinition } from "./timeline/index.js";
export { logoCloudDefinition } from "./logo-cloud/index.js";
export { teamDefinition } from "./team/index.js";
export { newsletterDefinition } from "./newsletter/index.js";
export { contactDefinition } from "./contact/index.js";
