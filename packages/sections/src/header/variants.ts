export const HEADER_VARIANTS = ["logo-left", "logo-center"] as const;
export type HeaderVariant = (typeof HEADER_VARIANTS)[number];
export const DEFAULT_HEADER_VARIANT: HeaderVariant = "logo-left";
