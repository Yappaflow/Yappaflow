import type { Section } from "@yappaflow/types";
import { PlaceholderSection } from "../internal/placeholder.js";
import { EditableText } from "../internal/editable-text.js";
import { AnnouncementBarContentSchema } from "./schema.js";
import { DEFAULT_ANNOUNCEMENT_BAR_VARIANT } from "./variants.js";

export function AnnouncementBarSection({ section }: { section: Section }) {
  const parsed = AnnouncementBarContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_ANNOUNCEMENT_BAR_VARIANT;

  return (
    <PlaceholderSection
      section={section}
      variant={variant}
      className="bg-neutral-900 text-white"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-6 py-2.5 text-xs md:px-10">
        {content ? (
          <>
            <EditableText as="span" field="message" value={content.message} />
            {content.cta ? (
              <a
                href={content.cta.href}
                className="font-medium underline underline-offset-2 hover:opacity-80"
              >
                <EditableText field="cta.label" value={content.cta.label} />
                {" "}→
              </a>
            ) : null}
          </>
        ) : (
          <em>invalid announcement-bar content</em>
        )}
      </div>
    </PlaceholderSection>
  );
}
