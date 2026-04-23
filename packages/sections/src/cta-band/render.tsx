import type { Section } from "@yappaflow/types";
import { PlaceholderSection } from "../internal/placeholder.js";
import { CtaBandContentSchema } from "./schema.js";
import { DEFAULT_CTA_BAND_VARIANT } from "./variants.js";

export function CtaBandSection({ section }: { section: Section }) {
  const parsed = CtaBandContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_CTA_BAND_VARIANT;
  return (
    <PlaceholderSection section={section} variant={variant}>
      {content ? (
        <div>
          <h2>{content.heading}</h2>
          {content.subhead ? <p>{content.subhead}</p> : null}
          <div>
            <a href={content.primaryCta.href}>{content.primaryCta.label}</a>
            {content.secondaryCta ? (
              <a href={content.secondaryCta.href}>{content.secondaryCta.label}</a>
            ) : null}
          </div>
        </div>
      ) : (
        <em>invalid cta-band content — see builder warnings</em>
      )}
    </PlaceholderSection>
  );
}
