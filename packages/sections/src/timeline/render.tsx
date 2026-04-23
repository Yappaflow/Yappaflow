import type { Section } from "@yappaflow/types";
import { ExhibitTimeline } from "yappaflow-ui";
import { PlaceholderSection } from "../internal/placeholder.js";
import { TimelineContentSchema } from "./schema.js";
import { DEFAULT_TIMELINE_VARIANT } from "./variants.js";

export function TimelineSection({ section }: { section: Section }) {
  const parsed = TimelineContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_TIMELINE_VARIANT;

  return (
    <PlaceholderSection section={section} variant={variant}>
      {content ? (
        <ExhibitTimeline
          eyebrow={content.eyebrow}
          heading={content.heading}
          subheading={content.subheading}
          entries={content.entries}
        />
      ) : (
        <em className="block p-6 text-sm text-neutral-500">invalid timeline content</em>
      )}
    </PlaceholderSection>
  );
}
