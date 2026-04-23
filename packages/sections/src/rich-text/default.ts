import type { RichTextContent } from "./schema.js";

export const DEFAULT_RICH_TEXT_CONTENT: RichTextContent = {
  blocks: [
    { type: "h2", text: "The principles we work by" },
    {
      type: "p",
      text: "Less surface, more ground. We'd rather ship the thing that matters than decorate the thing that doesn't.",
    },
    {
      type: "ul",
      items: [
        "Own the outcome.",
        "Respect the calendar.",
        "Leave the codebase better than we found it.",
      ],
    },
  ],
};
