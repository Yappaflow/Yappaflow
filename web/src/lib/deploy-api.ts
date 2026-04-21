function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("yappaflow_token");
}

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.error || message;
    } catch { /* no json body */ }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────────────────

export interface ProductVariant {
  label:  string;
  price?: number;
  sku?:   string;
}

/**
 * One product in the project's catalog. Mirrors the server-side `IProduct`.
 * Either extracted from chat during identity analysis, or typed in by the
 * agency on the Products editor surface.
 */
export interface Product {
  name:         string;
  price:        number;
  currency?:    string;
  description?: string;
  images?:      string[];
  variantKind?: string;
  variants?:    ProductVariant[];
  sku?:         string;
}

export interface ProjectIdentity {
  businessName:      string;
  tagline?:          string;
  industry?:         string;
  tone?:             string;
  city?:             string;
  domainSuggestions: string[];
  /** E-commerce catalog — empty/missing for service businesses. */
  products?:         Product[];
  extractedAt:       string;
}

export type BuildJobStatus = "pending" | "running" | "done" | "failed";

/**
 * Fine-grained phase inside a running build. Mirrors the server-side
 * `BuildPhase` enum. The UI uses it to pick a label, a step-indicator
 * position, and a band of the overall progress bar — the intra-band
 * motion comes from wall-clock time against `buildStartedAt`.
 */
export type BuildPhase =
  | "queued"
  | "analyzing"
  | "generating"
  | "patching"
  | "validating"
  | "packaging"
  | "done"
  | "failed";

export interface DeployProjectState {
  projectId:       string;
  phase:           "listening" | "building" | "deploying" | "live";
  progress:        number;
  identity:        ProjectIdentity | null;
  buildJobStatus:  BuildJobStatus | null;
  buildPhase:      BuildPhase | null;
  buildFilesDone:  number;
  buildFilesTotal: number;
  buildError:      string | null;
  /** ISO-8601 timestamp of when the current build started. Null until a build begins. */
  buildStartedAt:  string | null;
  /** Which retry attempt we're currently on (1..buildAttemptMax). */
  buildAttempt:    number | null;
  /** How many attempts the generator will try total. */
  buildAttemptMax: number | null;
  domainPurchased: string | null;
  liveUrl:         string | null;
}

export interface DomainAvailability {
  available: boolean | null;
  reason?:   "registered" | "unknown" | "invalid" | "timeout";
}

// ── Endpoints ─────────────────────────────────────────────────────────────

export function startDeploy(signalId: string) {
  return request<{ projectId: string }>("/deploy/custom/start", {
    method: "POST",
    body: JSON.stringify({ signalId }),
  });
}

export function extractIdentity(projectId: string) {
  return request<{ identity: ProjectIdentity }>(
    `/deploy/custom/${projectId}/extract`,
    { method: "POST" }
  );
}

export function getDeployProject(projectId: string) {
  return request<DeployProjectState>(`/deploy/custom/${projectId}`);
}

export function checkDomain(name: string) {
  return request<DomainAvailability>(
    `/deploy/custom/check-domain?name=${encodeURIComponent(name)}`
  );
}

export function getNamecheapUrl(name: string) {
  return request<{ url: string }>(
    `/deploy/custom/namecheap-url?name=${encodeURIComponent(name)}`
  );
}

export function getHostingerUrl() {
  return request<{ url: string }>("/deploy/custom/hostinger-url");
}

export function startBuild(projectId: string) {
  return request<{ status: string }>(`/deploy/custom/${projectId}/build`, {
    method: "POST",
  });
}

export function confirmPurchase(projectId: string, domain: string) {
  return request<{ domainPurchased: string; liveUrl: string }>(
    `/deploy/custom/${projectId}/confirm-purchase`,
    {
      method: "POST",
      body: JSON.stringify({ domain }),
    }
  );
}

/**
 * Trigger a browser download of the generated ZIP.
 * Resolves once the download has been initiated.
 */
export async function downloadZip(projectId: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(
    `${getApiBase()}/deploy/custom/${projectId}/download`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    let msg = res.statusText;
    try { msg = (await res.json()).error || msg; } catch {}
    throw new Error(msg);
  }

  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") || "";
  const match = /filename="?([^";]+)"?/i.exec(cd);
  const filename = match?.[1] || "site.zip";

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Product catalog editor (platform-agnostic) ───────────────────────────────
//
// Products live on the Project's identity and flow directly into every
// platform generator (Shopify, WordPress/Woo, IKAS, custom). These endpoints
// let the agency pre-fill / correct the list before the build runs. The
// server will reject malformed rows with a 400 and a field-keyed error, so
// the UI can surface it next to the offending input.

