import { z } from "zod";

/**
 * Rich-text block discriminated union. Keeping this shape minimal (no inline
 * marks, no images inside paragraphs) so the builder's Tiptap integration in
 * Phase 8 doesn't have to handle edge cases on day one. The AI is encouraged
 * to express fancier layouts via dedicated section types (feature-grid,
 * feature-row, testimonial) instead of leaning on rich-text.
 */
export const RichTextBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("p"), text: z.string() }),
  z.object({ type: z.literal("h2"), text: z.string() }),
  z.object({ type: z.literal("h3"), text: z.string() }),
  z.object({ type: z.literal("ul"), items: z.array(z.string()) }),
  z.object({ type: z.literal("ol"), items: z.array(z.string()) }),
  z.object({ type: z.literal("hr") }),
]);
export type RichTextBlock = z.infer<typeof RichTextBlockSchema>;

export const RichTextContentSchema = z.object({
  blocks: z.array(RichTextBlockSchema).default([]),
});

export type RichTextContent = z.infer<typeof RichTextContentSchema>;
