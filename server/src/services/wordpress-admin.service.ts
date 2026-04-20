/**
 * WordPress REST API push service.
 *
 * Parallels `shopify-admin.service.ts`: given a merchant's stored
 * credentials (application password OR WP.com bearer token), it takes the
 * Yappaflow-generated bundle and pushes it directly into their site:
 *
 *   • Pages         → POST /wp/v2/pages          (Home, About, Contact)
 *   • Media uploads → POST /wp/v2/media          (product images)
 *   • Products      → POST /wc/v3/products       (when WooCommerce is active)
 *
 * Theme-asset upload is NOT done via REST in WordPress — WP core has no
 * REST endpoint for writing files under /wp-content/themes. Instead:
 *
 *   1. The download ZIP contains a fully-formed theme folder
 *      (wordpress-theme.zip at the root of the outer ZIP), uploadable at
 *      Appearance → Themes → Add New → Upload Theme.
 *   2. `pushWordPressBundle` publishes the data-side of the bundle (pages
 *      + products) directly, since that IS writable via REST, and returns
 *      the theme-zip path so the caller can link the merchant to it.
 *
 * This split mirrors the "manual ZIP vs direct push" pattern agencies
 * asked for on Shopify: the merchant can install the theme one-click
 * from the ZIP while Yappaflow takes care of the content.
 */

import axios, { type AxiosInstance } from "axios";

import {
  GeneratedArtifact,
  type IGeneratedArtifact,
} from "../models/GeneratedArtifact.model";
import {
  Project,
  type IProjectIdentity,
  type IProduct,
} from "../models/Project.model";
import type { WordPressFlavor } from "../models/PlatformConnection.model";
import { log, logError } from "../utils/logger";

// ── REST client ─────────────────────────────────────────────────────────────

export interface WordPressClientConfig {
  /** The normalized site URL (no trailing slash) — e.g. "https://example.com". */
  siteUrl:       string;
  /** "self_hosted" (basic-auth) or "dotcom" (bearer). */
  flavor:        WordPressFlavor;
  /** Decrypted application password (self-hosted) OR OAuth access token (dotcom). */
  accessToken:   string;
  /** Self-hosted only — the username the application password belongs to. */
  username?:     string;
  /** Dotcom only — the numeric blog id, needed for /sites/{id}/... endpoints. */
  siteId?:       string;
}

export interface WordPressClient {
  config:       WordPressClientConfig;
  /** Pre-configured axios instance with the right auth header + base URL. */
  http:         AxiosInstance;
  /** Core REST namespace base (…/wp-json/wp/v2). */
  wpV2:         string;
  /** WooCommerce REST namespace base (…/wp-json/wc/v3). */
  wcV3:         string;
}

export function buildWordPressClient(config: WordPressClientConfig): WordPressClient {
  if (!config.siteUrl) {
    throw new Error("WordPress client requires a siteUrl");
  }

  const authHeader =
    config.flavor === "self_hosted"
      ? (() => {
          if (!config.username) {
            throw new Error("Self-hosted WordPress requires a username");
          }
          // Strip whitespace from the app password — WordPress renders it
          // grouped ("abcd efgh ijkl …") but accepts it either way.
          const pwd = config.accessToken.replace(/\s+/g, "");
          const basic = Buffer.from(`${config.username}:${pwd}`, "utf8").toString("base64");
          return `Basic ${basic}`;
        })()
      : `Bearer ${config.accessToken}`;

  // WP.com proxies REST under /rest/v1.1/sites/{siteId}/... but it ALSO
  // honors the wp/v2 namespace via /wp/v2/sites/{siteId}/... for connected
  // Jetpack sites. We use the latter so the same route structure works for
  // both flavors. For a self-hosted site we just prepend /wp-json.
  const restRoot =
    config.flavor === "dotcom"
      ? `https://public-api.wordpress.com/wp/v2/sites/${config.siteId ?? ""}`
      : `${config.siteUrl}/wp-json/wp/v2`;

  const wcRoot =
    config.flavor === "dotcom"
      ? `https://public-api.wordpress.com/wc/v3/sites/${config.siteId ?? ""}`
      : `${config.siteUrl}/wp-json/wc/v3`;

  const http = axios.create({
    timeout: 30_000,
    headers: {
      Authorization: authHeader,
      Accept:        "application/json",
    },
    // Let callers inspect non-2xx bodies — useful for distinguishing
    // "WooCommerce not installed (404)" from "bad token (401)".
    validateStatus: () => true,
  });

  return {
    config,
    http,
    wpV2: restRoot,
    wcV3: wcRoot,
  };
}

