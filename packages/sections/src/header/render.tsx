import type { Section } from "@yappaflow/types";
import { PlaceholderSection } from "../internal/placeholder.js";
import { HeaderContentSchema } from "./schema.js";
import { DEFAULT_HEADER_VARIANT } from "./variants.js";

export function HeaderSection({ section }: { section: Section }) {
  const parsed = HeaderContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_HEADER_VARIANT;
  return (
    <PlaceholderSection section={section} variant={variant}>
      {content ? (
        <div>
          <strong>{content.logo.text}</strong>
          <nav aria-label="Primary">
            {content.nav.map((link, i) => (
              <a key={`${link.href}-${i}`} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
          {content.cta ? <a href={content.cta.href}>{content.cta.label}</a> : null}
        </div>
      ) : (
        <em>invalid header content — see builder warnings</em>
      )}
    </PlaceholderSection>
  );
}
