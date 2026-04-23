import type { Section } from "@yappaflow/types";
import { ExhibitFAQ } from "yappaflow-ui";
import { PlaceholderSection } from "../internal/placeholder.js";
import { FAQContentSchema } from "./schema.js";
import { DEFAULT_FAQ_VARIANT } from "./variants.js";

export function FAQSection({ section }: { section: Section }) {
  const parsed = FAQContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_FAQ_VARIANT;

  return (
    <PlaceholderSection section={section} variant={variant}>
      {content ? (
        <ExhibitFAQ
          eyebrow={content.eyebrow}
          heading={content.heading}
          subheading={content.subheading}
          blocks={content.blocks}
        />
      ) : (
        <em className="block p-6 text-sm text-neutral-500">invalid faq content</em>
      )}
    </PlaceholderSection>
  );
}
