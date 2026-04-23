import type { Section } from "@yappaflow/types";
import { PlaceholderSection } from "../internal/placeholder.js";
import { FeatureRowContentSchema } from "./schema.js";
import { DEFAULT_FEATURE_ROW_VARIANT } from "./variants.js";

export function FeatureRowSection({ section }: { section: Section }) {
  const parsed = FeatureRowContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_FEATURE_ROW_VARIANT;
  return (
    <PlaceholderSection section={section} variant={variant}>
      {content ? (
        <div>
          <div>
            {content.eyebrow ? <p>{content.eyebrow}</p> : null}
            <h2>{content.heading}</h2>
            <p>{content.body}</p>
            {content.bullets.length > 0 ? (
              <ul>
                {content.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            ) : null}
            {content.cta ? <a href={content.cta.href}>{content.cta.label}</a> : null}
          </div>
          {content.media.kind === "image" ? (
            <img
              src={content.media.url}
              alt={content.media.alt ?? ""}
              width={content.media.width}
              height={content.media.height}
            />
          ) : null}
        </div>
      ) : (
        <em>invalid feature-row content — see builder warnings</em>
      )}
    </PlaceholderSection>
  );
}