export function getProjectProducts(projectId: string) {
  return request<{ products: Product[] }>(
    `/deploy/projects/${projectId}/products`
  );
}

export function saveProjectProducts(projectId: string, products: Product[]) {
  return request<{ products: Product[] }>(
    `/deploy/projects/${projectId}/products`,
    {
      method: "PUT",
      body: JSON.stringify({ products }),
    }
  );
}

// ── Hero chooser (platform-agnostic pre-build step) ──────────────────────────
//
// The user sees three hero + first-fold variants in iframes, picks one,
// optionally types refinement text, then kicks off the full build. The
// state lives on Project.heroChooser on the server; these helpers wrap
// the four endpoints under /deploy/projects/:id/hero*.

export type HeroChooserStatus =
  | "none"        // no chooser record exists yet (frontend-only — server returns this)
  | "generating"
  | "ready"
  | "refining"
  | "refined"
  | "picked"
  | "failed";

export interface HeroVariant {
  id:        string;           // "variant-a" | "variant-b" | "variant-c"
  flavor:    string;           // e.g. "Typographic"
  html:      string;           // srcdoc-ready HTML document
  direction: string;           // direction key (all 3 variants share one)
}

export interface HeroChooserState {
  status:           HeroChooserStatus;
  variants:         HeroVariant[];
  pickedVariantId?: string;
  refinementText?:  string;
}

export function getHeroChooserState(projectId: string) {
  return request<HeroChooserState>(`/deploy/projects/${projectId}/hero`);
}

export function generateHeroVariants(projectId: string) {
  return request<{ variants: HeroVariant[] }>(
    `/deploy/projects/${projectId}/hero/variants`,
    { method: "POST" }
  );
}

export function pickHeroVariant(projectId: string, variantId: string) {
  return request<{ status: string; pickedVariantId: string }>(
    `/deploy/projects/${projectId}/hero/pick`,
    {
      method: "POST",
      body:   JSON.stringify({ variantId }),
    }
  );
}

export function refineHeroVariant(projectId: string, userText: string) {
  return request<{ status: string; variant: HeroVariant }>(
    `/deploy/projects/${projectId}/hero/refine`,
    {
      method: "POST",
      body:   JSON.stringify({ userText }),
    }
  );
}

// ── Shopify deploy flow ──────────────────────────────────────────────────────

export interface ShopifyProjectState extends DeployProjectState {
  platform: "shopify";
}

export interface ShopifyConnection {
  connected:   boolean;
  shopDomain?: string | null;
  scopes?:     string | null;
  isActive?:   boolean;
}

export interface ShopifyPublishResult {
  ok:              true;
  shopDomain:      string;
  themeId:         number;
  themeName:       string;
  themeFiles:      number;
  productsCreated: number;
  productIds:      string[];
  previewUrl:      string;
}

export function startShopifyDeploy(signalId: string) {
  return request<{ projectId: string }>("/deploy/shopify/start", {
    method: "POST",
    body:   JSON.stringify({ signalId }),
  });
}

export function extractShopifyIdentity(projectId: string) {
  return request<{ identity: ProjectIdentity }>(
    `/deploy/shopify/${projectId}/extract`,
    { method: "POST" }
  );
}

export function getShopifyProject(projectId: string) {
  return request<ShopifyProjectState>(`/deploy/shopify/${projectId}`);
}

export function startShopifyBuild(projectId: string) {
  return request<{ status: string }>(`/deploy/shopify/${projectId}/build`, {
    method: "POST",
  });
}

export function getShopifyConnection() {
  return request<ShopifyConnection>("/deploy/shopify/connection");
}

export function publishToShopify(projectId: string) {
  return request<ShopifyPublishResult>(`/deploy/shopify/${projectId}/publish`, {
    method: "POST",
  });
}

/**
 * Returns the absolute URL the user's browser should navigate to in order
 * to start the Shopify OAuth install flow. The server-side route requires
 * an Authorization header OR `?token=` — since a top-level navigation can't
 * set headers, we pass the JWT as a query param.
 */
export function getShopifyAuthorizeUrl(shop: string): string {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  const qs = new URLSearchParams({ shop, token });
  return `${getApiBase()}/auth/shopify/authorize?${qs.toString()}`;
}

/** Trigger download for the Shopify bundle ZIP (theme + products.csv). */
export async function downloadShopifyZip(projectId: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(
    `${getApiBase()}/deploy/shopify/${projectId}/download`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    let msg = res.statusText;
    try { msg = (await res.json()).error || msg; } catch {}
    throw new Error(msg);
  }

  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") || "";
  const match = /filename="?([^";]+)"?/i.exec(cd);
  const filename = match?.[1] || "shopify-bundle.zip";

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── WordPress deploy flow ────────────────────────────────────────────────────

