import type { Section } from "@yappaflow/types";
import { ExhibitContact } from "yappaflow-ui";
import { PlaceholderSection } from "../internal/placeholder.js";
import { ContactContentSchema } from "./schema.js";
import { DEFAULT_CONTACT_VARIANT } from "./variants.js";

export function ContactSection({ section }: { section: Section }) {
  const parsed = ContactContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_CONTACT_VARIANT;

  return (
    <PlaceholderSection section={section} variant={variant}>
      {content ? (
        <ExhibitContact
          eyebrow={content.eyebrow}
          heading={content.heading}
          subheading={content.subheading}
          rows={content.rows}
          includeForm={content.includeForm}
          formAction={content.formAction}
        />
      ) : (
        <em className="block p-6 text-sm text-neutral-500">invalid contact content</em>
      )}
    </PlaceholderSection>
  );
}
