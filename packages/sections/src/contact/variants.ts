export const CONTACT_VARIANTS = ["default"] as const;
export type ContactVariant = (typeof CONTACT_VARIANTS)[number];
export const DEFAULT_CONTACT_VARIANT: ContactVariant = "default";
