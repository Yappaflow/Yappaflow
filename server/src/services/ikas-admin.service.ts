/**
 * ikas Admin API (GraphQL) push service.
 *
 * Given a merchant's ikas access token (acquired via OAuth and stored,
 * encrypted, on a `PlatformConnection`), this service takes the generated
 * bundle we have in `GeneratedArtifact` (platform = "ikas") and pushes it
 * straight into the merchant's store via the Admin GraphQL API:
 *
 *   • Creates Categories (one per Project.identity.industry tag).
 *   • Creates Products (one mutation per product; variants nested inline).
 *   • Uploads the storefront theme bundle (HTML/CSS/JS) via the
 *     theme-version asset endpoints.
 *
 * GraphQL endpoint: https://api.myikas.com/api/v1/admin/graphql
 *
 * Token refresh: ikas tokens expire in ~1 hour. When a mutation returns 401
 * we refresh using the stored `ikasRefreshToken` and retry once. Callers
 * pass in a `tokenRefresher` closure so we don't couple this service to the
 * PlatformConnection model directly (keeps the unit tests simple).
 *
 * Shape mirrors `shopify-admin.service.ts` and `webflow-admin.service.ts`:
 * small functions, each taking an `axios`-like client. The orchestration at
 * the bottom pulls artifacts from Mongo and runs them in sequence.
 */

import axios, { AxiosHeaders, type AxiosInstance, type AxiosError } from "axios";

import {
  GeneratedArtifact,
  type IGeneratedArtifact,
} from "../models/GeneratedArtifact.model";
import { Project, type IProjectIdentity, type IProduct } from "../models/Project.model";
import { env } from "../config/env";
import { log, logError } from "../utils/logger";

export interface IkasClients {
  graphql: AxiosInstance;
}

export interface BuildClientsOptions {
  accessToken: string;
  apiBase?:    string;
  apiVersion?: string;
}

/**
 * Build a GraphQL client pointed at the ikas Admin API. The client uses
 * axios so interceptors can implement the token-refresh-on-401 pattern
 * cleanly (see `withAutoRefresh`).
 */
export function buildIkasClients(opts: BuildClientsOptions): IkasClients {
  const base       = opts.apiBase    ?? env.ikasApiBase;
  const apiVersion = opts.apiVersion ?? env.ikasApiVersion;
  const graphql = axios.create({
    baseURL: `${base}/api/${apiVersion}/admin`,
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 30_000,
  });
  return { graphql };
}

/**
 * Decorate a client so 401 responses trigger a `refresher()` call that
 * returns a new access token, which we then retry the original request
 * with. Only retries once.
 */
export function withAutoRefresh(
  clients:   IkasClients,
  refresher: () => Promise<string | null>
): IkasClients {
  const { graphql } = clients;
  graphql.interceptors.response.use(
    (r) => r,
    async (err: AxiosError) => {
      const cfg = (err.config ?? undefined) as (typeof err.config & { _retriedIkasAuth?: boolean }) | undefined;
      if (err.response?.status === 401 && cfg && !cfg._retriedIkasAuth) {
        const newToken = await refresher();
        if (newToken) {
          cfg._retriedIkasAuth = true;
          // axios v1 exposes headers as an `AxiosHeaders` instance (not a
          // plain object) — normalize and mutate in place so the retry
          // carries the fresh token.
          const headers = AxiosHeaders.from(cfg.headers);
          headers.set("Authorization", `Bearer ${newToken}`);
          cfg.headers = headers;
          // Replace default header too so later calls on same instance work.
          graphql.defaults.headers.common.Authorization = `Bearer ${newToken}`;
          return graphql.request(cfg);
        }
      }
      return Promise.reject(err);
    }
  );
  return { graphql };
}

// ── Low-level GraphQL helper ─────────────────────────────────────────────────

interface GraphQLResponse<T> {
  data?:   T;
  errors?: Array<{ message: string; path?: string[] }>;
}

async function runQuery<T>(
  client:    AxiosInstance,
  query:     string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const { data } = await client.post<GraphQLResponse<T>>("/graphql", { query, variables });
  if (data.errors?.length) {
    throw new Error(`ikas GraphQL error: ${data.errors.map((e) => e.message).join("; ")}`);
  }
  if (!data.data) {
    throw new Error("ikas GraphQL returned no data");
  }
  return data.data;
}

