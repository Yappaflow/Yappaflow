import { defineSection } from "../internal/define-section.js";
import { NewsletterContentSchema, type NewsletterContent } from "./schema.js";
import { DEFAULT_NEWSLETTER_CONTENT } from "./default.js";
import {
  NEWSLETTER_VARIANTS,
  DEFAULT_NEWSLETTER_VARIANT,
  type NewsletterVariant,
} from "./variants.js";
import { NewsletterSection } from "./render.js";

export const newsletterDefinition = defineSection<
  "newsletter",
  NewsletterContent,
  NewsletterVariant
>({
  type: "newsletter",
  contentSchema: NewsletterContentSchema,
  variants: NEWSLETTER_VARIANTS,
  defaultVariant: DEFAULT_NEWSLETTER_VARIANT,
  defaultContent: DEFAULT_NEWSLETTER_CONTENT,
  Component: NewsletterSection,
});

export {
  NewsletterContentSchema,
  NewsletterSection,
  NEWSLETTER_VARIANTS,
  DEFAULT_NEWSLETTER_VARIANT,
};
export type { NewsletterContent, NewsletterVariant };
