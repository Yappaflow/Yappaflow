export const TESTIMONIAL_VARIANTS = ["single", "carousel"] as const;
export type TestimonialVariant = (typeof TESTIMONIAL_VARIANTS)[number];
export const DEFAULT_TESTIMONIAL_VARIANT: TestimonialVariant = "single";