// ── Categories ───────────────────────────────────────────────────────────────

export interface IkasCategory {
  id:   string;
  name: string;
}

const SAVE_CATEGORY = /* GraphQL */ `
  mutation saveCategory($input: CategoryInput!) {
    saveCategory(input: $input) {
      id
      name
    }
  }
`;

export async function upsertCategory(
  graphql: AxiosInstance,
  name:    string
): Promise<IkasCategory> {
  const data = await runQuery<{ saveCategory: IkasCategory }>(
    graphql,
    SAVE_CATEGORY,
    { input: { name } }
  );
  return data.saveCategory;
}

// ── Products ─────────────────────────────────────────────────────────────────

export interface CreatedProduct {
  id:    string;
  name:  string;
  slug?: string;
}

const SAVE_PRODUCT = /* GraphQL */ `
  mutation saveProduct($input: ProductInput!) {
    saveProduct(input: $input) {
      id
      name
      slug: productCode
    }
  }
`;

interface IkasProductInput {
  name:         string;
  description?: string;
  shortDescription?: string;
  brand?:       string;
  categoryIds?: string[];
  productCode?: string;
  productVariantTypes?: Array<{
    name:  string;  // e.g. "Size", "Color"
    order: number;
  }>;
  variants: Array<{
    sku?:   string;
    prices: Array<{ sellPrice: number; currency: string }>;
    attributes?: Array<{ name: string; value: string }>;
    images?: Array<{ imageUrl: string; order: number }>;
  }>;
}

function toProductInput(
  p:        IProduct,
  identity: IProjectIdentity,
  categoryIds: string[]
): IkasProductInput {
  const variants = p.variants?.length ? p.variants : [{ label: "Default" }];
  const currency = (p.currency ?? "USD").toUpperCase();
  const variantTypeName = p.variantKind
    ? p.variantKind[0].toUpperCase() + p.variantKind.slice(1)
    : "Title";

  return {
    name:             p.name,
    description:      p.description,
    shortDescription: p.description?.slice(0, 140),
    brand:            identity.businessName,
    categoryIds:      categoryIds.length ? categoryIds : undefined,
    productCode:      toSlug(p.name),
    productVariantTypes: [{ name: variantTypeName, order: 0 }],
    variants: variants.map((v, idx) => ({
      sku: v.sku ?? `${toSlug(p.name)}-${toSlug(v.label)}`,
      prices: [{
        sellPrice: Number(((v.price ?? p.price)).toFixed(2)),
        currency,
      }],
      attributes: [{ name: variantTypeName, value: v.label }],
      images: idx === 0 && p.images?.length
        ? p.images.map((url, order) => ({ imageUrl: url, order }))
        : undefined,
    })),
  };
}

function toSlug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "product";
}

export async function createProduct(
  graphql:     AxiosInstance,
  p:           IProduct,
  identity:    IProjectIdentity,
  categoryIds: string[]
): Promise<CreatedProduct> {
  const input = toProductInput(p, identity, categoryIds);
  const data = await runQuery<{ saveProduct: CreatedProduct }>(
    graphql,
    SAVE_PRODUCT,
    { input }
  );
  log(`   → ikas product "${p.name}" created (id=${data.saveProduct.id})`);
  return data.saveProduct;
}

// ── Theme (storefront) assets ────────────────────────────────────────────────
//
// ikas stores can have multiple theme versions. The safest path for a
// programmatic push is: clone the currently-published theme into a new
// draft version, upload each generated asset, and leave the merchant to
// preview + publish from the ikas admin UI. We never auto-publish.

const CREATE_THEME_VERSION = /* GraphQL */ `
  mutation createThemeVersion($input: CreateThemeVersionInput!) {
    createThemeVersion(input: $input) {
      id
      themeId
      name
    }
  }
`;

const UPLOAD_THEME_ASSET = /* GraphQL */ `
  mutation saveThemeAsset($input: ThemeAssetInput!) {
    saveThemeAsset(input: $input) {
      id
      path
    }
  }
`;

