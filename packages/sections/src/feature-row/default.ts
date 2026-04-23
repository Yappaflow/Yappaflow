import type { FeatureRowContent } from "./schema.js";

export const DEFAULT_FEATURE_ROW_CONTENT: FeatureRowContent = {
  eyebrow: "How we work",
  heading: "A sprint-based cadence that respects your calendar.",
  body: "Two-week sprints, shipping deliverables on a schedule your team can plan around.",
  bullets: [
    "Kickoff in week 1",
    "Reviews at day 5 and day 10",
    "Clean handoff on day 14",
  ],
  media: {
    kind: "image",
    url: "/images/process.jpg",
    alt: "Whiteboard sketch",
    width: 1200,
    height: 900,
  },
  cta: { label: "Read the case studies", href: "/work" },
};
