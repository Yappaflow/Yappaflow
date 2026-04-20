/**
 * Webflow Data API v2 push service.
 *
 * Given a user's Webflow access token (acquired via OAuth and stored,
 * encrypted, on a `PlatformConnection`), this service takes the generated
 * bundle we already have in `GeneratedArtifact` (platform = "webflow") and
 * pushes it directly to the user's Webflow site:
 *
 *   • Creates CMS Collection items (blog/portfolio/etc.) for any non-product
 *     artifacts of type `cms-item`.
 *   • For projects with an e-commerce catalog, creates Products + SKUs via
 *     the Data API v2 `/ecommerce/products` endpoints.
 *   • Uploads assets (product images) via the Assets API, using Webflow's
 *     presigned-S3 two-phase flow.
 *   • Publishes the site after the push is complete.
 *
 * We do NOT try to build the HTML/CSS theme directly in Webflow — Webflow's
 * visual editor owns layout, so the "theme" portion of the bundle is kept
 * as a ZIP that the agency imports via Webflow → Site settings → "Backups"
 * or drops into a fresh Designer. The e-commerce + CMS content, however, we
 * can push programmatically, which is the part that saves real time.
 *
 * Shape-wise this mirrors `shopify-admin.service.ts`: small functions, each
 * taking an `axios`-like client, so unit tests can stub transport without
 * us needing real Webflow credentials.
 */

import axios, { type AxiosInstance } from "axios";
import crypto from "crypto";

import {
  GeneratedArtifact,
  type IGeneratedArtifact,
} from "../models/GeneratedArtifact.model";
import { Project, type IProjectIdentity, type IProduct } from "../models/Project.model";
import { env } from "../config/env";
import { log, logError } from "../utils/logger";

export const WEBFLOW_API_VERSION_DEFAULT = "2.0.0";

export interface WebflowClients {
  http: AxiosInstance;
}

export interface BuildClientsOptions {
  accessToken: string;   // decrypted Webflow Data API access token
  apiBase?:    string;
  apiVersion?: string;
}

/**
 * Build an axios client preconfigured with the Webflow Data API base URL,
 * auth, and the required `accept-version` header. Webflow's Data API v2
 * uses JSON bodies and Bearer auth throughout; nothing exotic.
 */
export function buildWebflowClients(opts: BuildClientsOptions): WebflowClients {
  const baseURL    = opts.apiBase    ?? env.webflowApiBase;
  const apiVersion = opts.apiVersion ?? WEBFLOW_API_VERSION_DEFAULT;
  const http = axios.create({
    baseURL,
    headers: {
      Authorization:    `Bearer ${opts.accessToken}`,
      "accept-version": apiVersion,
      "Content-Type":   "application/json",
    },
    timeout: 30_000,
  });
  return { http };
}

// ── Sites & publish ──────────────────────────────────────────────────────────

export interface WebflowSite {
  id:           string;
  displayName:  string;
  shortName:    string;
  previewUrl?:  string;
  customDomains?: Array<{ id: string; url: string }>;
}

/** List every site the token has access to. */
export async function listSites(http: AxiosInstance): Promise<WebflowSite[]> {
  const { data } = await http.get("/v2/sites");
  const sites = (data?.sites ?? data ?? []) as Array<Record<string, unknown>>;
  return sites.map((s) => ({
    id:            s.id as string,
    displayName:   (s.displayName ?? s.name ?? "") as string,
    shortName:     (s.shortName ?? "") as string,
    previewUrl:    (s.previewUrl ?? undefined) as string | undefined,
    customDomains: (s.customDomains ?? []) as WebflowSite["customDomains"],
  }));
}

/**
 * Publish a site. Webflow publish = push the current Designer snapshot to
 * staging (`<short>.webflow.io`) and/or to the attached custom domains.
 *
 * We default to publishing to the staging subdomain — custom domains are
 * opt-in via the `customDomains` argument (pass `true` to include all
 * attached customs, or a list of domain ids).
 */
export async function publishSite(
  http:    AxiosInstance,
  siteId:  string,
  opts: { publishToWebflowSubdomain?: boolean; customDomains?: true | string[] } = {}
): Promise<void> {
  const customDomainIds =
    opts.customDomains === true
      ? (await listSites(http)).find((s) => s.id === siteId)?.customDomains?.map((d) => d.id) ?? []
      : Array.isArray(opts.customDomains) ? opts.customDomains : [];

  await http.post(`/v2/sites/${siteId}/publish`, {
    publishToWebflowSubdomain: opts.publishToWebflowSubdomain ?? true,
    customDomains:             customDomainIds,
  });
}

// ── Assets (product images, etc.) ────────────────────────────────────────────

export interface UploadedAsset {
  id:   string;
  url:  string;
  name: string;
}

