import type { Section } from "@yappaflow/types";
import { PlaceholderSection } from "../internal/placeholder.js";
import { EditableText } from "../internal/editable-text.js";
import { CtaBandContentSchema } from "./schema.js";
import { DEFAULT_CTA_BAND_VARIANT } from "./variants.js";

export function CtaBandSection({ section }: { section: Section }) {
  const parsed = CtaBandContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_CTA_BAND_VARIANT;

  if (!content) {
    return (
      <PlaceholderSection section={section} variant={variant} className="bg-white p-8 text-neutral-500">
        <em>invalid cta-band content</em>
      </PlaceholderSection>
    );
  }

  const ctas = (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href={content.primaryCta.href}
        className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
      >
        <EditableText field="primaryCta.label" value={content.primaryCta.label} />
      </a>
      {content.secondaryCta ? (
        <a
          href={content.secondaryCta.href}
          className="inline-flex items-center rounded-full border border-white/40 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
        >
          <EditableText field="secondaryCta.label" value={content.secondaryCta.label} />
          {" "}→
        </a>
      ) : null}
    </div>
  );

  if (variant === "split") {
    return (
      <PlaceholderSection section={section} variant={variant} className="bg-neutral-950 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-[1.2fr_1fr] md:items-center md:gap-16 md:px-10 md:py-24">
          <div>
            <EditableText
              as="h2"
              field="heading"
              value={content.heading}
              className="text-3xl font-semibold tracking-tight md:text-5xl"
            />
            {content.subhead ? (
              <EditableText
                as="p"
                field="subhead"
                multiline
                value={content.subhead}
                className="mt-4 text-lg text-white/70"
              />
            ) : null}
          </div>
          <div className="md:justify-self-end">{ctas}</div>
        </div>
      </PlaceholderSection>
    );
  }

  return (
    <PlaceholderSection section={section} variant={variant} className="bg-neutral-950 text-white">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-20 text-center md:px-10 md:py-28">
        <EditableText
          as="h2"
          field="heading"
          value={content.heading}
          className="text-3xl font-semibold tracking-tight md:text-5xl"
        />
        {content.subhead ? (
          <EditableText
            as="p"
            field="subhead"
            multiline
            value={content.subhead}
            className="mt-4 text-lg text-white/70"
          />
        ) : null}
        <div className="mt-8">{ctas}</div>
      </div>
    </PlaceholderSection>
  );
}