export type WordPressFlavor = "self_hosted" | "dotcom";

export interface WordPressProjectState extends DeployProjectState {
  platform: "wordpress";
}

export interface WordPressConnection {
  connected:           boolean;
  siteUrl?:            string | null;
  flavor?:             WordPressFlavor | null;
  username?:           string | null;
  wooCommerceEnabled?: boolean;
  isActive?:           boolean;
}

export interface WordPressConfigStatus {
  /** Self-hosted (Application Password) works with zero server config. */
  selfHostedSupported:   boolean;
  /** WordPress.com OAuth requires a developer app registered on WP.com. */
  dotcomOAuthConfigured: boolean;
  apiVersion:            string;
  scopes:                string;
  redirectUri:           string;
}

export interface WordPressPublishResult {
  ok:                   true;
  siteUrl:              string;
  flavor:               WordPressFlavor;
  pagesCreated:         number;
  pageLinks:            string[];
  productsCreated:      number;
  productIds:           number[];
  wooCommerceAvailable: boolean;
  themeAdminUrl:        string;
}

export interface WordPressConnectSelfHostedInput {
  siteUrl:             string;
  username:            string;
  applicationPassword: string;
}

export interface WordPressConnectSelfHostedResult {
  ok:                 true;
  siteUrl:            string;
  username:           string;
  wooCommerceEnabled: boolean;
}

export function startWordPressDeploy(signalId: string) {
  return request<{ projectId: string }>("/deploy/wordpress/start", {
    method: "POST",
    body:   JSON.stringify({ signalId }),
  });
}

export function extractWordPressIdentity(projectId: string) {
  return request<{ identity: ProjectIdentity }>(
    `/deploy/wordpress/${projectId}/extract`,
    { method: "POST" }
  );
}

export function getWordPressProject(projectId: string) {
  return request<WordPressProjectState>(`/deploy/wordpress/${projectId}`);
}

export function startWordPressBuild(projectId: string) {
  return request<{ status: string }>(`/deploy/wordpress/${projectId}/build`, {
    method: "POST",
  });
}

export function getWordPressConnection() {
  return request<WordPressConnection>("/deploy/wordpress/connection");
}

export function publishToWordPress(projectId: string) {
  return request<WordPressPublishResult>(
    `/deploy/wordpress/${projectId}/publish`,
    { method: "POST" }
  );
}

/** Public (no auth) — tells the UI which flavors are usable. */
export async function getWordPressConfigStatus(): Promise<WordPressConfigStatus> {
  const res = await fetch(`${getApiBase()}/auth/wordpress/config-status`);
  if (!res.ok) {
    let msg = res.statusText;
    try { msg = (await res.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<WordPressConfigStatus>;
}

/**
 * Self-hosted (WordPress.org) — connect via an Application Password.
 * User generates one at  Users → Profile → Application Passwords  in their
 * WP admin and pastes it here.
 */
export function connectWordPressApplicationPassword(
  input: WordPressConnectSelfHostedInput
) {
  return request<WordPressConnectSelfHostedResult>(
    "/auth/wordpress/connect-application-password",
    {
      method: "POST",
      body:   JSON.stringify(input),
    }
  );
}

/**
 * Absolute URL for the top-level navigation to start the WordPress.com
 * OAuth flow. Same pattern as Shopify — the server accepts `?token=`
 * because a browser navigation can't set the Authorization header.
 */
export function getWordPressComAuthorizeUrl(siteUrl?: string): string {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  const qs = new URLSearchParams({ token });
  if (siteUrl) qs.set("siteUrl", siteUrl);
  return `${getApiBase()}/auth/wordpress/authorize?${qs.toString()}`;
}

/** Disconnect the WordPress PlatformConnection for this user. */
export function disconnectWordPress() {
  return request<{ ok: true; removed: number }>(
    "/webhook/wordpress/disconnect",
    { method: "POST" }
  );
}

/** Trigger download for the WordPress bundle ZIP (theme ZIP + pages + CSV). */
export async function downloadWordPressZip(projectId: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(
    `${getApiBase()}/deploy/wordpress/${projectId}/download`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    let msg = res.statusText;
    try { msg = (await res.json()).error || msg; } catch {}
    throw new Error(msg);
  }

  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") || "";
  const match = /filename="?([^";]+)"?/i.exec(cd);
  const filename = match?.[1] || "wordpress-bundle.zip";

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
