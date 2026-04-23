import type { Section } from "@yappaflow/types";
import { PlaceholderSection } from "../internal/placeholder.js";
import { HeroContentSchema } from "./schema.js";
import { DEFAULT_HERO_VARIANT } from "./variants.js";

export function HeroSection({ section }: { section: Section }) {
  const parsed = HeroContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_HERO_VARIANT;
  return (
    <PlaceholderSection section={section} variant={variant}>
      {content ? (
        <div>
          {content.eyebrow ? <p>{content.eyebrow}</p> : null}
          <h1>{content.heading}</h1>
          {content.subhead ? <p>{content.subhead}</p> : null}
          <div>
            <a href={content.primaryCta.href}>{content.primaryCta.label}</a>
            {content.secondaryCta ? (
              <a href={content.secondaryCta.href}>{content.secondaryCta.label}</a>
            ) : null}
          </div>
          {content.media && content.media.kind === "image" ? (
            <img
              src={content.media.url}
              alt={content.media.alt ?? ""}
              width={content.media.width}
              height={content.media.height}
            />
          ) : null}
        </div>
      ) : (
        <em>invalid hero content — see builder warnings</em>
      )}
    </PlaceholderSection>
  );
}
