import type { Section } from "@yappaflow/types";
import { PlaceholderSection } from "../internal/placeholder.js";
import { RichTextContentSchema, type RichTextBlock } from "./schema.js";
import { DEFAULT_RICH_TEXT_VARIANT } from "./variants.js";

function renderBlock(block: RichTextBlock, key: number) {
  switch (block.type) {
    case "p":
      return <p key={key}>{block.text}</p>;
    case "h2":
      return <h2 key={key}>{block.text}</h2>;
    case "h3":
      return <h3 key={key}>{block.text}</h3>;
    case "ul":
      return (
        <ul key={key}>
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={key}>
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );
    case "hr":
      return <hr key={key} />;
  }
}

export function RichTextSection({ section }: { section: Section }) {
  const parsed = RichTextContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_RICH_TEXT_VARIANT;
  return (
    <PlaceholderSection section={section} variant={variant}>
      {content ? (
        <div>{content.blocks.map((b, i) => renderBlock(b, i))}</div>
      ) : (
        <em>invalid rich-text content — see builder warnings</em>
      )}
    </PlaceholderSection>
  );
}
