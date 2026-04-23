import type { Section } from "@yappaflow/types";
import { ExhibitNewsletter } from "yappaflow-ui";
import { PlaceholderSection } from "../internal/placeholder.js";
import { NewsletterContentSchema } from "./schema.js";
import { DEFAULT_NEWSLETTER_VARIANT } from "./variants.js";

export function NewsletterSection({ section }: { section: Section }) {
  const parsed = NewsletterContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_NEWSLETTER_VARIANT;

  return (
    <PlaceholderSection section={section} variant={variant}>
      {content ? (
        <ExhibitNewsletter
          eyebrow={content.eyebrow}
          heading={content.heading}
          subheading={content.subheading}
          submitLabel={content.submitLabel}
          placeholder={content.placeholder}
          action={content.action}
          fineprint={content.fineprint}
        />
      ) : (
        <em className="block p-6 text-sm text-neutral-500">invalid newsletter content</em>
      )}
    </PlaceholderSection>
  );
}
