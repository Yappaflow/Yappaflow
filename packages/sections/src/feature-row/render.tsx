import type { Section } from "@yappaflow/types";
import { PlaceholderSection } from "../internal/placeholder.js";
import { EditableText } from "../internal/editable-text.js";
import { FeatureRowContentSchema } from "./schema.js";
import { DEFAULT_FEATURE_ROW_VARIANT } from "./variants.js";

export function FeatureRowSection({ section }: { section: Section }) {
  const parsed = FeatureRowContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_FEATURE_ROW_VARIANT;

  if (!content) {
    return (
      <PlaceholderSection section={section} variant={variant} className="bg-white p-8 text-neutral-500">
        <em>invalid feature-row content</em>
      </PlaceholderSection>
    );
  }

  const imageFirst = variant === "image-left";

  const media = (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-100 via-neutral-200 to-neutral-300">
      {content.media.url ? (
        <img
          src={content.media.url}
          alt={content.media.alt ?? ""}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
    </div>
  );

  const copy = (
    <div className="max-w-lg">
      {content.eyebrow ? (
        <EditableText
          as="p"
          field="eyebrow"
          value={content.eyebrow}
          className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-neutral-500"
        />
      ) : null}
      <EditableText
        as="h2"
        field="heading"
        value={content.heading}
        className="text-3xl font-semibold tracking-tight text-neutral-950 md:text-5xl"
      />
      <EditableText
        as="p"
        field="body"
        multiline
        value={content.body}
        className="mt-5 text-lg leading-relaxed text-neutral-600"
      />
      {content.bullets.length > 0 ? (
        <ul className="mt-6 space-y-2 text-neutral-700">
          {content.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-2 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-900"
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {content.cta ? (
        <a
          href={content.cta.href}
          className="mt-8 inline-flex items-center rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-800 transition hover:border-neutral-500"
        >
          <EditableText field="cta.label" value={content.cta.label} />
          {" "}→
        </a>
      ) : null}
    </div>
  );

  return (
    <PlaceholderSection section={section} variant={variant} className="bg-neutral-50">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:items-center md:gap-16 md:px-10 md:py-28">
        {imageFirst ? (
          <>
            {media}
            {copy}
          </>
        ) : (
          <>
            {copy}
            {media}
          </>
        )}
      </div>
    </PlaceholderSection>
  );
}