/**
 * Thin wrapper that throws a useful Error on non-2xx and returns the body
 * on success. Always goes through the axios instance so headers + timeout
 * are applied consistently.
 */
async function requestJson<T = any>(
  client:  WordPressClient,
  method:  "get" | "post" | "put" | "delete",
  url:     string,
  body?:   unknown
): Promise<T> {
  const res = await client.http.request({
    method,
    url,
    data: body,
    headers: body != null ? { "Content-Type": "application/json" } : undefined,
  });

  if (res.status < 200 || res.status >= 300) {
    const msg = (() => {
      if (res.data && typeof res.data === "object") {
        const d = res.data as { message?: string; code?: string };
        if (d.message) return `${d.code ?? "error"}: ${d.message}`;
      }
      return `HTTP ${res.status}`;
    })();
    throw new Error(`WordPress REST ${method.toUpperCase()} ${url} → ${msg}`);
  }

  return res.data as T;
}

// ── Pages ────────────────────────────────────────────────────────────────────

export interface CreatedPage {
  id:     number;
  link:   string;
  slug:   string;
  title:  string;
}

/**
 * Create a WordPress Page (not a Post). Pages live under /wp/v2/pages and
 * take HTML content. Status defaults to "publish" — callers who want drafts
 * can override.
 */
export async function createPage(
  client: WordPressClient,
  input: {
    title:   string;
    slug?:   string;
    content: string;
    status?: "publish" | "draft" | "private";
    template?: string;
  }
): Promise<CreatedPage> {
  const body = {
    title:   input.title,
    slug:    input.slug,
    content: input.content,
    status:  input.status ?? "publish",
    template: input.template,
  };
  const data = await requestJson<{
    id:    number;
    link:  string;
    slug:  string;
    title: { rendered: string };
  }>(client, "post", `${client.wpV2}/pages`, body);

  return {
    id:    data.id,
    link:  data.link,
    slug:  data.slug,
    title: data.title?.rendered ?? input.title,
  };
}

// ── Media ────────────────────────────────────────────────────────────────────

export interface UploadedMedia {
  id:         number;
  sourceUrl:  string;
  mimeType:   string;
  altText?:   string;
}

/**
 * Upload an image from a remote URL to the site's media library. WordPress's
 * REST media endpoint wants the file bytes as a POST body with a
 * Content-Disposition: attachment; filename="…" header; we fetch the source
 * into memory first, then forward.
 *
 * Lives in one function because the stream semantics are annoying enough
 * that we'd otherwise duplicate them at every call site.
 */
