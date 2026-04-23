import type { Section } from "@yappaflow/types";
import { PlaceholderSection } from "../internal/placeholder.js";
import { EditableText } from "../internal/editable-text.js";
import { HeroContentSchema } from "./schema.js";
import { DEFAULT_HERO_VARIANT } from "./variants.js";

export function HeroSection({ section }: { section: Section }) {
  const parsed = HeroContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_HERO_VARIANT;

  if (!content) {
    return (
      <PlaceholderSection section={section} variant={variant} className="bg-white p-8 text-neutral-500">
        <em>invalid hero content</em>
      </PlaceholderSection>
    );
  }

  const media = (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-200 via-neutral-300 to-neutral-400">
      {content.media?.url ? (
        <img
          src={content.media.url}
          alt={content.media.alt ?? ""}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
    </div>
  );

  const copy = (
    <div className="max-w-xl">
      {content.eyebrow ? (
        <EditableText
          as="p"
          field="eyebrow"
          value={content.eyebrow}
          className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-neutral-500"
        />
      ) : null}
      <EditableText
        as="h1"
        field="heading"
        value={content.heading}
        className="text-4xl font-semibold leading-[1.05] tracking-tight text-neutral-950 md:text-6xl"
      />
      {content.subhead ? (
        <EditableText
          as="p"
          field="subhead"
          multiline
          value={content.subhead}
          className="mt-5 text-lg leading-relaxed text-neutral-600 md:text-xl"
        />
      ) : null}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <a
          href={content.primaryCta.href}
          className="inline-flex items-center rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          <EditableText
            field="primaryCta.label"
            value={content.primaryCta.label}
          />
        </a>
        {content.secondaryCta ? (
          <a
            href={content.secondaryCta.href}
            className="inline-flex items-center rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-800 transition hover:border-neutral-500"
          >
            <EditableText
              field="secondaryCta.label"
              value={content.secondaryCta.label}
            />
            {" "}→
          </a>
        ) : null}
      </div>
    </div>
  );

  if (variant === "fullscreen-media") {
    return (
      <PlaceholderSection section={section} variant={variant} className="relative isolate overflow-hidden bg-neutral-900 text-white">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-neutral-800 via-neutral-900 to-black">
          {content.media?.url ? (
            <img
              src={content.media.url}
              alt={content.media.alt ?? ""}
              className="h-full w-full object-cover opacity-60"
            />
          ) : null}
        </div>
        <div className="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center px-6 py-24 text-center md:px-10">
          {content.eyebrow ? (
            <EditableText
              as="p"
              field="eyebrow"
              value={content.eyebrow}
              className="mb-4 text-xs font-medium uppercase tracking-[0.24em] text-white/70"
            />
          ) : null}
          <EditableText
            as="h1"
            field="heading"
            value={content.heading}
            className="text-4xl font-semibold leading-[1.05] tracking-tight md:text-7xl"
          />
          {content.subhead ? (
            <EditableText
              as="p"
              field="subhead"
              multiline
              value={content.subhead}
              className="mt-5 max-w-2xl text-lg text-white/80 md:text-xl"
            />
          ) : null}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
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
        </div>
      </PlaceholderSection>
    );
  }

  if (variant === "centered") {
    return (
      <PlaceholderSection section={section} variant={variant} className="bg-white">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-24 text-center md:px-10 md:py-32">
          {content.eyebrow ? (
            <EditableText
              as="p"
              field="eyebrow"
              value={content.eyebrow}
              className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-neutral-500"
            />
          ) : null}
          <EditableText
            as="h1"
            field="heading"
            value={content.heading}
            className="text-4xl font-semibold leading-[1.05] tracking-tight text-neutral-950 md:text-7xl"
          />
          {content.subhead ? (
            <EditableText
              as="p"
              field="subhead"
              multiline
              value={content.subhead}
              className="mt-5 max-w-2xl text-lg text-neutral-600 md:text-xl"
            />
          ) : null}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={content.primaryCta.href}
              className="inline-flex items-center rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              <EditableText field="primaryCta.label" value={content.primaryCta.label} />
            </a>
            {content.secondaryCta ? (
              <a
                href={content.secondaryCta.href}
                className="inline-flex items-center rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-800 transition hover:border-neutral-500"
              >
                <EditableText field="secondaryCta.label" value={content.secondaryCta.label} />
                {" "}→
              </a>
            ) : null}
          </div>
        </div>
      </PlaceholderSection>
    );
  }

  // split (default)
  return (
    <PlaceholderSection section={section} variant={variant} className="bg-white">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:items-center md:gap-16 md:px-10 md:py-28">
        {copy}
        {media}
      </div>
    </PlaceholderSection>
  );
}
