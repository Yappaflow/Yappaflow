import { defineSection } from "../internal/define-section.js";
import { FeatureGridContentSchema, type FeatureGridContent } from "./schema.js";
import { DEFAULT_FEATURE_GRID_CONTENT } from "./default.js";
import {
  FEATURE_GRID_VARIANTS,
  DEFAULT_FEATURE_GRID_VARIANT,
  type FeatureGridVariant,
} from "./variants.js";
import { FeatureGridSection } from "./render.js";

export const featureGridDefinition = defineSection<
  "feature-grid",
  FeatureGridContent,
  FeatureGridVariant
>({
  type: "feature-grid",
  contentSchema: FeatureGridContentSchema,
  variants: FEATURE_GRID_VARIANTS,
  defaultVariant: DEFAULT_FEATURE_GRID_VARIANT,
  defaultContent: DEFAULT_FEATURE_GRID_CONTENT,
  Component: FeatureGridSection,
});

export {
  FeatureGridContentSchema,
  FeatureGridSection,
  FEATURE_GRID_VARIANTS,
  DEFAULT_FEATURE_GRID_VARIANT,
};
export type { FeatureGridContent, FeatureGridVariant };
