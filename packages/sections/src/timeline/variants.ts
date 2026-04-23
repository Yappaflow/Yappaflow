export const TIMELINE_VARIANTS = ["default"] as const;
export type TimelineVariant = (typeof TIMELINE_VARIANTS)[number];
export const DEFAULT_TIMELINE_VARIANT: TimelineVariant = "default";
