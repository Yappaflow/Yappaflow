import type { Section } from "@yappaflow/types";
import { PlaceholderSection } from "../internal/placeholder.js";
import { FooterContentSchema } from "./schema.js";
import { DEFAULT_FOOTER_VARIANT } from "./variants.js";

export function FooterSection({ section }: { section: Section }) {
  const parsed = FooterContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_FOOTER_VARIANT;
  return (
    <PlaceholderSection section={section} variant={variant}>
      {content ? (
        <footer>
          {content.tagline ? <p>{content.tagline}</p> : null}
          <div>
            {content.columns.map((col, i) => (
              <div key={`${col.heading}-${i}`}>
                <h4>{col.heading}</h4>
                <ul>
                  {col.links.map((link, j) => (
                    <li key={`${link.href}-${j}`}>
                      <a href={link.href}>{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {content.socials.length > 0 ? (
            <ul>
              {content.socials.map((s, i) => (
                <li key={`${s.platform}-${i}`}>
                  <a href={s.href}>{s.label ?? s.platform}</a>
                </li>
              ))}
            </ul>
          ) : null}
          {content.legal ? <small>{content.legal}</small> : null}
        </footer>
      ) : (
        <em>invalid footer content — see builder warnings</em>
      )}
    </PlaceholderSection>
  );
}
