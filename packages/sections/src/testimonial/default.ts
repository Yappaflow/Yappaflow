import type { TestimonialContent } from "./schema.js";

export const DEFAULT_TESTIMONIAL_CONTENT: TestimonialContent = {
  eyebrow: "What clients say",
  heading: "A studio that ships on the days it says it will.",
  items: [
    {
      quote:
        "They moved faster than our in-house team and held a higher bar than our agency of record. Rare combo.",
      author: "Mira Alden",
      role: "VP of Marketing, Northbeam",
    },
    {
      quote:
        "The rebrand landed the week of the announcement. No drama, no scope creep.",
      author: "Tomás Ruiz",
      role: "Founder, Cask & Cord",
    },
  ],
};