export async function uploadMediaFromUrl(
  client:   WordPressClient,
  remote:   string,
  opts:     { altText?: string; filename?: string } = {}
): Promise<UploadedMedia> {
  // Fetch the source image into a buffer.
  const src = await axios.get<ArrayBuffer>(remote, {
    responseType: "arraybuffer",
    timeout:      20_000,
  });
  const mime = (src.headers["content-type"] as string) || "image/jpeg";
  const filename =
    opts.filename ??
    (() => {
      try {
        const u = new URL(remote);
        const base = u.pathname.split("/").filter(Boolean).pop() || "upload.jpg";
        return base.replace(/[^a-zA-Z0-9._-]/g, "-");
      } catch {
        return "upload.jpg";
      }
    })();

  const uploadRes = await client.http.post(`${client.wpV2}/media`, Buffer.from(src.data), {
    headers: {
      "Content-Type":        mime,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
    maxBodyLength:    20 * 1024 * 1024,
    maxContentLength: 20 * 1024 * 1024,
  });

  if (uploadRes.status < 200 || uploadRes.status >= 300) {
    throw new Error(`WordPress media upload ${uploadRes.status}: ${uploadRes.statusText}`);
  }

  const data = uploadRes.data as {
    id:          number;
    source_url:  string;
    mime_type:   string;
  };

  // Apply alt text via a second PATCH — WP's upload endpoint ignores it on
  // creation. Optional, so don't fail the upload if this second call errors.
  if (opts.altText) {
    try {
      await requestJson(client, "post", `${client.wpV2}/media/${data.id}`, {
        alt_text: opts.altText,
      });
    } catch (err) {
      logError(`Media alt-text update failed for ${data.id}`, err);
    }
  }

  return {
    id:        data.id,
    sourceUrl: data.source_url,
    mimeType:  data.mime_type,
    altText:   opts.altText,
  };
}

// ── WooCommerce products ─────────────────────────────────────────────────────

export interface CreatedWooProduct {
  id:     number;
  name:   string;
  slug:   string;
  permalink?: string;
}

interface WooProductCreateBody {
  name:        string;
  type:        "simple" | "variable";
  status:      "publish" | "draft" | "private";
  regular_price?: string;
  description?:   string;
  short_description?: string;
  sku?:           string;
  categories?:    Array<{ name: string }>;
  images?:        Array<{ src: string; alt?: string }>;
  attributes?:    Array<{
    name:     string;
    options:  string[];
    visible:  boolean;
    variation: boolean;
  }>;
}

interface WooVariationCreateBody {
  regular_price: string;
  sku?:          string;
  attributes:    Array<{ name: string; option: string }>;
}

/**
 * Map Yappaflow's `IProduct` to WooCommerce's product-create body.
 *
 * Single-variant products → type "simple" with `regular_price`.
 * Multi-variant products  → type "variable" with an `attributes` array, and
 *                           variations are created in a second REST call.
 */
function productToWooBody(
  p:         IProduct,
  industry?: string
): { base: WooProductCreateBody; variations: WooVariationCreateBody[] } {
  const hasVariants = Array.isArray(p.variants) && p.variants.length > 1;
  const categoryName = industry
    ? industry[0].toUpperCase() + industry.slice(1)
    : undefined;

  const base: WooProductCreateBody = {
    name:             p.name,
    type:             hasVariants ? "variable" : "simple",
    status:           "publish",
    description:      p.description,
    short_description: p.description?.slice(0, 140),
    sku:              p.sku,
    categories:       categoryName ? [{ name: categoryName }] : undefined,
  };

  if (!hasVariants) {
    base.regular_price = p.price.toFixed(2);
  } else {
    const attrName = p.variantKind
      ? p.variantKind[0].toUpperCase() + p.variantKind.slice(1)
      : "Variant";
    base.attributes = [
      {
        name:      attrName,
        options:   (p.variants ?? []).map((v) => v.label),
        visible:   true,
        variation: true,
      },
    ];
  }

  const variations: WooVariationCreateBody[] = hasVariants
    ? (p.variants ?? []).map((v) => {
        const attrName = p.variantKind
          ? p.variantKind[0].toUpperCase() + p.variantKind.slice(1)
          : "Variant";
        return {
          regular_price: (v.price ?? p.price).toFixed(2),
          sku:           v.sku,
          attributes:    [{ name: attrName, option: v.label }],
        };
      })
    : [];

  return { base, variations };
}

/**
 * Create one WooCommerce product (and its variations, if any). Uploads the
 * product's images first and links them in by media id — matches what the
 * Woo admin UI produces for a manually-created product.
 */
export async function createWooProduct(
  client:  WordPressClient,
  input:   IProduct,
  context: { industry?: string }
): Promise<CreatedWooProduct> {
  // Upload any images first so we can reference them by id when creating
  // the product. Skip silently on upload failure — a missing image isn't
  // fatal, it just falls back to the WooCommerce placeholder.
  const uploadedMedia: Array<{ src: string; alt?: string }> = [];
  for (const imageUrl of input.images ?? []) {
    try {
      const media = await uploadMediaFromUrl(client, imageUrl, { altText: input.name });
      uploadedMedia.push({ src: media.sourceUrl, alt: input.name });
    } catch (err) {
      logError(`Skipping image for product "${input.name}" — upload failed: ${imageUrl}`, err);
    }
  }

  const { base, variations } = productToWooBody(input, context.industry);
  if (uploadedMedia.length) base.images = uploadedMedia;

  const created = await requestJson<{
    id:        number;
    name:      string;
    slug:      string;
    permalink: string;
  }>(client, "post", `${client.wcV3}/products`, base);

  // Create variations, if any.
  for (const v of variations) {
    try {
      await requestJson(
        client,
        "post",
        `${client.wcV3}/products/${created.id}/variations`,
        v
      );
    } catch (err) {
      logError(`Failed to create variation for product ${created.id}`, err);
    }
  }

  return {
    id:        created.id,
    name:      created.name,
    slug:      created.slug,
    permalink: created.permalink,
  };
}

// ── Orchestration ────────────────────────────────────────────────────────────

export interface PushWordPressBundleOptions {
  agencyId:  string;
  projectId: string;
  client:    WordPressClient;
}

export interface PushWordPressBundleResult {
  /** Number of pages created on the site. */
  pagesCreated:   number;
  pageLinks:      string[];
  /** WooCommerce products actually created (0 if Woo isn't installed or no products). */
  productsCreated: number;
  productIds:      number[];
  /** True when the Woo REST namespace responded 200 — i.e. we were able to push products. */
  wooCommerceAvailable: boolean;
  /** `{siteUrl}/wp-admin/themes.php` — handy admin deep-link for the caller. */
  themeAdminUrl:   string;
}

/**
 * Parse an HTML-typed GeneratedArtifact file path into a human page title.
 *   "pages/about.html"    → "About"
 *   "pages/contact.html"  → "Contact"
 *   "pages/index.html"    → "Home"
 */
function filePathToPageMeta(filePath: string): { title: string; slug: string } | null {
  const m = /^pages\/([^/]+)\.html$/i.exec(filePath);
  if (!m) return null;
  const raw = m[1];
  if (raw.toLowerCase() === "index") return { title: "Home", slug: "home" };
  const title = raw
    .split(/[-_]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
  return { title, slug: raw.toLowerCase() };
}

/**
 * Push the persisted WordPress bundle to the merchant's site.
 *
 *   1. Skip the theme/ files (those are installed via ZIP upload — WP has no
 *      REST endpoint for writing into /wp-content/themes).
 *   2. Create pages from  pages/*.html  artifacts.
 *   3. If WooCommerce is available, create products from
 *      `Project.identity.products`.
 */
export async function pushWordPressBundle(
  opts: PushWordPressBundleOptions
): Promise<PushWordPressBundleResult> {
  const { agencyId, projectId, client } = opts;

  const project = await Project.findOne({ _id: projectId, agencyId });
  if (!project) throw new Error("Project not found");
  if (!project.identity) throw new Error("Project has no identity — run extraction first");

  const identity = project.identity as IProjectIdentity;
  const artifacts = (await GeneratedArtifact.find({
    agencyId,
    projectId,
    platform: "wordpress",
  })) as IGeneratedArtifact[];

  if (artifacts.length === 0) {
    throw new Error("No WordPress artifacts found — run the build first");
  }

  // Pages to create.
  const pageArtifacts = artifacts
    .map((a) => ({ meta: filePathToPageMeta(a.filePath), content: a.content }))
    .filter((x): x is { meta: { title: string; slug: string }; content: string } =>
      x.meta !== null
    );

  log(
    `📝 Pushing WordPress bundle for project ${projectId}: ` +
    `${pageArtifacts.length} pages, ${identity.products?.length ?? 0} products`
  );

  const pageLinks: string[] = [];
  for (const { meta, content } of pageArtifacts) {
    try {
      const p = await createPage(client, {
        title:   meta.title,
        slug:    meta.slug,
        content,
        status:  "publish",
      });
      pageLinks.push(p.link);
    } catch (err) {
      logError(`Failed to create page "${meta.title}"`, err);
      throw new Error(`Failed to create page "${meta.title}": ${(err as Error).message}`);
    }
  }

  // WooCommerce probe: try the namespace root. 200/401 = installed, 404 = not.
  let wooAvailable = false;
  try {
    const probe = await client.http.get(client.wcV3);
    wooAvailable = probe.status === 200 || probe.status === 401;
  } catch {
    wooAvailable = false;
  }

  const createdProducts: CreatedWooProduct[] = [];
  if (wooAvailable && identity.products?.length) {
    for (const p of identity.products) {
      try {
        const c = await createWooProduct(client, p, { industry: identity.industry });
        createdProducts.push(c);
      } catch (err) {
        logError(`Failed to create WooCommerce product "${p.name}"`, err);
      }
    }
  }

  return {
    pagesCreated:         pageLinks.length,
    pageLinks,
    productsCreated:      createdProducts.length,
    productIds:           createdProducts.map((p) => p.id),
    wooCommerceAvailable: wooAvailable,
    themeAdminUrl:        `${client.config.siteUrl}/wp-admin/themes.php`,
  };
}
