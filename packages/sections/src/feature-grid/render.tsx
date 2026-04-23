import type { Section } from "@yappaflow/types";
import { PlaceholderSection } from "../internal/placeholder.js";
import { EditableText } from "../internal/editable-text.js";
import { FeatureGridContentSchema } from "./schema.js";
import { DEFAULT_FEATURE_GRID_VARIANT } from "./variants.js";

const COLUMN_CLASS: Record<2 | 3 | 4, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 lg:grid-cols-3",
  4: "md:grid-cols-2 lg:grid-cols-4",
};

export function FeatureGridSection({ section }: { section: Section }) {
  const parsed = FeatureGridContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_FEATURE_GRID_VARIANT;

  if (!content) {
    return (
      <PlaceholderSection section={section} variant={variant} className="bg-white p-8 text-neutral-500">
        <em>invalid feature-grid content</em>
      </PlaceholderSection>
    );
  }

  return (
    <PlaceholderSection section={section} variant={variant} className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28">
        <header className="max-w-2xl">
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
          {content.subhead ? (
            <EditableText
              as="p"
              field="subhead"
              multiline
              value={content.subhead}
              className="mt-4 text-lg text-neutral-600"
            />
          ) : null}
        </header>
        <div
          className={`mt-12 grid gap-10 md:mt-16 md:gap-12 ${COLUMN_CLASS[content.columns]}`}
        >
          {content.features.map((f, i) => (
            <article key={`${f.title}-${i}`} className="flex flex-col gap-3">
              {variant === "images" && f.image?.url ? (
                <div className="mb-2 aspect-[4/3] overflow-hidden rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200">
                  <img
                    src={f.image.url}
                    alt={f.image.alt ?? f.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div
                  aria-hidden="true"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900 text-white"
                >
                  <span className="text-sm font-semibold">
                    {(f.icon ?? f.title).slice(0, 1).toUpperCase()}
                  </span>
                </div>
              )}
              <h3 className="text-lg font-semibold text-neutral-950">{f.title}</h3>
              <p className="text-neutral-600">{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </PlaceholderSection>
  );
}
