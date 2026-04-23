export const FEATURE_GRID_VARIANTS = ["icons", "images"] as const;
export type FeatureGridVariant = (typeof FEATURE_GRID_VARIANTS)[number];
export const DEFAULT_FEATURE_GRID_VARIANT: FeatureGridVariant = "icons";
