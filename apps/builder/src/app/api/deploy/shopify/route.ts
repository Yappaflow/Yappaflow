import { NextRequest, NextResponse } from "next/server";

interface RenderedPage {
  slug: string;
  title: string;
  bodyHtml: string;
  seoDescription?: string;
}

interface DeployBody {
  pages: RenderedPage[];
}

interface ShopifyPageResponse {
  page: { id: number; handle: string; title: string };
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
  const { pages } = body;

  if (!Array.isArray(pages) || pages.length === 0) {
    return NextResponse.json({ error: "No pages provided" }, { status: 400 });
  }

  const results: { slug: string; url: string }[] = [];
  const warnings: { slug: string; error: string }[] = [];

  for (const page of pages) {
    // Derive a Shopify handle from the slug (e.g. /about → about, / → skipped as home)
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
          slug: page.slug,
          error: `Shopify ${res.status}: ${text.slice(0, 200)}`,
        });
        continue;
      }

      const json = (await res.json()) as ShopifyPageResponse;
      results.push({
        slug: page.slug,
        url: `https://${shopDomain}/pages/${json.page.handle}`,
      });
    } catch (err) {
      warnings.push({ slug: page.slug, error: String(err) });
    }
  }

  if (results.length === 0) {
    return NextResponse.json(
      { error: warnings[0]?.error ?? "All pages failed to deploy", warnings },
      { status: 502 },
    );
  }

  return NextResponse.json({
    success: true,
    published: results.length,
    redirectUrl,
    results,
    ...(warnings.length > 0 && { warnings }),
  });
}
