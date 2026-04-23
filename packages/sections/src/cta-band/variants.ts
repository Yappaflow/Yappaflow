export const CTA_BAND_VARIANTS = ["centered", "split"] as const;
export type CtaBandVariant = (typeof CTA_BAND_VARIANTS)[number];
export const DEFAULT_CTA_BAND_VARIANT: CtaBandVariant = "centered";
