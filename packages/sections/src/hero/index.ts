import { defineSection } from "../internal/define-section.js";
import { HeroContentSchema, type HeroContent } from "./schema.js";
import { DEFAULT_HERO_CONTENT } from "./default.js";
import { HERO_VARIANTS, DEFAULT_HERO_VARIANT, type HeroVariant } from "./variants.js";
import { HeroSection } from "./render.js";

export const heroDefinition = defineSection<"hero", HeroContent, HeroVariant>({
  type: "hero",
  contentSchema: HeroContentSchema,
  variants: HERO_VARIANTS,
  defaultVariant: DEFAULT_HERO_VARIANT,
  defaultContent: DEFAULT_HERO_CONTENT,
  Component: HeroSection,
});

export { HeroContentSchema, HeroSection, HERO_VARIANTS, DEFAULT_HERO_VARIANT };
export type { HeroContent, HeroVariant };
