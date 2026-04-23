import type { Section } from "@yappaflow/types";
import { PlaceholderSection } from "../internal/placeholder.js";
import { AnnouncementBarContentSchema } from "./schema.js";
import { DEFAULT_ANNOUNCEMENT_BAR_VARIANT } from "./variants.js";

export function AnnouncementBarSection({ section }: { section: Section }) {
  const parsed = AnnouncementBarContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_ANNOUNCEMENT_BAR_VARIANT;
  return (
    <PlaceholderSection section={section} variant={variant}>
      {content ? (
        <div>
          <span>{content.message}</span>
          {content.cta ? <a href={content.cta.href}>{content.cta.label}</a> : null}
        </div>
      ) : (
        <em>invalid announcement-bar content — see builder warnings</em>
      )}
    </PlaceholderSection>
  );
}
