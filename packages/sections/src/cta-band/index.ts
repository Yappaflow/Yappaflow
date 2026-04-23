import { defineSection } from "../internal/define-section.js";
import { CtaBandContentSchema, type CtaBandContent } from "./schema.js";
import { DEFAULT_CTA_BAND_CONTENT } from "./default.js";
import {
  CTA_BAND_VARIANTS,
  DEFAULT_CTA_BAND_VARIANT,
  type CtaBandVariant,
} from "./variants.js";
import { CtaBandSection } from "./render.js";

export const ctaBandDefinition = defineSection<"cta-band", CtaBandContent, CtaBandVariant>({
  type: "cta-band",
  contentSchema: CtaBandContentSchema,
  variants: CTA_BAND_VARIANTS,
  defaultVariant: DEFAULT_CTA_BAND_VARIANT,
  defaultContent: DEFAULT_CTA_BAND_CONTENT,
  Component: CtaBandSection,
});

export {
  CtaBandContentSchema,
  CtaBandSection,
  CTA_BAND_VARIANTS,
  DEFAULT_CTA_BAND_VARIANT,
};
export type { CtaBandContent, CtaBandVariant };
