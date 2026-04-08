export const BRAND = {
  name: "Yappaflow",
  tagline: "From Conversation to Code. Automatically.",
  description:
    "AI-powered SaaS platform that automates the entire web development pipeline — from client discovery to deployment.",
} as const;

export const COLORS = {
  orange: "#FF6B35",
  peach: "#FFB088",
  peachLight: "#FFDCC5",
  blue: "#4F46E5",
  purple: "#7C3AED",
  pink: "#EC4899",
  black: "#000000",
  white: "#FFFFFF",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray900: "#111827",
} as const;

export const PLATFORMS = [
  "shopify",
  "wordpress",
  "webflow",
  "ikas",
  "custom",
] as const;

export const LOCALES = ["en", "tr"] as const;
export type Locale = (typeof LOCALES)[number];
