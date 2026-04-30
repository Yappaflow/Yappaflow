import { NextRequest, NextResponse } from "next/server";

/**
 * IKAS deploy route — skeleton.
 *
 * IKAS is a Turkish-built headless e-commerce platform. Storefront writes go
 * through their GraphQL Admin API. This route accepts the same CMS-aware
 * export bundle the Shopify route does (contentPages + products +
 * productIndex) so the deploy modal can target either platform without
 * transforming the payload.
 *
 * Status: structural skeleton. The OAuth/credentials flow, GraphQL mutations
 * for ProductSave / PageSave, and image upload pipeline are TODO — per the
 * monorepo's "adapters ship by demand" rule, this is left in canonical shape
 * until an agency commits to publishing through IKAS. When that happens, the
 * implementation goes here, not in a parallel file: callers should never
 * have to know whether IKAS is real or not.
 *
 * IKAS docs: https://docs.myikas.com/admin-api
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

export async function POST(req: NextRequest) {
  const apiUrl = process.env.IKAS_API_URL;
  const accessToken = process.env.IKAS_ACCESS_TOKEN;
  const redirectUrl = process.env.IKAS_REDIRECT_URL ?? apiUrl ?? "";

  if (!apiUrl || !accessToken) {
    return NextResponse.json(
      {
        error:
          "IKAS credentials missing. Add IKAS_API_URL and IKAS_ACCESS_TOKEN to .env.local. " +
          "The IKAS adapter is a skeleton — full publish support ships when an agency commits to the platform.",
      },
      { status: 501 },
    );
  }

  const body = (await req.json()) as DeployBody;
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

  // ─── TODO: products via GraphQL ProductSave mutation ────────────────
  // for (const product of products) {
  //   const mutation = `
  //     mutation SaveProduct($input: ProductInput!) {
  //       saveProduct(input: $input) { id name slug }
  //     }
  //   `;
  //   const variables = { input: toIkasProductInput(product) };
  //   const res = await ikasGraphql(apiUrl, accessToken, mutation, variables);
  //   if (res.ok) productResults.push({ handle: product.handle, url: ... });
  //   else warnings.push({ resource: `product:${product.handle}`, error: ... });
  // }
  for (const product of products) {
    warnings.push({
      resource: `product:${product.handle}`,
      error:
        "IKAS adapter not yet implemented. Product would map to ProductSave " +
        "GraphQL mutation with images, variantList, and price fields.",
    });
  }

  // ─── TODO: pages via GraphQL PageSave mutation ──────────────────────
  // for (const page of contentPages) {
  //   const mutation = `
  //     mutation SavePage($input: StorefrontPageInput!) {
  //       saveStorefrontPage(input: $input) { id slug htmlContent }
  //     }
  //   `;
  //   ...
  // }
  for (const page of contentPages) {
    warnings.push({
      resource: `page:${page.slug}`,
      error:
        "IKAS adapter not yet implemented. Page would map to a StorefrontPage " +
        "with htmlContent populated from bodyHtml.",
    });
  }

  // No actual writes happened — surface the skeleton state clearly.
  return NextResponse.json(
    {
      error:
        "IKAS adapter is a skeleton. The deploy bundle was received and shaped correctly — " +
        "wire ProductSave + PageSave GraphQL mutations to ship.",
      published: 0,
      publishedProducts: productResults.length,
      publishedPages: pageResults.length,
      redirectUrl,
      warnings,
    },
    { status: 501 },
  );
}
