import { defineSection } from "../internal/define-section.js";
import { FeatureRowContentSchema, type FeatureRowContent } from "./schema.js";
import { DEFAULT_FEATURE_ROW_CONTENT } from "./default.js";
import {
  FEATURE_ROW_VARIANTS,
  DEFAULT_FEATURE_ROW_VARIANT,
  type FeatureRowVariant,
} from "./variants.js";
import { FeatureRowSection } from "./render.js";

export const featureRowDefinition = defineSection<
  "feature-row",
  FeatureRowContent,
  FeatureRowVariant
>({
  type: "feature-row",
  contentSchema: FeatureRowContentSchema,
  variants: FEATURE_ROW_VARIANTS,
  defaultVariant: DEFAULT_FEATURE_ROW_VARIANT,
  defaultContent: DEFAULT_FEATURE_ROW_CONTENT,
  Component: FeatureRowSection,
});

export {
  FeatureRowContentSchema,
  FeatureRowSection,
  FEATURE_ROW_VARIANTS,
  DEFAULT_FEATURE_ROW_VARIANT,
};
export type { FeatureRowContent, FeatureRowVariant };
