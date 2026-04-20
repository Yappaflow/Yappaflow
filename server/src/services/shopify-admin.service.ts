/**
 * Shopify Admin API push service.
 *
 * Given a merchant's Shopify access token (acquired via OAuth and stored,
 * encrypted, on a `PlatformConnection`), this service takes the generated
 * bundle we already have in `GeneratedArtifact` and pushes it directly to
 * the merchant's store, using Shopify's own Admin API clients:
 *
 *   - REST client for theme asset upload (stable, well-documented endpoints
 *     at /admin/api/{ver}/themes/*).
 *   - GraphQL client for product creation (`productSet` — one mutation per
 *     product, including variants and media).
 *
 * This removes the manual "download a ZIP, then upload in Shopify admin"
 * step when the merchant has opted into the direct integration.
 *
 * The service is intentionally split into small functions that each take
 * their required clients, so the unit tests can pass in fakes without us
 * needing real credentials or a live store.
 */

import {
  createAdminApiClient,
  createAdminRestApiClient,
  type AdminApiClient,
  type AdminRestApiClient,
} from "@shopify/admin-api-client";

import {
  GeneratedArtifact,
  type IGeneratedArtifact,
} from "../models/GeneratedArtifact.model";
import { Project, type IProjectIdentity, type IProduct } from "../models/Project.model";
import { log, logError } from "../utils/logger";

export const SHOPIFY_API_VERSION_DEFAULT = "2024-10";

export interface AdminClients {
  rest:    AdminRestApiClient;
  graphql: AdminApiClient;
}

export interface BuildClientsOptions {
  shopDomain:   string;   // "foo.myshopify.com"
  accessToken:  string;   // decrypted Admin API access token
  apiVersion?:  string;
}

export function buildAdminClients(opts: BuildClientsOptions): AdminClients {
  const apiVersion = opts.apiVersion ?? SHOPIFY_API_VERSION_DEFAULT;
  return {
    rest: createAdminRestApiClient({
      storeDomain: opts.shopDomain,
      accessToken: opts.accessToken,
      apiVersion,
    }),
    graphql: createAdminApiClient({
      storeDomain: opts.shopDomain,
      accessToken: opts.accessToken,
      apiVersion,
    }),
  };
}

// ── Theme API ────────────────────────────────────────────────────────────────

export interface CreatedTheme {
  id:   number;
  name: string;
  role: string;
}

