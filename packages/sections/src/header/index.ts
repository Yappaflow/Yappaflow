import { defineSection } from "../internal/define-section.js";
import { HeaderContentSchema, type HeaderContent } from "./schema.js";
import { DEFAULT_HEADER_CONTENT } from "./default.js";
import { HEADER_VARIANTS, DEFAULT_HEADER_VARIANT, type HeaderVariant } from "./variants.js";
import { HeaderSection } from "./render.js";

export const headerDefinition = defineSection<"header", HeaderContent, HeaderVariant>({
  type: "header",
  contentSchema: HeaderContentSchema,
  variants: HEADER_VARIANTS,
  defaultVariant: DEFAULT_HEADER_VARIANT,
  defaultContent: DEFAULT_HEADER_CONTENT,
  Component: HeaderSection,
});

export { HeaderContentSchema, HeaderSection, HEADER_VARIANTS, DEFAULT_HEADER_VARIANT };
export type { HeaderContent, HeaderVariant };
