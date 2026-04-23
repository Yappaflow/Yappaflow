import type { StatsBandContent } from "./schema.js";

export const DEFAULT_STATS_BAND_CONTENT: StatsBandContent = {
  eyebrow: "By the numbers",
  heading: "Twelve years of shipping work that earned its keep.",
  blocks: [
    { value: "500+", label: "Brands shipped", context: "since 2012" },
    { value: "12", label: "Years in practice" },
    { value: "98%", label: "Retention", context: "2024" },
    { value: "14d", label: "Typical sprint length" },
  ],
};
