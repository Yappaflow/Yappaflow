export const STATS_BAND_VARIANTS = ["default"] as const;
export type StatsBandVariant = (typeof STATS_BAND_VARIANTS)[number];
export const DEFAULT_STATS_BAND_VARIANT: StatsBandVariant = "default";
