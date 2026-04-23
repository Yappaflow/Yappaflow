import { defineSection } from "../internal/define-section.js";
import { PricingContentSchema, type PricingContent } from "./schema.js";
import { DEFAULT_PRICING_CONTENT } from "./default.js";
import {
  PRICING_VARIANTS,
  DEFAULT_PRICING_VARIANT,
  type PricingVariant,
} from "./variants.js";
import { PricingSection } from "./render.js";

export const pricingDefinition = defineSection<"pricing", PricingContent, PricingVariant>({
  type: "pricing",
  contentSchema: PricingContentSchema,
  variants: PRICING_VARIANTS,
  defaultVariant: DEFAULT_PRICING_VARIANT,
  defaultContent: DEFAULT_PRICING_CONTENT,
  Component: PricingSection,
});

export { PricingContentSchema, PricingSection, PRICING_VARIANTS, DEFAULT_PRICING_VARIANT };
export type { PricingContent, PricingVariant };
