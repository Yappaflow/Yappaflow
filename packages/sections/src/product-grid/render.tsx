import type { Section } from "@yappaflow/types";
import { PlaceholderSection } from "../internal/placeholder.js";
import { EditableText } from "../internal/editable-text.js";
import { ProductGridContentSchema } from "./schema.js";
import { DEFAULT_PRODUCT_GRID_VARIANT } from "./variants.js";

const COLUMN_CLASS: Record<2 | 3 | 4, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 lg:grid-cols-3",
  4: "md:grid-cols-2 lg:grid-cols-4",
};

export function ProductGridSection({ section }: { section: Section }) {
  const parsed = ProductGridContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_PRODUCT_GRID_VARIANT;

  if (!content) {
    return (
      <PlaceholderSection section={section} variant={variant} className="bg-white p-8 text-neutral-500">
        <em>invalid product-grid content</em>
      </PlaceholderSection>
    );
  }

  return (
    <PlaceholderSection section={section} variant={variant} className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28">
        <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-xl">
            {content.eyebrow ? (
              <EditableText
                as="p"
                field="eyebrow"
                value={content.eyebrow}
                className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-neutral-500"
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
                className="mt-3 text-lg text-neutral-600"
              />
            ) : null}
          </div>
          {content.ctaAll ? (
            <a
              href={content.ctaAll.href}
              className="text-sm font-medium text-neutral-900 underline underline-offset-4 hover:no-underline"
            >
              <EditableText field="ctaAll.label" value={content.ctaAll.label} />
              {" "}→
            </a>
          ) : null}
        </header>
        <div
          className={`mt-10 grid grid-cols-2 gap-6 md:mt-14 md:gap-8 ${COLUMN_CLASS[content.columns]}`}
        >
          {content.products.map((p, i) => (
            <a
              key={p.id}
              href={p.href}
              className="group flex flex-col gap-3 text-neutral-900"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200">
                <img
                  src={p.image.url}
                  alt={p.image.alt ?? p.title}
                  className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.02]"
                />
              </div>
              <div className="flex items-start justify-between gap-4">
                <EditableText
                  field={`products.${i}.title`}
                  value={p.title}
                  className={
                    variant === "minimal"
                      ? "text-sm font-medium"
                      : "text-base font-medium"
                  }
                />
                <div className="text-right text-sm">
                  {p.compareAtPrice ? (
                    <EditableText
                      field={`products.${i}.compareAtPrice`}
                      value={p.compareAtPrice}
                      className="mr-2 text-neutral-400 line-through"
                    />
                  ) : null}
                  <EditableText
                    field={`products.${i}.price`}
                    value={p.price}
                  />
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </PlaceholderSection>
  );
}
