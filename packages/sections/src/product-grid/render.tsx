import type { Section } from "@yappaflow/types";
import { PlaceholderSection } from "../internal/placeholder.js";
import { ProductGridContentSchema } from "./schema.js";
import { DEFAULT_PRODUCT_GRID_VARIANT } from "./variants.js";

export function ProductGridSection({ section }: { section: Section }) {
  const parsed = ProductGridContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_PRODUCT_GRID_VARIANT;
  return (
    <PlaceholderSection section={section} variant={variant}>
      {content ? (
        <div>
          {content.eyebrow ? <p>{content.eyebrow}</p> : null}
          <h2>{content.heading}</h2>
          {content.subhead ? <p>{content.subhead}</p> : null}
          <div data-yf-columns={content.columns}>
            {content.products.map((p) => (
              <a key={p.id} href={p.href}>
                <img
                  src={p.image.url}
                  alt={p.image.alt ?? p.title}
                  width={p.image.width}
                  height={p.image.height}
                />
                <h3>{p.title}</h3>
                <p>{p.price}</p>
              </a>
            ))}
          </div>
          {content.ctaAll ? (
            <a href={content.ctaAll.href}>{content.ctaAll.label}</a>
          ) : null}
        </div>
      ) : (
        <em>invalid product-grid content — see builder warnings</em>
      )}
    </PlaceholderSection>
  );
}
