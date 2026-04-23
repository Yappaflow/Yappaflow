/**
 * @yappaflow/sections/data — the React-free data surface of the section library.
 *
 * The MCP (Node-only, no React runtime) needs access to section schemas,
 * default content, and variant lists so it can assemble a SiteProject. It
 * does NOT need to render anything. Importing the barrel (`@yappaflow/sections`)
 * would pull in render.tsx files and transitively require `react` at runtime,
 * which the MCP doesn't install.
 *
 * This entry re-exports only the data-side of each section definition —
 * contentSchema, defaultContent, variants, defaultVariant — by importing
 * directly from each section's `schema.ts`, `default.ts`, `variants.ts`.
 * Those files have zero React imports, so this bundle is safe to load in any
 * ESM-capable Node process.
 */

import type { SectionType } from "@yappaflow/types";
import type { z } from "zod";

/**
 * Loose Zod schema constraint. Same reasoning as internal/define-section.ts:
 * when a schema uses `.default()`, its input and output types diverge, and
 * the narrow `ZodType<TContent>` constraint would reject it. We only care
 * about parsed-output compatibility here.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySchema<TOutput> = z.ZodType<TOutput, z.ZodTypeDef, any>;

// Existing 10 MVP section types.
import { HeaderContentSchema } from "./header/schema.js";
import { DEFAULT_HEADER_CONTENT } from "./header/default.js";
import { HEADER_VARIANTS, DEFAULT_HEADER_VARIANT } from "./header/variants.js";

import { FooterContentSchema } from "./footer/schema.js";
import { DEFAULT_FOOTER_CONTENT } from "./footer/default.js";
import { FOOTER_VARIANTS, DEFAULT_FOOTER_VARIANT } from "./footer/variants.js";

import { AnnouncementBarContentSchema } from "./announcement-bar/schema.js";
import { DEFAULT_ANNOUNCEMENT_BAR_CONTENT } from "./announcement-bar/default.js";
import {
  ANNOUNCEMENT_BAR_VARIANTS,
  DEFAULT_ANNOUNCEMENT_BAR_VARIANT,
} from "./announcement-bar/variants.js";

import { HeroContentSchema } from "./hero/schema.js";
import { DEFAULT_HERO_CONTENT } from "./hero/default.js";
import { HERO_VARIANTS, DEFAULT_HERO_VARIANT } from "./hero/variants.js";

import { FeatureGridContentSchema } from "./feature-grid/schema.js";
import { DEFAULT_FEATURE_GRID_CONTENT } from "./feature-grid/default.js";
import {
  FEATURE_GRID_VARIANTS,
  DEFAULT_FEATURE_GRID_VARIANT,
} from "./feature-grid/variants.js";

import { FeatureRowContentSchema } from "./feature-row/schema.js";
import { DEFAULT_FEATURE_ROW_CONTENT } from "./feature-row/default.js";
import {
  FEATURE_ROW_VARIANTS,
  DEFAULT_FEATURE_ROW_VARIANT,
} from "./feature-row/variants.js";

import { ProductGridContentSchema } from "./product-grid/schema.js";
import { DEFAULT_PRODUCT_GRID_CONTENT } from "./product-grid/default.js";
import {
  PRODUCT_GRID_VARIANTS,
  DEFAULT_PRODUCT_GRID_VARIANT,
} from "./product-grid/variants.js";

import { CtaBandContentSchema } from "./cta-band/schema.js";
import { DEFAULT_CTA_BAND_CONTENT } from "./cta-band/default.js";
import {
  CTA_BAND_VARIANTS,
  DEFAULT_CTA_BAND_VARIANT,
} from "./cta-band/variants.js";

import { TestimonialContentSchema } from "./testimonial/schema.js";
import { DEFAULT_TESTIMONIAL_CONTENT } from "./testimonial/default.js";
import {
  TESTIMONIAL_VARIANTS,
  DEFAULT_TESTIMONIAL_VARIANT,
} from "./testimonial/variants.js";

import { RichTextContentSchema } from "./rich-text/schema.js";
import { DEFAULT_RICH_TEXT_CONTENT } from "./rich-text/default.js";
import {
  RICH_TEXT_VARIANTS,
  DEFAULT_RICH_TEXT_VARIANT,
} from "./rich-text/variants.js";

// Phase 8b — Exhibit-backed section types.
import { FAQContentSchema } from "./faq/schema.js";
import { DEFAULT_FAQ_CONTENT } from "./faq/default.js";
import { FAQ_VARIANTS, DEFAULT_FAQ_VARIANT } from "./faq/variants.js";

import { PricingContentSchema } from "./pricing/schema.js";
import { DEFAULT_PRICING_CONTENT } from "./pricing/default.js";
import { PRICING_VARIANTS, DEFAULT_PRICING_VARIANT } from "./pricing/variants.js";

import { StatsBandContentSchema } from "./stats-band/schema.js";
import { DEFAULT_STATS_BAND_CONTENT } from "./stats-band/default.js";
import {
  STATS_BAND_VARIANTS,
  DEFAULT_STATS_BAND_VARIANT,
} from "./stats-band/variants.js";

import { TimelineContentSchema } from "./timeline/schema.js";
import { DEFAULT_TIMELINE_CONTENT } from "./timeline/default.js";
import {
  TIMELINE_VARIANTS,
  DEFAULT_TIMELINE_VARIANT,
} from "./timeline/variants.js";

import { LogoCloudContentSchema } from "./logo-cloud/schema.js";
import { DEFAULT_LOGO_CLOUD_CONTENT } from "./logo-cloud/default.js";
import {
  LOGO_CLOUD_VARIANTS,
  DEFAULT_LOGO_CLOUD_VARIANT,
} from "./logo-cloud/variants.js";

import { TeamContentSchema } from "./team/schema.js";
import { DEFAULT_TEAM_CONTENT } from "./team/default.js";
import { TEAM_VARIANTS, DEFAULT_TEAM_VARIANT } from "./team/variants.js";

import { NewsletterContentSchema } from "./newsletter/schema.js";
import { DEFAULT_NEWSLETTER_CONTENT } from "./newsletter/default.js";
import {
  NEWSLETTER_VARIANTS,
  DEFAULT_NEWSLETTER_VARIANT,
} from "./newsletter/variants.js";

import { ContactContentSchema } from "./contact/schema.js";
import { DEFAULT_CONTACT_CONTENT } from "./contact/default.js";
import { CONTACT_VARIANTS, DEFAULT_CONTACT_VARIANT } from "./contact/variants.js";

import { ProductDetailContentSchema } from "./product-detail/schema.js";
import { DEFAULT_PRODUCT_DETAIL_CONTENT } from "./product-detail/default.js";
import {
  PRODUCT_DETAIL_VARIANTS,
  DEFAULT_PRODUCT_DETAIL_VARIANT,
} from "./product-detail/variants.js";

export interface SectionData<
  TType extends SectionType = SectionType,
  TContent = unknown,
  TVariant extends string = string,
> {
  type: TType;
  contentSchema: AnySchema<TContent>;
  variants: readonly TVariant[];
  defaultVariant: TVariant;
  defaultContent: TContent;
}

export const SECTION_DATA = {
  header: {
    type: "header",
    contentSchema: HeaderContentSchema,
    variants: HEADER_VARIANTS,
    defaultVariant: DEFAULT_HEADER_VARIANT,
    defaultContent: DEFAULT_HEADER_CONTENT,
  },
  footer: {
    type: "footer",
    contentSchema: FooterContentSchema,
    variants: FOOTER_VARIANTS,
    defaultVariant: DEFAULT_FOOTER_VARIANT,
    defaultContent: DEFAULT_FOOTER_CONTENT,
  },
  "announcement-bar": {
    type: "announcement-bar",
    contentSchema: AnnouncementBarContentSchema,
    variants: ANNOUNCEMENT_BAR_VARIANTS,
    defaultVariant: DEFAULT_ANNOUNCEMENT_BAR_VARIANT,
    defaultContent: DEFAULT_ANNOUNCEMENT_BAR_CONTENT,
  },
  hero: {
    type: "hero",
    contentSchema: HeroContentSchema,
    variants: HERO_VARIANTS,
    defaultVariant: DEFAULT_HERO_VARIANT,
    defaultContent: DEFAULT_HERO_CONTENT,
  },
  "feature-grid": {
    type: "feature-grid",
    contentSchema: FeatureGridContentSchema,
    variants: FEATURE_GRID_VARIANTS,
    defaultVariant: DEFAULT_FEATURE_GRID_VARIANT,
    defaultContent: DEFAULT_FEATURE_GRID_CONTENT,
  },
  "feature-row": {
    type: "feature-row",
    contentSchema: FeatureRowContentSchema,
    variants: FEATURE_ROW_VARIANTS,
    defaultVariant: DEFAULT_FEATURE_ROW_VARIANT,
    defaultContent: DEFAULT_FEATURE_ROW_CONTENT,
  },
  "product-grid": {
    type: "product-grid",
    contentSchema: ProductGridContentSchema,
    variants: PRODUCT_GRID_VARIANTS,
    defaultVariant: DEFAULT_PRODUCT_GRID_VARIANT,
    defaultContent: DEFAULT_PRODUCT_GRID_CONTENT,
  },
  "cta-band": {
    type: "cta-band",
    contentSchema: CtaBandContentSchema,
    variants: CTA_BAND_VARIANTS,
    defaultVariant: DEFAULT_CTA_BAND_VARIANT,
    defaultContent: DEFAULT_CTA_BAND_CONTENT,
  },
  testimonial: {
    type: "testimonial",
    contentSchema: TestimonialContentSchema,
    variants: TESTIMONIAL_VARIANTS,
    defaultVariant: DEFAULT_TESTIMONIAL_VARIANT,
    defaultContent: DEFAULT_TESTIMONIAL_CONTENT,
  },
  "rich-text": {
    type: "rich-text",
    contentSchema: RichTextContentSchema,
    variants: RICH_TEXT_VARIANTS,
    defaultVariant: DEFAULT_RICH_TEXT_VARIANT,
    defaultContent: DEFAULT_RICH_TEXT_CONTENT,
  },
  faq: {
    type: "faq",
    contentSchema: FAQContentSchema,
    variants: FAQ_VARIANTS,
    defaultVariant: DEFAULT_FAQ_VARIANT,
    defaultContent: DEFAULT_FAQ_CONTENT,
  },
  pricing: {
    type: "pricing",
    contentSchema: PricingContentSchema,
    variants: PRICING_VARIANTS,
    defaultVariant: DEFAULT_PRICING_VARIANT,
    defaultContent: DEFAULT_PRICING_CONTENT,
  },
  "stats-band": {
    type: "stats-band",
    contentSchema: StatsBandContentSchema,
    variants: STATS_BAND_VARIANTS,
    defaultVariant: DEFAULT_STATS_BAND_VARIANT,
    defaultContent: DEFAULT_STATS_BAND_CONTENT,
  },
  timeline: {
    type: "timeline",
    contentSchema: TimelineContentSchema,
    variants: TIMELINE_VARIANTS,
    defaultVariant: DEFAULT_TIMELINE_VARIANT,
    defaultContent: DEFAULT_TIMELINE_CONTENT,
  },
  "logo-cloud": {
    type: "logo-cloud",
    contentSchema: LogoCloudContentSchema,
    variants: LOGO_CLOUD_VARIANTS,
    defaultVariant: DEFAULT_LOGO_CLOUD_VARIANT,
    defaultContent: DEFAULT_LOGO_CLOUD_CONTENT,
  },
  team: {
    type: "team",
    contentSchema: TeamContentSchema,
    variants: TEAM_VARIANTS,
    defaultVariant: DEFAULT_TEAM_VARIANT,
    defaultContent: DEFAULT_TEAM_CONTENT,
  },
  newsletter: {
    type: "newsletter",
    contentSchema: NewsletterContentSchema,
    variants: NEWSLETTER_VARIANTS,
    defaultVariant: DEFAULT_NEWSLETTER_VARIANT,
    defaultContent: DEFAULT_NEWSLETTER_CONTENT,
  },
  contact: {
    type: "contact",
    contentSchema: ContactContentSchema,
    variants: CONTACT_VARIANTS,
    defaultVariant: DEFAULT_CONTACT_VARIANT,
    defaultContent: DEFAULT_CONTACT_CONTENT,
  },
  "product-detail": {
    type: "product-detail",
    contentSchema: ProductDetailContentSchema,
    variants: PRODUCT_DETAIL_VARIANTS,
    defaultVariant: DEFAULT_PRODUCT_DETAIL_VARIANT,
    defaultContent: DEFAULT_PRODUCT_DETAIL_CONTENT,
  },
} as const satisfies Record<SectionType, SectionData>;

export type SectionDataRegistry = typeof SECTION_DATA;
