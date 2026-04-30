"use client";

import { renderToStaticMarkup } from "react-dom/server";
import { createElement, Fragment, type ReactNode } from "react";
import JSZip from "jszip";
import { SECTIONS } from "@yappaflow/sections";
import type { Page, Section, SiteProject } from "@yappaflow/types";
import {
  EXPORT_RUNTIME_CSS,
  EXPORT_RUNTIME_JS,
  EXPORT_RUNTIME_FILENAMES,
} from "./export-runtime";

/**
 * Structured product, as adapters need it to talk to native product APIs
 * (Shopify Products, IKAS Products, WooCommerce). Independent of the
 * rendered HTML — adapters that map to native products use these fields;
 * adapters that fall back to generic pages can render the full body via
 * `bodyHtml`.
 */
export interface CmsProduct {
  handle: string;
  title: string;
  price: string;
  compareAtPrice?: string;
  currency: string;
  descriptionHtml: string;
  /** Full rendered page (sections only, no globals) — fallback for adapters that don't support native products. */
  bodyHtml: string;
  images: Array<{ url: string; alt?: string }>;
  variantGroups: Array<{ label: string; options: string[] }>;
  specs: Array<{ label: string; value: string }>;
  seoDescription?: string;
}

/**
 * Client-side HTML export.
 *
 * Walks every page in the SiteProject, renders each via React's static
 * markup renderer, wraps the result in a minimal HTML shell, and bundles
 * the whole thing as a ZIP the agency can download and deploy anywhere
 * that serves static files (Netlify, Vercel, S3, their own server).
 *
 * Constraints we accept for this MVP path:
 *   - Tailwind loads via the Play CDN at runtime. Fine for previews and
 *     early deploys; agencies should swap to a compiled build for prod.
 *   - yappaflow-ui CSS tokens are fetched from the same CDN that serves
 *     the package to Next — self-contained copy ships in Phase 10's
 *     adapter-v2 work.
 *   - No JS runtime yet — GSAP animations don't play in the export.
 *     Initial paint is static HTML. Phase 11 ships the runtime.
 *
 * The real CMS-native exports (Shopify, Webflow, WordPress, IKAS) come
 * from the MCP's adapters-v2 in Phase 10. This client-side HTML path is
 * the "any static host" fallback that ships today.
 */

export interface ExportResult {
  blob: Blob;
  filename: string;
  files: string[];
}

export interface CmsRenderedPage {
  slug: string;
  title: string;
  /** Page sections only — no global header/footer — ready to paste into CMS body fields. */
  bodyHtml: string;
  seoDescription?: string;
}

/**
 * CMS-aware export. Splits the project into three streams so each CMS
 * adapter can route them to the right native API:
 *
 *   - `contentPages`: regular content pages (home, about, etc.). Adapter
 *     POSTs them to the CMS's pages API (Shopify Pages, WP pages,
 *     Webflow CMS items).
 *   - `products`: structured product detail. Adapter POSTs them to the
 *     CMS's native product API (Shopify Products, IKAS Products,
 *     WooCommerce). `bodyHtml` is provided as a fallback for adapters
 *     that don't support native products yet.
 *   - `productIndex`: the catalog landing (`/products`). Stays a content
 *     page on every target — the listing comes from native collection
 *     logic, not from this body HTML.
 *
 * Routing is driven by `Page.kind` (added in SiteProject schema v2). The
 * persistence migration stamps it on legacy projects via slug inference.
 */
export interface CmsExportBundle {
  contentPages: CmsRenderedPage[];
  products: CmsProduct[];
  productIndex: CmsRenderedPage | null;
}

export function exportForCms(project: SiteProject): CmsExportBundle {
  const slugToFile = new Map<string, string>();
  for (const page of project.pages) {
    slugToFile.set(normalizeSlug(page.slug), slugToFilename(page.slug));
  }

  const contentPages: CmsRenderedPage[] = [];
  const products: CmsProduct[] = [];
  let productIndex: CmsRenderedPage | null = null;

  for (const page of project.pages) {
    const rendered = renderPageBody(page, slugToFile);
    const kind = page.kind ?? "content";
    if (kind === "product") {
      const product = extractProduct(page, rendered.bodyHtml);
      if (product) {
        products.push(product);
      } else {
        // Couldn't pull structured product data — fall back to a content
        // page so the page is at least published (with a warning logged
        // server-side once the adapter consumes the bundle).
        contentPages.push(rendered);
      }
    } else if (kind === "product-index") {
      productIndex = rendered;
    } else {
      contentPages.push(rendered);
    }
  }

  return { contentPages, products, productIndex };
}

/**
 * Legacy single-stream export. Kept so existing call sites in the deploy
 * modal don't break — internally rebuilds the flat list adapters used to
 * receive. New adapters should consume `exportForCms` directly.
 */
