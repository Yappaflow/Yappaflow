export const FOOTER_VARIANTS = ["simple", "columns"] as const;
export type FooterVariant = (typeof FOOTER_VARIANTS)[number];
export const DEFAULT_FOOTER_VARIANT: FooterVariant = "columns";
