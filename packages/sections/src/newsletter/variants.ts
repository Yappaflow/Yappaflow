export const NEWSLETTER_VARIANTS = ["default"] as const;
export type NewsletterVariant = (typeof NEWSLETTER_VARIANTS)[number];
export const DEFAULT_NEWSLETTER_VARIANT: NewsletterVariant = "default";
