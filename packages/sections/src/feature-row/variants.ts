export const FEATURE_ROW_VARIANTS = ["image-left", "image-right"] as const;
export type FeatureRowVariant = (typeof FEATURE_ROW_VARIANTS)[number];
export const DEFAULT_FEATURE_ROW_VARIANT: FeatureRowVariant = "image-right";
