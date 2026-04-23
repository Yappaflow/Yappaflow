"use client";

import { renderToStaticMarkup } from "react-dom/server";
import { createElement, Fragment, type ReactNode } from "react";
import JSZip from "jszip";
import { SECTIONS } from "@yappaflow/sections";
import type { Page, Section, SiteProject } from "@yappaflow/types";

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
  <style>
    /* Minimal resets — Tailwind Preflight covers the rest. */
    html, body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    a { text-decoration: inherit; color: inherit; }
  </style>
</head>
<body class="bg-white text-neutral-900 antialiased">
${rewritten}
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
- GSAP scroll/reveal animations don't play — this is a static bundle.
  Phase 11's animation runtime will ship with future exports.
- Image URLs in the site reference whatever the SiteProject has
  recorded (local paths like /images/hero.jpg won't resolve unless you
  provide those files yourself).

Brief: ${project.brief.industry}${project.brief.subcategory ? " / " + project.brief.subcategory : ""}
Pages: ${project.pages.length}
`;
}
