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

export interface ProjectIdentity {
  businessName:      string;
  tagline?:          string;
  industry?:         string;
  tone?:             string;
  city?:             string;
  domainSuggestions: string[];
  extractedAt:       string;
}

export type BuildJobStatus = "pending" | "running" | "done" | "failed";

export interface DeployProjectState {
  projectId:       string;
  phase:           "listening" | "building" | "deploying" | "live";
  progress:        number;
  identity:        ProjectIdentity | null;
  buildJobStatus:  BuildJobStatus | null;
  buildFilesDone:  number;
  buildFilesTotal: number;
  buildError:      string | null;
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
