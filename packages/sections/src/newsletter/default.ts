import type { NewsletterContent } from "./schema.js";

export const DEFAULT_NEWSLETTER_CONTENT: NewsletterContent = {
  eyebrow: "Newsletter",
  heading: "A monthly post on design systems — nothing else.",
  subheading:
    "One letter a month. Writing we've published, work we've shipped, ideas we're testing.",
  submitLabel: "Subscribe",
  placeholder: "you@studio.com",
  action: "",
  fineprint: "We'll never share your email. Unsubscribe any time.",
};
