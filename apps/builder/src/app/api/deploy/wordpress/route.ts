import { NextRequest, NextResponse } from "next/server";

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
 * AND the legacy single-stream `pages` shape. Until the WordPress adapter
 * detects WooCommerce and posts to /wp-json/wc/v3/products, products are
 * published as standard pages — still online, just not as WooCommerce
 * products with structured price/variants.
 */
interface DeployBody {
  contentPages?: RenderedPage[];
  products?: CmsProduct[];
  productIndex?: RenderedPage | null;
  pages?: RenderedPage[];
}

interface WpPageResponse {
  id: number;
  link: string;
  slug: string;
}

export async function POST(req: NextRequest) {
  const siteUrl = process.env.WORDPRESS_SITE_URL?.replace(/\/$/, "");
  const username = process.env.WORDPRESS_USERNAME;
  const appPassword = process.env.WORDPRESS_APP_PASSWORD;
  const redirectUrl = process.env.WORDPRESS_REDIRECT_URL ?? siteUrl ?? "";

  if (!siteUrl || !username || !appPassword) {
    return NextResponse.json(
      {
        error:
          "WordPress credentials missing. Add WORDPRESS_SITE_URL, WORDPRESS_USERNAME, and WORDPRESS_APP_PASSWORD to .env.local",
      },
      { status: 500 },
    );
  }

  const body = (await req.json()) as DeployBody;
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

  // WordPress Application Passwords use Basic auth: base64(user:password)
  const basicAuth = Buffer.from(`${username}:${appPassword}`).toString(
    "base64",
  );
  const results: { slug: string; url: string }[] = [];
  const warnings: { slug: string; error: string }[] = [];

  for (const page of pages) {
    const slug =
      page.slug === "/" ? "" : page.slug.replace(/^\//, "").replace(/\//g, "-");

    try {
      const res = await fetch(`${siteUrl}/wp-json/wp/v2/pages`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: { raw: page.title },
          content: { raw: page.bodyHtml },
          status: "publish",
          ...(slug ? { slug } : {}),
          ...(page.seoDescription
            ? { excerpt: { raw: page.seoDescription } }
            : {}),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        warnings.push({
          slug: page.slug,
          error: `WordPress ${res.status}: ${text.slice(0, 200)}`,
        });
        continue;
      }

      const json = (await res.json()) as WpPageResponse;
      results.push({ slug: page.slug, url: json.link });
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
