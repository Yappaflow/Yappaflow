import { defineSection } from "../internal/define-section.js";
import { FAQContentSchema, type FAQContent } from "./schema.js";
import { DEFAULT_FAQ_CONTENT } from "./default.js";
import { FAQ_VARIANTS, DEFAULT_FAQ_VARIANT, type FAQVariant } from "./variants.js";
import { FAQSection } from "./render.js";

export const faqDefinition = defineSection<"faq", FAQContent, FAQVariant>({
  type: "faq",
  contentSchema: FAQContentSchema,
  variants: FAQ_VARIANTS,
  defaultVariant: DEFAULT_FAQ_VARIANT,
  defaultContent: DEFAULT_FAQ_CONTENT,
  Component: FAQSection,
});

export { FAQContentSchema, FAQSection, FAQ_VARIANTS, DEFAULT_FAQ_VARIANT };
export type { FAQContent, FAQVariant };
