export const FAQ_VARIANTS = ["default"] as const;
export type FAQVariant = (typeof FAQ_VARIANTS)[number];
export const DEFAULT_FAQ_VARIANT: FAQVariant = "default";
