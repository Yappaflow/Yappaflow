import type { Section } from "@yappaflow/types";
import { ExhibitTeam } from "yappaflow-ui";
import { PlaceholderSection } from "../internal/placeholder.js";
import { TeamContentSchema } from "./schema.js";
import { DEFAULT_TEAM_VARIANT } from "./variants.js";

export function TeamSection({ section }: { section: Section }) {
  const parsed = TeamContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_TEAM_VARIANT;

  return (
    <PlaceholderSection section={section} variant={variant}>
      {content ? (
        <ExhibitTeam
          eyebrow={content.eyebrow}
          heading={content.heading}
          subheading={content.subheading}
          members={content.members}
          columns={content.columns}
        />
      ) : (
        <em className="block p-6 text-sm text-neutral-500">invalid team content</em>
      )}
    </PlaceholderSection>
  );
}
