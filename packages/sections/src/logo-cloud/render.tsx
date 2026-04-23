import type { Section } from "@yappaflow/types";
import { ExhibitLogoCloud } from "yappaflow-ui";
import { PlaceholderSection } from "../internal/placeholder.js";
import { LogoCloudContentSchema } from "./schema.js";
import { DEFAULT_LOGO_CLOUD_VARIANT } from "./variants.js";

export function LogoCloudSection({ section }: { section: Section }) {
  const parsed = LogoCloudContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_LOGO_CLOUD_VARIANT;

  return (
    <PlaceholderSection section={section} variant={variant}>
      {content ? (
        <ExhibitLogoCloud
          eyebrow={content.eyebrow}
          heading={content.heading}
          labels={content.labels}
        />
      ) : (
        <em className="block p-6 text-sm text-neutral-500">invalid logo-cloud content</em>
      )}
    </PlaceholderSection>
  );
}
