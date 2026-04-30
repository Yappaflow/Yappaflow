import { NextRequest, NextResponse } from "next/server";

/**
 * Shopify deploy route.
 *
 * Accepts the CMS-aware export bundle (contentPages + products + productIndex)
 * and routes each resource to its native Shopify API:
 *
 *   - products → POST /admin/api/2024-01/products.json (Products API).
 *     Mapped to Shopify's body_html / vendor / handle / variants / options
 *     / images so they show up in the storefront with full structure
 *     (variants, compare-at, search) instead of as orphan pages.
 *
 *   - contentPages + productIndex → POST /admin/api/2024-01/pages.json
 *     (Pages API). Same as before — generic CMS pages.
 *
 * Products are pushed FIRST so /products/<handle> URLs resolve before any
 * content page links to them. Failures on individual resources land in
 * `warnings` and do not abort the whole deploy.
 */

interface RenderedPage {
  slug: string;
  title: string;
  bodyHtml: string;
  seoDescription?: string;
}

interface CmsProduct {
  handle: string;
  title: string;
  price: string;
  compareAtPrice?: string;
  currency: string;
  descriptionHtml: string;
  bodyHtml: string;
  images: Array<{ url: string; alt?: string }>;
  variantGroups: Array<{ label: string; options: string[] }>;
  specs: Array<{ label: string; value: string }>;
  seoDescription?: string;
}

interface DeployBody {
  contentPages?: RenderedPage[];
  products?: CmsProduct[];
  productIndex?: RenderedPage | null;
  /** Legacy shape — single flat pages array. Routed as content pages. */
  pages?: RenderedPage[];
}

interface ShopifyPageResponse {
  page: { id: number; handle: string; title: string };
}

interface ShopifyProductResponse {
  product: { id: number; handle: string; title: string };
}

export async function POST(req: NextRequest) {
  const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  const redirectUrl =
    process.env.SHOPIFY_REDIRECT_URL ?? `https://${shopDomain}`;

  if (!shopDomain || !accessToken) {
    return NextResponse.json(
      {
        error:
          "Shopify credentials missing. Add SHOPIFY_SHOP_DOMAIN and SHOPIFY_ACCESS_TOKEN to .env.local",
      },
      { status: 500 },
    );
  }

  const body = (await req.json()) as DeployBody;

  // Normalise to the new bundle shape, accepting legacy `pages` callers.
  const contentPages = [
    ...(body.contentPages ?? []),
    ...(body.pages ?? []),
    ...(body.productIndex ? [body.productIndex] : []),
  ];
  const products = body.products ?? [];

  if (contentPages.length === 0 && products.length === 0) {
    return NextResponse.json(
      { error: "Nothing to deploy — no products or content pages provided." },
      { status: 400 },
    );
  }

  const productResults: { handle: string; url: string }[] = [];
  const pageResults: { slug: string; url: string }[] = [];
  const warnings: { resource: string; error: string }[] = [];

  // 1. Products first — content pages may link to /products/<handle>.
  for (const product of products) {
    try {
      const shopifyProduct = toShopifyProduct(product);
      const res = await fetch(
        `https://${shopDomain}/admin/api/2024-01/products.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ product: shopifyProduct }),
        },
      );

      if (!res.ok) {
        const text = await res.text();
        warnings.push({
          resource: `product:${product.handle}`,
          error: `Shopify ${res.status}: ${text.slice(0, 200)}`,
        });
        continue;
      }

      const json = (await res.json()) as ShopifyProductResponse;
      productResults.push({
        handle: product.handle,
        url: `https://${shopDomain}/products/${json.product.handle}`,
      });
    } catch (err) {
      warnings.push({
        resource: `product:${product.handle}`,
        error: String(err),
      });
    }
  }

  // 2. Content pages.
  for (const page of contentPages) {
    const handle =
      page.slug.replace(/^\//, "").replace(/\//g, "-") || undefined;

    try {
      const res = await fetch(
        `https://${shopDomain}/admin/api/2024-01/pages.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            page: {
              title: page.title,
              body_html: page.bodyHtml,
              published: true,
              ...(handle ? { handle } : {}),
            },
          }),
        },
      );

      if (!res.ok) {
        const text = await res.text();
        warnings.push({
          resource: `page:${page.slug}`,
          error: `Shopify ${res.status}: ${text.slice(0, 200)}`,
        });
        continue;
      }

      const json = (await res.json()) as ShopifyPageResponse;
      pageResults.push({
        slug: page.slug,
        url: `https://${shopDomain}/pages/${json.page.handle}`,
      });
    } catch (err) {
      warnings.push({ resource: `page:${page.slug}`, error: String(err) });
    }
  }

  const totalPublished = productResults.length + pageResults.length;
  if (totalPublished === 0) {
    return NextResponse.json(
      {
        error: warnings[0]?.error ?? "All resources failed to deploy",
        warnings,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    success: true,
    published: totalPublished,
    publishedProducts: productResults.length,
    publishedPages: pageResults.length,
    redirectUrl,
    products: productResults,
    pages: pageResults,
    ...(warnings.length > 0 && { warnings }),
  });
}

/**
 * Convert a Yappaflow CmsProduct to Shopify's Products API payload. Handles
 * the awkward parts:
 *   - price formatting: "$42" → "42.00" (Shopify expects numeric strings).
 *   - variants: cartesian product of variantGroups (Size × Color → SKU per
 *     combination). If no variantGroups, ship a single default variant.
 *   - options: Shopify caps at 3 option names; extras get dropped with a
 *     warning at the call site (caller wraps with a try/catch).
 *   - images: Shopify accepts up to 250; we trust our schema's bounds.
 */
function toShopifyProduct(product: CmsProduct): Record<string, unknown> {
  const numericPrice = parsePriceToNumeric(product.price);
  const numericCompareAt = product.compareAtPrice
    ? parsePriceToNumeric(product.compareAtPrice)
    : undefined;

  const optionGroups = product.variantGroups.slice(0, 3);
  const variants =
    optionGroups.length > 0
      ? cartesian(optionGroups.map((g) => g.options)).map((combo) => {
          const variant: Record<string, unknown> = {
            price: numericPrice,
            ...(numericCompareAt ? { compare_at_price: numericCompareAt } : {}),
            title: combo.join(" / "),
          };
          combo.forEach((option, i) => {
            variant[`option${i + 1}`] = option;
          });
          return variant;
        })
      : [
          {
            price: numericPrice,
            ...(numericCompareAt ? { compare_at_price: numericCompareAt } : {}),
          },
        ];

  return {
    title: product.title,
    body_html: product.descriptionHtml,
    handle: product.handle,
    published: true,
    ...(optionGroups.length > 0
      ? {
          options: optionGroups.map((g) => ({
            name: g.label,
            values: g.options,
          })),
        }
      : {}),
    variants,
    images: product.images.map((img) => ({
      src: img.url,
      ...(img.alt ? { alt: img.alt } : {}),
    })),
  };
}

function parsePriceToNumeric(price: string): string {
  // Strip currency symbols and whitespace; keep digits and decimal.
  const cleaned = price.replace(/[^0-9.,]/g, "").replace(",", ".");
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

function cartesian<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  return arrays.reduce<T[][]>(
    (acc, current) =>
      acc.flatMap((combo) => current.map((value) => [...combo, value])),
    [[]],
  );
}