/**
 * Upload an asset at `sourceUrl` to the given Webflow site.
 *
 * Webflow's Data API uses a two-phase upload:
 *   1. POST /v2/sites/:siteId/assets with a hash + name → receive a presigned
 *      S3 POST policy.
 *   2. POST the file bytes to the S3 URL with the returned fields.
 *
 * We fetch `sourceUrl` ourselves, hash it (md5 per Webflow spec), and pipe
 * the bytes. Callers that already have a Buffer should prefer `uploadAsset`.
 */
export async function uploadAssetFromUrl(
  http:     AxiosInstance,
  siteId:   string,
  sourceUrl: string,
  fileName?: string
): Promise<UploadedAsset> {
  // Step 0 — fetch bytes.
  const bin = await axios.get<ArrayBuffer>(sourceUrl, { responseType: "arraybuffer" });
  const bytes = Buffer.from(bin.data);
  const name  = fileName ?? guessFileName(sourceUrl);
  return uploadAsset(http, siteId, bytes, name);
}

export async function uploadAsset(
  http:    AxiosInstance,
  siteId:  string,
  bytes:   Buffer,
  fileName: string
): Promise<UploadedAsset> {
  const md5Hash = crypto.createHash("md5").update(bytes).digest("hex");

  // Step 1 — presigned upload slot.
  const { data } = await http.post(`/v2/sites/${siteId}/assets`, {
    fileName,
    fileHash: md5Hash,
  });
  const uploadUrl:     string                            = data.uploadUrl;
  const uploadDetails: Record<string, string>            = data.uploadDetails ?? {};
  const assetId:       string                            = data.id;
  const hostedUrl:     string                            = data.hostedUrl ?? data.assetUrl ?? "";

  // Step 2 — S3 multipart/form-data POST.
  // We use the global `fetch` + `FormData` available in Node 18+ rather than
  // pulling in `form-data`. `FormData` accepts a Blob part; the Node DOM
  // typings may not expose a shared `BodyInit` alias, so we cast.
  const form = new FormData();
  for (const [k, v] of Object.entries(uploadDetails)) form.append(k, v);
  form.append("file", new Blob([bytes]), fileName);

  const s3Res = await (globalThis as unknown as {
    fetch: (input: string, init: { method: string; body: unknown }) => Promise<Response>;
  }).fetch(uploadUrl, { method: "POST", body: form });
  if (!s3Res.ok) {
    const snippet = (await s3Res.text()).slice(0, 300);
    throw new Error(`Webflow S3 upload failed ${s3Res.status}: ${snippet}`);
  }

  return { id: assetId, url: hostedUrl, name: fileName };
}

function guessFileName(url: string): string {
  try {
    const p = new URL(url).pathname;
    const base = p.substring(p.lastIndexOf("/") + 1) || "asset";
    return base.slice(0, 120);
  } catch {
    return "asset";
  }
}

// ── CMS items (generic collection push — blog, portfolio, etc.) ──────────────

export interface CmsItemInput {
  collectionId: string;
  fieldData:    Record<string, unknown>;
  isDraft?:     boolean;
  isArchived?:  boolean;
}

export interface CreatedCmsItem {
  id:   string;
  slug: string;
}

/** Create a CMS Collection item. */
export async function createCmsItem(
  http:  AxiosInstance,
  input: CmsItemInput
): Promise<CreatedCmsItem> {
  const { collectionId, ...body } = input;
  const { data } = await http.post(
    `/v2/collections/${collectionId}/items`,
    {
      isDraft:    input.isDraft ?? false,
      isArchived: input.isArchived ?? false,
      fieldData:  body.fieldData,
    }
  );
  return {
    id:   data.id as string,
    slug: (data.fieldData?.slug ?? "") as string,
  };
}

// ── E-commerce: products + SKUs ──────────────────────────────────────────────

export interface CreatedProduct {
  id:     string;
  slug:   string;
  title:  string;
  skuIds: string[];
}

interface ProductCreateInput {
  publishStatus?: "staging" | "live";
  product: {
    fieldData: {
      name:        string;
      slug:        string;
      description?: string;
      shippable?:  boolean;
      ["tax-category"]?: string;
      [key: string]: unknown;
    };
  };
  sku: {
    fieldData: {
      name:  string;
      slug:  string;
      price: { value: number; unit: string };   // value in minor units (cents)
      ["main-image"]?: { url: string; alt?: string };
      [key: string]: unknown;
    };
  };
}

/**
 * Lower-case, dash-separated, ASCII-only slug (Webflow slug rule).
 * Matches the Shopify `toHandle` helper so we can pair bundles cleanly.
 */
function toSlug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "product";
}

function currencyUnit(currency: string | undefined): string {
  return (currency ?? "USD").toUpperCase();
}

/**
 * Push a single product (with its first variant as the primary SKU) to the
 * given site. If the product has more than one variant we currently set the
 * primary SKU to the first variant; additional variants would be created via
 * a separate `/skus` call which we can wire up in a follow-up PR — the
 * single-SKU path already covers the common case (one-size, default-title).
 */
