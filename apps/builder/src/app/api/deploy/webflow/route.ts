import { NextRequest, NextResponse } from "next/server";

const WEBFLOW_BASE = "https://api.webflow.com/v2";

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

/**
 * Accepts the CMS-aware bundle (contentPages + products + productIndex)
 * AND the legacy single-stream `pages` shape. Until the Webflow adapter
 * gets a real Products CMS mapping (TODO), products are flattened into
 * the same RichText collection as content pages — they're still
 * publishable, just not as native Webflow Ecommerce products.
 */
interface DeployBody {
  contentPages?: RenderedPage[];
  products?: CmsProduct[];
  productIndex?: RenderedPage | null;
  pages?: RenderedPage[];
}

async function wf<T>(
  path: string,
  method: "GET" | "POST" | "PATCH",
  token: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${WEBFLOW_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Webflow ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`,
    );
  }
  return res.json() as Promise<T>;
}

export async function POST(req: NextRequest) {
  const token = process.env.WEBFLOW_API_TOKEN;
  const siteId = process.env.WEBFLOW_SITE_ID;
  const redirectUrl =
    process.env.WEBFLOW_REDIRECT_URL ?? "https://webflow.com/dashboard";

  if (!token || !siteId) {
    return NextResponse.json(
      {
        error:
          "Webflow credentials missing. Add WEBFLOW_API_TOKEN and WEBFLOW_SITE_ID to .env.local",
      },
      { status: 500 },
    );
  }

  const body = (await req.json()) as DeployBody;
  // Flatten the bundle: products ride along as RichText items until the
  // adapter gets a real Webflow Ecommerce mapping. Productindex appears as
  // a regular page so the catalog landing exists.
  const pages: RenderedPage[] = [
    ...(body.contentPages ?? []),
    ...(body.pages ?? []),
    ...(body.productIndex ? [body.productIndex] : []),
    ...(body.products ?? []).map((p) => ({
      slug: `/products/${p.handle}`,
      title: p.title,
      bodyHtml: p.bodyHtml,
      seoDescription: p.seoDescription,
    })),
  ];

  if (pages.length === 0) {
    return NextResponse.json({ error: "No pages provided" }, { status: 400 });
  }

  // 1. Find or create the "Yappaflow Pages" CMS collection
  const { collections } = await wf<{
    collections: Array<{ id: string; displayName: string }>;
  }>(`/sites/${siteId}/collections`, "GET", token).catch((err) => {
    throw new Error(`Could not list Webflow collections: ${err.message}`);
  });

  let collectionId = collections.find(
    (c) => c.displayName === "Yappaflow Pages",
  )?.id;

  if (!collectionId) {
    const created = await wf<{ id: string }>("/collections", "POST", token, {
      siteId,
      displayName: "Yappaflow Pages",
      singularName: "Page",
      fields: [
        { displayName: "HTML Body", isRequired: false, type: "RichText" },
        { displayName: "SEO Description", isRequired: false, type: "PlainText" },
      ],
    }).catch((err) => {
      throw new Error(`Could not create Webflow collection: ${err.message}`);
    });
    collectionId = created.id;
  }

  // 2. Create an item per page
  const results: { slug: string }[] = [];
  for (const page of pages) {
    const slug = page.slug.replace(/^\//, "") || "home";
    await wf(`/collections/${collectionId}/items`, "POST", token, {
      fieldData: {
        name: page.title,
        slug,
        "html-body": page.bodyHtml,
        "seo-description": page.seoDescription ?? "",
      },
      isDraft: false,
      isArchived: false,
    }).catch((err) =>
      console.error(
        `[yappaflow/webflow] item ${page.slug} failed:`,
        err.message,
      ),
    );
    results.push({ slug });
  }

  // 3. Publish the site (best-effort — may fail on free plans)
  await wf(`/sites/${siteId}/publish`, "POST", token, { domains: [] }).catch(
    (err) =>
      console.warn("[yappaflow/webflow] publish failed (continuing):", err.message),
  );

  return NextResponse.json({
    success: true,
    published: results.length,
    redirectUrl,
    collectionId,
    note: "Pages are in your Webflow CMS collection. Open the Webflow Designer to bind a template to the 'Yappaflow Pages' collection.",
  });
}
