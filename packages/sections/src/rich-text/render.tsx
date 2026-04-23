import type { Section } from "@yappaflow/types";
import { PlaceholderSection } from "../internal/placeholder.js";
import { RichTextContentSchema, type RichTextBlock } from "./schema.js";
import { DEFAULT_RICH_TEXT_VARIANT } from "./variants.js";

function renderBlock(block: RichTextBlock, key: number) {
  switch (block.type) {
    case "p":
      return (
        <p key={key} className="text-base leading-relaxed text-neutral-700">
          {block.text}
        </p>
      );
    case "h2":
      return (
        <h2 key={key} className="text-2xl font-semibold tracking-tight text-neutral-950 md:text-3xl">
          {block.text}
        </h2>
      );
    case "h3":
      return (
        <h3 key={key} className="text-xl font-semibold text-neutral-950 md:text-2xl">
          {block.text}
        </h3>
      );
    case "ul":
      return (
        <ul key={key} className="list-disc space-y-1 pl-5 text-neutral-700">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={key} className="list-decimal space-y-1 pl-5 text-neutral-700">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );
    case "hr":
      return <hr key={key} className="my-4 border-neutral-200" />;
  }
}

export function RichTextSection({ section }: { section: Section }) {
  const parsed = RichTextContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_RICH_TEXT_VARIANT;

  return (
    <PlaceholderSection section={section} variant={variant} className="bg-white">
      <div className="mx-auto max-w-2xl px-6 py-16 md:py-20">
        {content ? (
          <div className="flex flex-col gap-5">
            {content.blocks.map((b, i) => renderBlock(b, i))}
          </div>
        ) : (
          <em className="text-neutral-500">invalid rich-text content</em>
        )}
      </div>
    </PlaceholderSection>
  );
}
