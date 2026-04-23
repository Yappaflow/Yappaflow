import { defineSection } from "../internal/define-section.js";
import { FooterContentSchema, type FooterContent } from "./schema.js";
import { DEFAULT_FOOTER_CONTENT } from "./default.js";
import { FOOTER_VARIANTS, DEFAULT_FOOTER_VARIANT, type FooterVariant } from "./variants.js";
import { FooterSection } from "./render.js";

export const footerDefinition = defineSection<"footer", FooterContent, FooterVariant>({
  type: "footer",
  contentSchema: FooterContentSchema,
  variants: FOOTER_VARIANTS,
  defaultVariant: DEFAULT_FOOTER_VARIANT,
  defaultContent: DEFAULT_FOOTER_CONTENT,
  Component: FooterSection,
});

export { FooterContentSchema, FooterSection, FOOTER_VARIANTS, DEFAULT_FOOTER_VARIANT };
export type { FooterContent, FooterVariant };
