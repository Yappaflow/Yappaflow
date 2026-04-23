import type { FeatureGridContent } from "./schema.js";

export const DEFAULT_FEATURE_GRID_CONTENT: FeatureGridContent = {
  eyebrow: "What we do",
  heading: "Built for the agencies behind the brands you know.",
  subhead: "",
  columns: 3,
  features: [
    {
      title: "Strategy",
      body: "Positioning and narrative that your team can actually ship.",
      icon: "compass",
    },
    {
      title: "Identity",
      body: "Brand systems that scale from a wordmark to a website.",
      icon: "sparkles",
    },
    {
      title: "Digital",
      body: "Fast, accessible websites that earn their engineering budget.",
      icon: "monitor",
    },
  ],
};