export async function createProduct(
  http:     AxiosInstance,
  siteId:   string,
  identity: IProjectIdentity,
  p:        IProduct
): Promise<CreatedProduct> {
  const slug     = toSlug(p.name);
  const price    = p.variants?.[0]?.price ?? p.price;
  const currency = currencyUnit(p.currency);
  const firstImg = p.images?.[0];

  const body: ProductCreateInput = {
    publishStatus: "staging",
    product: {
      fieldData: {
        name:        p.name,
        slug,
        description: p.description,
        shippable:   true,
        "tax-category": "standard-taxable",
      },
    },
    sku: {
      fieldData: {
        name:  p.variants?.[0]?.label ?? p.name,
        slug:  p.variants?.[0] ? `${slug}-${toSlug(p.variants[0].label)}` : slug,
        price: { value: Math.round(price * 100), unit: currency },
        "main-image": firstImg ? { url: firstImg, alt: p.name } : undefined,
      },
    },
  };

  const { data } = await http.post(`/v2/sites/${siteId}/products`, body);
  const productId = data.product?.id as string;
  const skuIds: string[] = [];
  if (Array.isArray(data.skus)) for (const s of data.skus) skuIds.push(s.id as string);

  if (!productId) throw new Error("Webflow products endpoint returned no product id");

  log(
    `   → Webflow product "${p.name}" created (id=${productId}, ` +
    `${skuIds.length} SKU${skuIds.length === 1 ? "" : "s"})`
  );

  return {
    id:    productId,
    slug:  (data.product?.fieldData?.slug ?? slug) as string,
    title: p.name,
    skuIds,
  };
}

// ── Orchestration ────────────────────────────────────────────────────────────

export interface PushResult {
  siteId:          string;
  productsCreated: number;
  productIds:      string[];
  cmsItemsCreated: number;
  published:       boolean;
}

export interface PushWebflowBundleOptions {
  agencyId:   string;
  projectId:  string;
  siteId:     string;         // the Webflow site we're pushing into
  clients:    WebflowClients;
  /** Publish to *.webflow.io after the push (default true). */
  publish?:   boolean;
}

/**
 * Push the persisted Webflow bundle for a project to the user's site.
 *
 *  1. For every GeneratedArtifact with `purpose === "webflow-cms-item"`,
 *     parse the JSON body and POST it to the referenced collection. (The
 *     generator writes these as `cms/<collection-slug>/<item-slug>.json`.)
 *  2. For each product on `Project.identity.products`, call
 *     `/v2/sites/:siteId/products` to create the product + primary SKU.
 *  3. Publish the site (to *.webflow.io by default).
 */
export async function pushWebflowBundle(
  opts: PushWebflowBundleOptions
): Promise<PushResult> {
  const { agencyId, projectId, siteId, clients } = opts;

  const project = await Project.findOne({ _id: projectId, agencyId });
  if (!project) throw new Error("Project not found");
  if (!project.identity) throw new Error("Project has no identity — run extraction first");

  const identity = project.identity as IProjectIdentity;
  const artifacts = (await GeneratedArtifact.find({
    agencyId,
    projectId,
    platform: "webflow",
  })) as IGeneratedArtifact[];

  if (artifacts.length === 0) {
    throw new Error("No Webflow artifacts found — run the build first");
  }

  // Step 1 — CMS items.
  const cmsArtifacts = artifacts.filter((a) => a.purpose === "webflow-cms-item");
  let cmsItemsCreated = 0;
  for (const a of cmsArtifacts) {
    try {
      const parsed = JSON.parse(a.content) as {
        collectionId?: string;
        fieldData?:    Record<string, unknown>;
      };
      if (!parsed.collectionId || !parsed.fieldData) continue;
      await createCmsItem(clients.http, {
        collectionId: parsed.collectionId,
        fieldData:    parsed.fieldData,
      });
      cmsItemsCreated++;
    } catch (err) {
      logError(`Webflow CMS item upload failed for ${a.filePath}`, err);
    }
  }

  // Step 2 — products.
  const createdProducts: CreatedProduct[] = [];
  for (const p of identity.products ?? []) {
    try {
      const created = await createProduct(clients.http, siteId, identity, p);
      createdProducts.push(created);
    } catch (err) {
      logError(`Webflow product push failed for "${p.name}"`, err);
      throw err;
    }
  }

  // Step 3 — publish.
  let published = false;
  if (opts.publish !== false) {
    try {
      await publishSite(clients.http, siteId, { publishToWebflowSubdomain: true });
      published = true;
    } catch (err) {
      logError(`Webflow publish failed for site ${siteId}`, err);
    }
  }

  log(
    `🌐 Pushed Webflow bundle for project ${projectId}: ` +
    `${createdProducts.length} product(s), ${cmsItemsCreated} CMS item(s), ` +
    `${published ? "published" : "publish skipped/failed"}`
  );

  return {
    siteId,
    productsCreated: createdProducts.length,
    productIds:      createdProducts.map((p) => p.id),
    cmsItemsCreated,
    published,
  };
}