export function exportPagesForCms(project: SiteProject): CmsRenderedPage[] {
  const bundle = exportForCms(project);
  const out: CmsRenderedPage[] = [...bundle.contentPages];
  // Append products as generic pages with their fully-rendered body — old
  // adapters publish them somewhere rather than dropping them.
  for (const product of bundle.products) {
    out.push({
      slug: `/products/${product.handle}`,
      title: product.title,
      bodyHtml: product.bodyHtml,
      seoDescription: product.seoDescription,
    });
  }
  if (bundle.productIndex) out.push(bundle.productIndex);
  return out;
}

function renderPageBody(
  page: Page,
  slugToFile: Map<string, string>,
): CmsRenderedPage {
  const children = page.sections.map((s) => renderSection(s, s.id));
  const markup = renderToStaticMarkup(createElement(Fragment, null, ...children));
  const bodyHtml = rewriteSlugHrefs(markup, slugToFile);
  return {
    slug: normalizeSlug(page.slug),
    title: page.title,
    bodyHtml,
    seoDescription: page.seo.description,
  };
}

/**
 * Pull structured product fields out of a product page's product-detail
 * section. Returns null if the page has no product-detail section — caller
 * decides whether to fall back to publishing the page as content.
 */
function extractProduct(page: Page, bodyHtml: string): CmsProduct | null {
  const detail = page.sections.find((s) => s.type === "product-detail");
  if (!detail) return null;
  const c = detail.content as {
    title?: string;
    price?: string;
    compareAtPrice?: string;
    currency?: string;
    description?: string;
    images?: Array<{ url?: string; alt?: string }>;
    variantGroups?: Array<{ label?: string; options?: string[] }>;
    specs?: Array<{ label?: string; value?: string }>;
  };

  const handle =
    page.productHandle ??
    page.slug.replace(/^\/products\//, "").split("/")[0] ??
    "";
  if (!handle) return null;

  // Description in the product-detail content is plain text; wrap as a
  // single <p> so adapters that expect HTML get well-formed input. If
  // empty, fall back to the rendered body so something useful ships.
  const descriptionHtml = c.description
    ? `<p>${escapeHtml(c.description)}</p>`
    : bodyHtml;

  return {
    handle,
    title: c.title ?? page.title,
    price: c.price ?? "",
    ...(c.compareAtPrice ? { compareAtPrice: c.compareAtPrice } : {}),
    currency: c.currency ?? "USD",
    descriptionHtml,
    bodyHtml,
    images: (c.images ?? [])
      .filter((img): img is { url: string; alt?: string } => Boolean(img.url))
      .map((img) => ({ url: img.url, ...(img.alt ? { alt: img.alt } : {}) })),
    variantGroups: (c.variantGroups ?? [])
      .filter((g): g is { label: string; options: string[] } =>
        Boolean(g.label) && Array.isArray(g.options) && g.options.length > 0,
      )
      .map((g) => ({ label: g.label, options: g.options })),
    specs: (c.specs ?? [])
      .filter((s): s is { label: string; value: string } =>
        Boolean(s.label) && Boolean(s.value),
      )
      .map((s) => ({ label: s.label, value: s.value })),
    seoDescription: page.seo.description,
  };
}

export async function exportSiteAsZip(
  project: SiteProject,
): Promise<ExportResult> {
  const zip = new JSZip();
  const files: string[] = [];

  // Build a slug → filename map up front so nav hrefs can be rewritten
  // deterministically across every rendered page.
  const slugToFile = new Map<string, string>();
  for (const page of project.pages) {
    slugToFile.set(normalizeSlug(page.slug), slugToFilename(page.slug));
  }

  for (const page of project.pages) {
    const filename = slugToFilename(page.slug);
    const html = renderPageHtml(project, page, slugToFile);
    zip.file(filename, html);
    files.push(filename);
  }

  // Animation runtime — shipped alongside every HTML page. Tiny
  // IntersectionObserver-based script that plays GSAP tweens for
  // [data-yf-anim] elements on scroll-into-view.
  zip.file(EXPORT_RUNTIME_FILENAMES.js, EXPORT_RUNTIME_JS);
  zip.file(EXPORT_RUNTIME_FILENAMES.css, EXPORT_RUNTIME_CSS);
  files.push(EXPORT_RUNTIME_FILENAMES.js);
  files.push(EXPORT_RUNTIME_FILENAMES.css);

  zip.file("site-project.json", JSON.stringify(project, null, 2));
  files.push("site-project.json");
  zip.file("README.txt", buildReadme(project));
  files.push("README.txt");

  const blob = await zip.generateAsync({ type: "blob" });
  const siteSlug = slugifyForFilename(
    project.pages[0]?.title ?? project.brief.industry ?? "site",
  );
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `yappaflow-${siteSlug}-${stamp}.zip`;

  return { blob, filename, files };
}

/**
 * Render a single page to an HTML string.
 * Order: announcement-bar → header → page sections → footer.
 * Links with slug-relative hrefs are rewritten to match the exported
 * filename scheme so the bundle works when opened directly from disk.
 */
function renderPageHtml(
  project: SiteProject,
  page: Page,
  slugToFile: Map<string, string>,
): string {
  const { header, footer, announcementBar } = project.globals;
  const children: ReactNode[] = [];
  if (announcementBar)
    children.push(renderSection(announcementBar, "announcement-bar"));
  if (header) children.push(renderSection(header, "header"));
  for (const section of page.sections) {
    children.push(renderSection(section, section.id));
  }
  if (footer) children.push(renderSection(footer, "footer"));

  const bodyMarkup = renderToStaticMarkup(
    createElement(Fragment, null, ...children),
  );
  const rewritten = rewriteSlugHrefs(bodyMarkup, slugToFile);

  const title = escapeHtml(page.title);
  const description = escapeHtml(page.seo.description ?? "");
  const ogImage = page.seo.ogImage?.url;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  ${description ? `<meta name="description" content="${description}">` : ""}
  ${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}">` : ""}
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="./${EXPORT_RUNTIME_FILENAMES.css}">
  <style>
    /* Minimal resets — Tailwind Preflight covers the rest. */
    html, body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    a { text-decoration: inherit; color: inherit; }
  </style>
</head>
<body class="bg-white text-neutral-900 antialiased">
${rewritten}
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.3.21/dist/lenis.min.js"></script>
<script src="./${EXPORT_RUNTIME_FILENAMES.js}"></script>
</body>
</html>
`;
}

function renderSection(section: Section, key: string): ReactNode {
  const def = SECTIONS[section.type];
  if (!def) {
    return createElement(
      "div",
      {
        key,
        style: { background: "#fee2e2", color: "#b91c1c", padding: "16px" },
      },
      `[Yappaflow export] Unknown section type: ${section.type}`,
    );
  }
  const Component = def.Component;
  return createElement(Component, { key, section });
}

/**
 * Rewrite in-app slug hrefs to the exported filename scheme so nav links
 * work when the bundle is served from any static host. Only rewrites
 * absolute-path hrefs (`/about`, `/shop`) that match a page slug; leaves
 * external URLs (https://…), anchor links (#about), and asset paths
 * (/images/foo.jpg) alone.
 */
function rewriteSlugHrefs(
  html: string,
  slugToFile: Map<string, string>,
): string {
  return html.replace(
    /href="([^"]+)"/g,
    (match, rawHref: string) => {
      if (rawHref.startsWith("#") || rawHref.startsWith("http") || rawHref.startsWith("mailto:")) {
        return match;
      }
      const candidate = normalizeSlug(rawHref);
      const mapped = slugToFile.get(candidate);
      if (!mapped) return match;
      return `href="./${mapped}"`;
    },
  );
}

function slugToFilename(slug: string): string {
  const normalized = normalizeSlug(slug);
  if (normalized === "/") return "index.html";
  const trimmed = normalized.replace(/^\//, "");
  if (trimmed.endsWith(".html")) return trimmed;
  return `${trimmed}.html`;
}

function normalizeSlug(slug: string): string {
  if (!slug) return "/";
  if (slug === "/") return "/";
  return slug.startsWith("/") ? slug : `/${slug}`;
}

function slugifyForFilename(input: string): string {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "site"
  );
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildReadme(project: SiteProject): string {
  const pageLines = project.pages
    .map((p) => `  - ${p.slug}  →  ${slugToFilename(p.slug)}  (${p.title})`)
    .join("\n");
  return `# Yappaflow export

Generated ${new Date().toISOString()}

## Files

${pageLines}
  - yf-animations.js    (GSAP reveal runtime — plays animations on scroll)
  - yf-animations.css   (initial-state rules for animated sections)
  - site-project.json   (canonical SiteProject data — useful for re-importing)
  - README.txt          (this file)

## How to preview

Open any .html file in a browser directly — Tailwind loads from its
Play CDN at runtime, so the page styles itself. No build step needed.

## How to deploy

Any static host works: Netlify drop, Vercel deploy, S3 + CloudFront,
GitHub Pages, your own nginx. Upload the extracted folder and point
your domain at it.

## Limitations of this export

- Tailwind loads from a CDN. For production, swap to a compiled
  stylesheet (\`npx tailwindcss -i input.css -o out.css --minify\`).
- GSAP animations play on scroll-into-view via the bundled
  yf-animations.js runtime. Fade/slide/scale/stagger presets work
  out-of-the-box; ScrollTrigger-based presets (parallax, pin, scrub)
  ship in a future update.
- Image URLs in the site reference whatever the SiteProject has
  recorded (local paths like /images/hero.jpg won't resolve unless you
  provide those files yourself).

Brief: ${project.brief.industry}${project.brief.subcategory ? " / " + project.brief.subcategory : ""}
Pages: ${project.pages.length}
`;
}
