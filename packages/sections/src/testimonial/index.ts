import { defineSection } from "../internal/define-section.js";
import { TestimonialContentSchema, type TestimonialContent } from "./schema.js";
import { DEFAULT_TESTIMONIAL_CONTENT } from "./default.js";
import {
  TESTIMONIAL_VARIANTS,
  DEFAULT_TESTIMONIAL_VARIANT,
  type TestimonialVariant,
} from "./variants.js";
import { TestimonialSection } from "./render.js";

export const testimonialDefinition = defineSection<
  "testimonial",
  TestimonialContent,
  TestimonialVariant
>({
  type: "testimonial",
  contentSchema: TestimonialContentSchema,
  variants: TESTIMONIAL_VARIANTS,
  defaultVariant: DEFAULT_TESTIMONIAL_VARIANT,
  defaultContent: DEFAULT_TESTIMONIAL_CONTENT,
  Component: TestimonialSection,
});

export {
  TestimonialContentSchema,
  TestimonialSection,
  TESTIMONIAL_VARIANTS,
  DEFAULT_TESTIMONIAL_VARIANT,
};
export type { TestimonialContent, TestimonialVariant };
