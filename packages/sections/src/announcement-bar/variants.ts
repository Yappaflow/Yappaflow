export const ANNOUNCEMENT_BAR_VARIANTS = ["text-only"] as const;
export type AnnouncementBarVariant = (typeof ANNOUNCEMENT_BAR_VARIANTS)[number];
export const DEFAULT_ANNOUNCEMENT_BAR_VARIANT: AnnouncementBarVariant = "text-only";
