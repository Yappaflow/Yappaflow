import type { HeroContent } from "./schema.js";

export const DEFAULT_HERO_CONTENT: HeroContent = {
  eyebrow: "New collection",
  heading: "Design that earns its keep.",
  subhead:
    "A studio-built system for teams who care about the result, not the process theatre.",
  primaryCta: { label: "See the work", href: "/work" },
  secondaryCta: { label: "Contact us", href: "/contact" },
  media: {
    kind: "image",
    url: "/images/hero.jpg",
    alt: "Studio hero",
    width: 1600,
    height: 1000,
  },
};
