import type { Section } from "@yappaflow/types";
import { ExhibitStats } from "yappaflow-ui";
import { PlaceholderSection } from "../internal/placeholder.js";
import { StatsBandContentSchema } from "./schema.js";
import { DEFAULT_STATS_BAND_VARIANT } from "./variants.js";

export function StatsBandSection({ section }: { section: Section }) {
  const parsed = StatsBandContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_STATS_BAND_VARIANT;

  return (
    <PlaceholderSection section={section} variant={variant}>
      {content ? (
        <ExhibitStats
          eyebrow={content.eyebrow}
          heading={content.heading}
          blocks={content.blocks}
        />
      ) : (
        <em className="block p-6 text-sm text-neutral-500">invalid stats content</em>
      )}
    </PlaceholderSection>
  );
}
