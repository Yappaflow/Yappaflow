import type { Section } from "@yappaflow/types";
import { PlaceholderSection } from "../internal/placeholder.js";
import { FeatureGridContentSchema } from "./schema.js";
import { DEFAULT_FEATURE_GRID_VARIANT } from "./variants.js";

export function FeatureGridSection({ section }: { section: Section }) {
  const parsed = FeatureGridContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_FEATURE_GRID_VARIANT;
  return (
    <PlaceholderSection section={section} variant={variant}>
      {content ? (
        <div>
          {content.eyebrow ? <p>{content.eyebrow}</p> : null}
          <h2>{content.heading}</h2>
          {content.subhead ? <p>{content.subhead}</p> : null}
          <div data-yf-columns={content.columns}>
            {content.features.map((f, i) => (
              <article key={`${f.title}-${i}`}>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <em>invalid feature-grid content — see builder warnings</em>
      )}
    </PlaceholderSection>
  );
}