export interface ThemeVersion {
  id:      string;
  themeId: string;
  name:    string;
}

export async function createDraftThemeVersion(
  graphql: AxiosInstance,
  name:    string
): Promise<ThemeVersion> {
  const data = await runQuery<{ createThemeVersion: ThemeVersion }>(
    graphql,
    CREATE_THEME_VERSION,
    { input: { name, cloneFromPublished: true } }
  );
  return data.createThemeVersion;
}

export async function uploadThemeAsset(
  graphql:        AxiosInstance,
  themeVersionId: string,
  path:           string,
  content:        string
): Promise<void> {
  await runQuery(graphql, UPLOAD_THEME_ASSET, {
    input: { themeVersionId, path, content },
  });
}

// ── Orchestration ────────────────────────────────────────────────────────────

export interface PushResult {
  themeVersionId?: string;
  themeName?:      string;
  themeFiles:      number;
  categoriesCreated: number;
  productsCreated:  number;
  productIds:       string[];
}

export interface PushIkasBundleOptions {
  agencyId:  string;
  projectId: string;
  clients:   IkasClients;
  /** Create + upload a draft theme version (default true). */
  pushTheme?: boolean;
  themeName?: string;
}

export async function pushIkasBundle(opts: PushIkasBundleOptions): Promise<PushResult> {
  const { agencyId, projectId, clients } = opts;

  const project = await Project.findOne({ _id: projectId, agencyId });
  if (!project) throw new Error("Project not found");
  if (!project.identity) throw new Error("Project has no identity — run extraction first");

  const identity = project.identity as IProjectIdentity;
  const artifacts = (await GeneratedArtifact.find({
    agencyId,
    projectId,
    platform: "ikas",
  })) as IGeneratedArtifact[];

  if (artifacts.length === 0) {
    throw new Error("No ikas artifacts found — run the build first");
  }

  // Step 1 — category (single, from industry). Optional but keeps the
  // storefront navigation populated on first load.
  const categoryIds: string[] = [];
  if (identity.industry) {
    try {
      const cat = await upsertCategory(clients.graphql, identity.industry);
      categoryIds.push(cat.id);
    } catch (err) {
      logError("ikas upsertCategory failed (continuing without category)", err);
    }
  }

  // Step 2 — theme version + assets.
  let themeVersionId: string | undefined;
  let themeName:      string | undefined;
  const themeArtifacts = artifacts.filter((a) => a.filePath.startsWith("theme/"));
  if (opts.pushTheme !== false && themeArtifacts.length > 0) {
    const tName = opts.themeName ?? `Yappaflow – ${identity.businessName}`.slice(0, 50);
    try {
      const theme = await createDraftThemeVersion(clients.graphql, tName);
      themeVersionId = theme.id;
      themeName      = theme.name;
      for (const a of themeArtifacts) {
        const assetPath = a.filePath.slice("theme/".length);
        try {
          await uploadThemeAsset(clients.graphql, theme.id, assetPath, a.content);
        } catch (err) {
          logError(`ikas theme asset upload failed for ${a.filePath}`, err);
          throw err;
        }
      }
    } catch (err) {
      logError("ikas theme push failed", err);
      // Products can still be pushed even if the theme push fails — merchants
      // often want to keep their current theme anyway, so don't abort here.
    }
  }

  // Step 3 — products.
  const createdProducts: CreatedProduct[] = [];
  for (const p of identity.products ?? []) {
    try {
      const created = await createProduct(clients.graphql, p, identity, categoryIds);
      createdProducts.push(created);
    } catch (err) {
      logError(`ikas product push failed for "${p.name}"`, err);
      throw err;
    }
  }

  log(
    `🛒 Pushed ikas bundle for project ${projectId}: ` +
    `${createdProducts.length} product(s), ` +
    `${themeArtifacts.length} theme file(s)` +
    `${themeVersionId ? ` on version ${themeName}` : " (theme skipped)"}`
  );

  return {
    themeVersionId,
    themeName,
    themeFiles:        themeVersionId ? themeArtifacts.length : 0,
    categoriesCreated: categoryIds.length,
    productsCreated:   createdProducts.length,
    productIds:        createdProducts.map((p) => p.id),
  };
}
