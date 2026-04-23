import type { Section } from "@yappaflow/types";
import { PlaceholderSection } from "../internal/placeholder.js";
import { FooterContentSchema } from "./schema.js";
import { DEFAULT_FOOTER_VARIANT } from "./variants.js";

export function FooterSection({ section }: { section: Section }) {
  const parsed = FooterContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_FOOTER_VARIANT;

  if (!content) {
    return (
      <PlaceholderSection section={section} variant={variant} className="border-t border-neutral-200 bg-white p-6 text-sm text-neutral-500">
        <em>invalid footer content</em>
      </PlaceholderSection>
    );
  }

  return (
    <PlaceholderSection
      section={section}
      variant={variant}
      className="border-t border-neutral-200 bg-neutral-50 text-neutral-700"
    >
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-10">
        {variant === "simple" ? (
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            {content.tagline ? (
              <p className="max-w-sm text-sm text-neutral-600">{content.tagline}</p>
            ) : null}
            {content.socials.length > 0 ? (
              <ul className="flex gap-5 text-sm">
                {content.socials.map((s, i) => (
                  <li key={`${s.platform}-${i}`}>
                    <a href={s.href} className="capitalize transition hover:text-neutral-950">
                      {s.label ?? s.platform}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-10 md:grid-cols-[1.2fr_repeat(3,_1fr)]">
            {content.tagline ? (
              <p className="max-w-xs text-sm text-neutral-600">{content.tagline}</p>
            ) : (
              <div />
            )}
            {content.columns.slice(0, 3).map((col, i) => (
              <div key={`${col.heading}-${i}`} className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-900">
                  {col.heading}
                </h4>
                <ul className="space-y-2 text-sm">
                  {col.links.map((link, j) => (
                    <li key={`${link.href}-${j}`}>
                      <a
                        href={link.href}
                        className="text-neutral-600 transition hover:text-neutral-950"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        {(content.legal || content.socials.length > 0) && variant !== "simple" ? (
          <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-neutral-200 pt-6 text-xs text-neutral-500 md:flex-row md:items-center">
            {content.legal ? <span>{content.legal}</span> : <span />}
            {content.socials.length > 0 ? (
              <ul className="flex gap-4">
                {content.socials.map((s, i) => (
                  <li key={`${s.platform}-${i}`}>
                    <a href={s.href} className="capitalize transition hover:text-neutral-900">
                      {s.label ?? s.platform}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </PlaceholderSection>
  );
}
