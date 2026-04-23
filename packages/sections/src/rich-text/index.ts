import { defineSection } from "../internal/define-section.js";
import { RichTextContentSchema, type RichTextContent } from "./schema.js";
import { DEFAULT_RICH_TEXT_CONTENT } from "./default.js";
import {
  RICH_TEXT_VARIANTS,
  DEFAULT_RICH_TEXT_VARIANT,
  type RichTextVariant,
} from "./variants.js";
import { RichTextSection } from "./render.js";

export const richTextDefinition = defineSection<
  "rich-text",
  RichTextContent,
  RichTextVariant
>({
  type: "rich-text",
  contentSchema: RichTextContentSchema,
  variants: RICH_TEXT_VARIANTS,
  defaultVariant: DEFAULT_RICH_TEXT_VARIANT,
  defaultContent: DEFAULT_RICH_TEXT_CONTENT,
  Component: RichTextSection,
});

export {
  RichTextContentSchema,
  RichTextSection,
  RICH_TEXT_VARIANTS,
  DEFAULT_RICH_TEXT_VARIANT,
};
export type { RichTextContent, RichTextVariant };
