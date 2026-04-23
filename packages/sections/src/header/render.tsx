import type { Section } from "@yappaflow/types";
import { PlaceholderSection } from "../internal/placeholder.js";
import { HeaderContentSchema } from "./schema.js";
import { DEFAULT_HEADER_VARIANT } from "./variants.js";

export function HeaderSection({ section }: { section: Section }) {
  const parsed = HeaderContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_HEADER_VARIANT;

  if (!content) {
    return (
      <PlaceholderSection section={section} variant={variant} className="border-b border-neutral-200 bg-white px-6 py-4 text-sm text-neutral-500">
        <em>invalid header content</em>
      </PlaceholderSection>
    );
  }

  const logo = (
    <a href="/" className="text-lg font-semibold tracking-tight text-neutral-900">
      {content.logo.text}
    </a>
  );

  const nav = (
    <nav className="hidden items-center gap-7 text-sm text-neutral-700 md:flex">
      {content.nav.map((link, i) => (
        <a key={`${link.href}-${i}`} href={link.href} className="transition hover:text-neutral-950">
          {link.label}
        </a>
      ))}
    </nav>
  );

  const cta = content.cta ? (
    <a
      href={content.cta.href}
      className="inline-flex items-center rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
    >
      {content.cta.label}
    </a>
  ) : null;

  return (
    <PlaceholderSection
      section={section}
      variant={variant}
      className="border-b border-neutral-200 bg-white"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-5 md:px-10">
        {variant === "logo-center" ? (
          <>
            <div className="flex-1">{nav}</div>
            <div className="flex-1 text-center">{logo}</div>
            <div className="flex flex-1 justify-end">{cta}</div>
          </>
        ) : (
          <>
            {logo}
            <div className="flex items-center gap-8">
              {nav}
              {cta}
            </div>
          </>
        )}
      </div>
    </PlaceholderSection>
  );
}
