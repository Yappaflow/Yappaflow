import { defineSection } from "../internal/define-section.js";
import { ContactContentSchema, type ContactContent } from "./schema.js";
import { DEFAULT_CONTACT_CONTENT } from "./default.js";
import {
  CONTACT_VARIANTS,
  DEFAULT_CONTACT_VARIANT,
  type ContactVariant,
} from "./variants.js";
import { ContactSection } from "./render.js";

export const contactDefinition = defineSection<
  "contact",
  ContactContent,
  ContactVariant
>({
  type: "contact",
  contentSchema: ContactContentSchema,
  variants: CONTACT_VARIANTS,
  defaultVariant: DEFAULT_CONTACT_VARIANT,
  defaultContent: DEFAULT_CONTACT_CONTENT,
  Component: ContactSection,
});

export {
  ContactContentSchema,
  ContactSection,
  CONTACT_VARIANTS,
  DEFAULT_CONTACT_VARIANT,
};
export type { ContactContent, ContactVariant };
