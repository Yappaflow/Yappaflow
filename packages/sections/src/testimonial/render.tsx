import type { Section } from "@yappaflow/types";
import { PlaceholderSection } from "../internal/placeholder.js";
import { EditableText } from "../internal/editable-text.js";
import { TestimonialContentSchema } from "./schema.js";
import { DEFAULT_TESTIMONIAL_VARIANT } from "./variants.js";

export function TestimonialSection({ section }: { section: Section }) {
  const parsed = TestimonialContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_TESTIMONIAL_VARIANT;

  if (!content) {
    return (
      <PlaceholderSection section={section} variant={variant} className="bg-white p-8 text-neutral-500">
        <em>invalid testimonial content</em>
      </PlaceholderSection>
    );
  }

  if (variant === "carousel" && content.items.length > 1) {
    return (
      <PlaceholderSection section={section} variant={variant} className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28">
          {content.eyebrow ? (
            <EditableText
              as="p"
              field="eyebrow"
              value={content.eyebrow}
              className="mb-4 text-center text-xs font-medium uppercase tracking-[0.2em] text-neutral-500"
            />
          ) : null}
          {content.heading ? (
            <EditableText
              as="h2"
              field="heading"
              value={content.heading}
              className="mb-10 text-center text-3xl font-semibold tracking-tight text-neutral-950 md:mb-14 md:text-5xl"
            />
          ) : null}
          <div className="grid gap-6 md:grid-cols-2">
            {content.items.map((t, i) => (
              <figure
                key={`${t.author}-${i}`}
                className="flex flex-col gap-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-8"
              >
                <blockquote className="text-lg leading-relaxed text-neutral-900">
                  <EditableText
                    as="span"
                    multiline
                    field={`items.${i}.quote`}
                    value={t.quote}
                    placeholder="Quote…"
                  />
                </blockquote>
                <figcaption className="text-sm text-neutral-600">
                  <EditableText
                    as="span"
                    field={`items.${i}.author`}
                    value={t.author}
                    className="font-medium text-neutral-900"
                  />
                  {t.role ? (
                    <>
                      <span className="opacity-70"> · </span>
                      <EditableText
                        as="span"
                        field={`items.${i}.role`}
                        value={t.role}
                        className="opacity-70"
                      />
                    </>
                  ) : null}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </PlaceholderSection>
    );
  }

  const first = content.items[0]!;
  return (
    <PlaceholderSection section={section} variant={variant} className="bg-white">
      <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-20 text-center md:px-10 md:py-28">
        {content.eyebrow ? (
          <EditableText
            as="p"
            field="eyebrow"
            value={content.eyebrow}
            className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-neutral-500"
          />
        ) : null}
        <blockquote className="text-2xl font-medium leading-snug text-neutral-950 md:text-4xl">
          <EditableText
            as="span"
            multiline
            field="items.0.quote"
            value={first.quote}
          />
        </blockquote>
        <figcaption className="mt-6 text-sm text-neutral-600">
          <EditableText
            as="span"
            field="items.0.author"
            value={first.author}
            className="font-medium text-neutral-900"
          />
          {first.role ? (
            <>
              <span className="opacity-70"> · </span>
              <EditableText
                as="span"
                field="items.0.role"
                value={first.role}
                className="opacity-70"
              />
            </>
          ) : null}
        </figcaption>
      </div>
    </PlaceholderSection>
  );
}
