import type { PricingContent } from "./schema.js";

export const DEFAULT_PRICING_CONTENT: PricingContent = {
  eyebrow: "Pricing",
  heading: "Plans that match how agencies actually work.",
  subheading: "Ship faster, ship cleaner — without committing to a yearly package.",
  tiers: [
    {
      name: "Starter",
      price: "$0",
      period: "/mo",
      description: "For solo makers and early-stage studios.",
      features: ["1 site per month", "Export to Shopify", "Email support"],
      cta: { label: "Start free", href: "/signup" },
    },
    {
      name: "Studio",
      price: "$49",
      period: "/mo",
      description: "For agencies delivering client sites regularly.",
      features: [
        "Unlimited sites",
        "All adapters (Shopify / Webflow / WordPress / IKAS)",
        "Priority support",
        "Team seats",
      ],
      cta: { label: "Try Studio", href: "/signup" },
      featured: true,
    },
    {
      name: "Scale",
      price: "Custom",
      description: "For larger agencies with in-house design systems.",
      features: [
        "Everything in Studio",
        "SSO & audit log",
        "Shared brand tokens",
        "Account manager",
      ],
      cta: { label: "Talk to sales", href: "/contact" },
    },
  ],
};
