import type { Section } from "@yappaflow/types";
import { PlaceholderSection } from "../internal/placeholder.js";
import { EditableText } from "../internal/editable-text.js";
import { useProductLibrary } from "../internal/product-library-context.js";
import { ProductDetailContentSchema, type ProductDetailContent } from "./schema.js";
import { DEFAULT_PRODUCT_DETAIL_VARIANT } from "./variants.js";

/**
 * When `productId` is set and a matching library product is mounted in
 * context, the catalog fields (title/price/images/...) come from the live
 * library; everything else (eyebrow, CTAs) stays under the section's inline
 * control so each merchandising page can have its own voice.
 *
 * Library fields override inline ones — the agency edits the product once,
 * every detail page reflects it. If the agency wants a one-off, they unset
 * `productId` and the inline fields take over.
 */
function hydrateFromLibrary(
  content: ProductDetailContent,
  library: readonly { id: string; title: string; price: string; compareAtPrice?: string; currency: string; description: string; images: ProductDetailContent["images"]; variantGroups: ProductDetailContent["variantGroups"]; specs: ProductDetailContent["specs"] }[],
): ProductDetailContent {
  if (!content.productId) return content;
  const product = library.find((p) => p.id === content.productId);
  if (!product) return content;
  return {
    ...content,
    title: product.title,
    price: product.price,
    ...(product.compareAtPrice !== undefined ? { compareAtPrice: product.compareAtPrice } : {}),
    currency: product.currency,
    // Description: library wins only if non-empty, so a new product with no
    // description doesn't blank the page over inline copy.
    description: product.description || content.description,
    images: product.images.length > 0 ? product.images : content.images,
    variantGroups: product.variantGroups.length > 0 ? product.variantGroups : content.variantGroups,
    specs: product.specs.length > 0 ? product.specs : content.specs,
  };
}

export function ProductDetailSection({ section }: { section: Section }) {
  const parsed = ProductDetailContentSchema.safeParse(section.content);
  const rawContent = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_PRODUCT_DETAIL_VARIANT;
  const library = useProductLibrary();

  if (!rawContent) {
    return (
      <PlaceholderSection section={section} variant={variant} className="bg-white p-8 text-neutral-500">
        <em>invalid product-detail content</em>
      </PlaceholderSection>
    );
  }

  const content = hydrateFromLibrary(rawContent, library);
  // When library-bound, the EditableText fields for catalog properties are
  // disabled — edits would be silently overwritten on the next render. CTAs
  // and eyebrow stay editable because they're not library-sourced.
  const libraryBound = Boolean(rawContent.productId && library.find((p) => p.id === rawContent.productId));

  const hero = content.images[0]!;

  const gallery = (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-200">
        <img
          src={hero.url}
          alt={hero.alt ?? content.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
      {content.images.length > 1 ? (
        <div className="grid grid-cols-4 gap-3">
          {content.images.slice(1, 5).map((img, i) => (
            <div
              key={i}
              className="aspect-square overflow-hidden rounded-lg bg-neutral-100"
            >
              <img
                src={img.url}
                alt={img.alt ?? ""}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );

  const info = (
    <div className="flex flex-col gap-6">
      <div>
        {content.eyebrow ? (
          <EditableText
            as="p"
            field="eyebrow"
            value={content.eyebrow}
            className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500"
          />
        ) : null}
        {libraryBound ? (
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 md:text-4xl">
            {content.title}
          </h1>
        ) : (
          <EditableText
            as="h1"
            field="title"
            value={content.title}
            className="text-3xl font-semibold tracking-tight text-neutral-950 md:text-4xl"
          />
        )}
        <div className="mt-4 flex items-baseline gap-3">
          {libraryBound ? (
            <span className="text-2xl font-medium text-neutral-900">
              {content.price}
            </span>
          ) : (
            <EditableText
              as="span"
              field="price"
              value={content.price}
              className="text-2xl font-medium text-neutral-900"
            />
          )}
          {content.compareAtPrice ? (
            libraryBound ? (
              <span className="text-lg text-neutral-400 line-through">
                {content.compareAtPrice}
              </span>
            ) : (
              <EditableText
                as="span"
                field="compareAtPrice"
                value={content.compareAtPrice}
                className="text-lg text-neutral-400 line-through"
              />
            )
          ) : null}
        </div>
      </div>

      {content.variantGroups.length > 0 ? (
        <div className="flex flex-col gap-4">
          {content.variantGroups.map((group, i) => (
            <div key={`${group.label}-${i}`}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.options.map((option, j) => (
                  <button
                    key={`${option}-${j}`}
                    type="button"
                    className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm text-neutral-800 transition hover:border-neutral-900"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {libraryBound ? (
        <p className="whitespace-pre-line text-base leading-relaxed text-neutral-700">
          {content.description}
        </p>
      ) : (
        <EditableText
          as="p"
          field="description"
          multiline
          value={content.description}
          className="text-base leading-relaxed text-neutral-700"
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <a
          href={content.primaryCta.href}
          className="inline-flex items-center rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          <EditableText
            field="primaryCta.label"
            value={content.primaryCta.label}
          />
        </a>
        {content.secondaryCta ? (
          <a
            href={content.secondaryCta.href}
            className="inline-flex items-center rounded-full border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-800 transition hover:border-neutral-500"
          >
            <EditableText
              field="secondaryCta.label"
              value={content.secondaryCta.label}
            />
          </a>
        ) : null}
      </div>

      {content.specs.length > 0 ? (
        <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 border-t border-neutral-200 pt-6 text-sm">
          {content.specs.map((spec, i) => (
            <div key={`${spec.label}-${i}`} className="contents">
              <dt className="text-neutral-500">{spec.label}</dt>
              <dd className="text-neutral-900">{spec.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );

  if (variant === "stacked") {
    return (
      <PlaceholderSection section={section} variant={variant} className="bg-white">
        <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16 md:px-10 md:py-20">
          {gallery}
          {info}
        </div>
      </PlaceholderSection>
    );
  }

  return (
    <PlaceholderSection section={section} variant={variant} className="bg-white">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-[1.1fr_1fr] md:gap-16 md:px-10 md:py-20">
        {gallery}
        {info}
      </div>
    </PlaceholderSection>
  );
}
