import type { FAQContent } from "./schema.js";

export const DEFAULT_FAQ_CONTENT: FAQContent = {
  eyebrow: "Frequently asked",
  heading: "What agencies ask before they start.",
  subheading: "",
  blocks: [
    {
      question: "How long does a typical engagement take?",
      answer:
        "We work in two-week sprints. A landing refresh ships in a single sprint; a full rebrand is usually three to four.",
    },
    {
      question: "Do you work with in-house teams?",
      answer:
        "Yes. Most of our engagements have an internal design partner. We adopt your tooling and review cadence.",
    },
    {
      question: "What do you need from us to start?",
      answer:
        "A brief, a few reference sites we should look at, and a named point of contact on your side. That's it.",
    },
  ],
};
