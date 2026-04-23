export const HERO_VARIANTS = ["split", "centered", "fullscreen-media"] as const;
export type HeroVariant = (typeof HERO_VARIANTS)[number];
export const DEFAULT_HERO_VARIANT: HeroVariant = "split";
