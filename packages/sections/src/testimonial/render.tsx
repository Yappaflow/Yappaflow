import type { Section } from "@yappaflow/types";
import { PlaceholderSection } from "../internal/placeholder.js";
import { TestimonialContentSchema } from "./schema.js";
import { DEFAULT_TESTIMONIAL_VARIANT } from "./variants.js";

export function TestimonialSection({ section }: { section: Section }) {
  const parsed = TestimonialContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_TESTIMONIAL_VARIANT;
  return (
    <PlaceholderSection section={section} variant={variant}>
      {content ? (
        <div>
          {content.eyebrow ? <p>{content.eyebrow}</p> : null}
          {content.heading ? <h2>{content.heading}</h2> : null}
          <ul>
            {content.items.map((t, i) => (
              <li key={`${t.author}-${i}`}>
                <blockquote>"{t.quote}"</blockquote>
                <cite>
                  {t.author}
                  {t.role ? ` · ${t.role}` : ""}
                </cite>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <em>invalid testimonial content — see builder warnings</em>
      )}
    </PlaceholderSection>
  );
}