async function parseJson(res: Response): Promise<any> {
  // The admin-api-client REST methods return a plain Fetch Response; we read
  // the body ourselves.
  const text = await res.text();
  if (!res.ok) {
    const snippet = text.slice(0, 500);
    throw new Error(`Shopify REST ${res.status}: ${snippet || res.statusText}`);
  }
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Shopify REST returned non-JSON body: ${text.slice(0, 200)}`);
  }
}

/**
 * Create an *unpublished* theme. We deliberately never auto-publish — the
 * merchant previews and promotes it themselves from Shopify admin.
 */
export async function createUnpublishedTheme(
  rest:  AdminRestApiClient,
  name:  string
): Promise<CreatedTheme> {
  const res = await rest.post("themes", {
    data: { theme: { name, role: "unpublished" } },
  });
  const body = await parseJson(res);
  if (!body?.theme?.id) {
    throw new Error("Shopify did not return a theme id in POST /themes response");
  }
  return body.theme as CreatedTheme;
}

/**
 * Upload one asset (file) to a theme. Shopify's asset endpoint accepts a
 * `key` (relative path inside the theme) and a `value` (utf-8 source) or
 * `attachment` (base64 for binary). We only emit text/JSON/Liquid, so we
 * always use `value`.
 */
export async function uploadThemeAsset(
  rest:    AdminRestApiClient,
  themeId: number,
  key:     string,
  value:   string
): Promise<void> {
  const res = await rest.put(`themes/${themeId}/assets`, {
    data: { asset: { key, value } },
  });
  // Shopify replies 200 with `{ asset: {...} }` on success.
  await parseJson(res);
}

// ── Product API ──────────────────────────────────────────────────────────────

export interface CreatedProduct {
  id:     string;
  handle: string;
  title:  string;
}

const PRODUCT_SET_MUTATION = /* GraphQL */ `
  mutation pushProduct($input: ProductSetInput!) {
    productSet(input: $input) {
      product {
        id
        handle
        title
      }
      userErrors {
        field
        message
      }
    }
  }
`;

interface ProductSetInput {
  title:            string;
  descriptionHtml?: string;
  vendor?:          string;
  productType?:     string;
  tags?:            string[];
  status?:          "ACTIVE" | "DRAFT" | "ARCHIVED";
  productOptions?:  Array<{ name: string; values: Array<{ name: string }> }>;
  variants?: Array<{
    price?:        string;
    sku?:          string;
    optionValues?: Array<{ optionName: string; name: string }>;
  }>;
  files?: Array<{ originalSource: string; contentType?: "IMAGE" }>;
}

function productToSetInput(p: IProduct, vendor: string, industry?: string): ProductSetInput {
  const optionName = p.variantKind
    ? p.variantKind[0].toUpperCase() + p.variantKind.slice(1)
    : "Title";

  const variantLabels = p.variants?.length
    ? p.variants.map((v) => v.label)
    : ["Default Title"];

  const input: ProductSetInput = {
    title:           p.name,
    descriptionHtml: p.description ? `<p>${p.description}</p>` : undefined,
    vendor,
    productType:     industry,
    tags:            industry ? [industry] : undefined,
    status:          "ACTIVE",
    productOptions:  [
      { name: optionName, values: variantLabels.map((label) => ({ name: label })) },
    ],
    variants: variantLabels.map((label, idx) => {
      const v     = p.variants?.[idx];
      const price = v?.price ?? p.price;
      return {
        price:        price != null ? price.toFixed(2) : undefined,
        sku:          v?.sku,
        optionValues: [{ optionName, name: label }],
      };
    }),
  };

  if (p.images?.length) {
    input.files = p.images.map((url) => ({ originalSource: url, contentType: "IMAGE" }));
  }

  return input;
}

export async function createProductViaGraphQL(
  graphql: AdminApiClient,
  input:   ProductSetInput
): Promise<CreatedProduct> {
  const res = await graphql.request(PRODUCT_SET_MUTATION, { variables: { input } });

  // `ClientResponse` gives us `.data` and `.errors`.
  const errors = (res as any).errors;
  if (errors) {
    const msg =
      typeof errors === "object" && (errors as any).message
        ? (errors as any).message
        : JSON.stringify(errors);
    throw new Error(`Shopify GraphQL transport error: ${msg}`);
  }

  const data = (res as any).data;
  const userErrors = data?.productSet?.userErrors as
    | Array<{ field: string[]; message: string }>
    | undefined;
  if (userErrors?.length) {
    const joined = userErrors.map((e) => `${e.field?.join(".") ?? "?"}: ${e.message}`).join("; ");
    throw new Error(`Shopify productSet userErrors: ${joined}`);
  }

  const product = data?.productSet?.product;
  if (!product?.id) {
    throw new Error("Shopify productSet returned no product id");
  }
  return product as CreatedProduct;
}

// ── Orchestration ────────────────────────────────────────────────────────────

export interface PushResult {
  themeId:         number;
  themeName:       string;
  themeFiles:      number;
  productsCreated: number;
  productIds:      string[];
}

export interface PushShopifyBundleOptions {
  agencyId:   string;
  projectId:  string;
  clients:    AdminClients;
  themeName?: string;
}

/**
 * Push the persisted Shopify bundle for a project to the merchant's store.
 *
 *  1. Create a fresh unpublished theme.
 *  2. Upload every `theme/*` artifact as a theme asset (stripping the
 *     leading `theme/` folder — Shopify expects keys like `layout/theme.liquid`).
 *  3. For each product on `Project.identity.products`, call `productSet`.
 *
 *  We skip `README.txt` and `products.csv` because those are only meaningful
 *  when the merchant is doing the manual-ZIP route.
 */
export async function pushShopifyBundle(
  opts: PushShopifyBundleOptions
): Promise<PushResult> {
  const { agencyId, projectId, clients } = opts;

  const project = await Project.findOne({ _id: projectId, agencyId });
  if (!project) throw new Error("Project not found");
  if (!project.identity) throw new Error("Project has no identity — run extraction first");

  const identity = project.identity as IProjectIdentity;
  const artifacts = (await GeneratedArtifact.find({
    agencyId,
    projectId,
    platform: "shopify",
  })) as IGeneratedArtifact[];

  if (artifacts.length === 0) {
    throw new Error("No Shopify artifacts found — run the build first");
  }

  const themeFiles = artifacts
    .filter((a) => a.filePath.startsWith("theme/"))
    .map((a) => ({
      key:   a.filePath.slice("theme/".length),
      value: a.content,
    }));

  if (themeFiles.length === 0) {
    throw new Error("Persisted Shopify artifacts contain no theme/* files");
  }

  const themeName = opts.themeName
    ?? `Yappaflow – ${identity.businessName}`.slice(0, 50);

  log(
    `🚀 Pushing Shopify bundle for project ${projectId}: ` +
    `${themeFiles.length} theme files, ${identity.products?.length ?? 0} products`
  );

  // Step 1 — create theme
  const theme = await createUnpublishedTheme(clients.rest, themeName);

  // Step 2 — upload assets sequentially. Shopify rate-limits at 40 calls/sec
  // by default; sequential upload keeps us well under that ceiling for any
  // realistic theme size (<40 files).
  for (const f of themeFiles) {
    try {
      await uploadThemeAsset(clients.rest, theme.id, f.key, f.value);
    } catch (err) {
      logError(`Failed to upload theme asset ${f.key}`, err);
      throw new Error(`Failed to upload theme asset ${f.key}: ${(err as Error).message}`);
    }
  }

  // Step 3 — create products.
  const createdProducts: CreatedProduct[] = [];
  for (const p of identity.products ?? []) {
    const input = productToSetInput(p, identity.businessName, identity.industry);
    const created = await createProductViaGraphQL(clients.graphql, input);
    createdProducts.push(created);
  }

  return {
    themeId:         theme.id,
    themeName:       theme.name,
    themeFiles:      themeFiles.length,
    productsCreated: createdProducts.length,
    productIds:      createdProducts.map((p) => p.id),
  };
}
