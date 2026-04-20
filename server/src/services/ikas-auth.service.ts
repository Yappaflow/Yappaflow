/**
 * ikas OAuth 2.0 (Authorization Code grant).
 *
 * Spec: https://ikas.dev/docs/api/admin-api/authentication
 *
 * Flow:
 *   1. GET  /auth/ikas/authorize?store=<name>
 *      → redirects the merchant to
 *        https://<store>.myikas.com/admin/oauth/authorize
 *      with our client_id, redirect_uri, scopes, and a signed state.
 *   2. ikas redirects back to our registered redirect URI with:
 *        ?code=<code>&state=<state>&storeName=<name>
 *      We verify our `state` signature and match the returned store.
 *   3. POST to https://<store>.myikas.com/api/admin/oauth/token with
 *        { client_id, client_secret, code,
 *          grant_type: "authorization_code", redirect_uri }
 *      → returns `{ access_token, refresh_token, expires_in, token_type, scope }`.
 *
 * ikas access tokens are short-lived (typically 3600s) and paired with a
 * refresh token. We persist both so background pushes keep working; the
 * admin service auto-refreshes on 401.
 *
 * Store-domain validation: ikas stores live on `<name>.myikas.com`.
 * `name` is lowercased alphanumeric-and-dashes (same rule as Shopify).
 */

import axios from "axios";
import { env } from "../config/env";

const STORE_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

export function isValidStoreName(store: string): boolean {
  return STORE_NAME_RE.test(store.toLowerCase());
}

export function storeDomain(store: string): string {
  return `${store.toLowerCase()}.${env.ikasAdminDomainSuffix}`;
}

/**
 * Build the ikas OAuth authorize URL. The `state` value is opaque here —
 * callers embed userId + store and verify on the callback (same pattern as
 * the Shopify/Webflow routes).
 */
export function getIkasAuthUrl(store: string, state: string): string {
  if (!isValidStoreName(store)) {
    throw new Error(`Refusing to build auth URL for invalid ikas store "${store}"`);
  }
  if (!env.ikasClientId) {
    throw new Error("IKAS_CLIENT_ID is not set — cannot start OAuth");
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id:     env.ikasClientId,
    redirect_uri:  env.ikasRedirectUri,
    scope:         env.ikasScopes,
    state,
  });
  return `https://${storeDomain(store)}/admin/oauth/authorize?${params.toString()}`;
}

export interface IkasTokenResponse {
  access_token:  string;
  refresh_token: string;
  token_type:    string;
  expires_in:    number;  // seconds
  scope?:        string;
}

/**
 * Exchange an authorization code for an access + refresh token pair.
 */
export async function exchangeCodeForAccessToken(
  store: string,
  code:  string
): Promise<IkasTokenResponse> {
  if (!isValidStoreName(store)) {
    throw new Error(`Refusing to exchange code against invalid ikas store "${store}"`);
  }
  if (!env.ikasClientId || !env.ikasClientSecret) {
    throw new Error("ikas API credentials are not configured");
  }

  const { data } = await axios.post(
    `https://${storeDomain(store)}/api/admin/oauth/token`,
    {
      client_id:     env.ikasClientId,
      client_secret: env.ikasClientSecret,
      code,
      grant_type:    "authorization_code",
      redirect_uri:  env.ikasRedirectUri,
    },
    { headers: { "Content-Type": "application/json" } }
  );

  if (!data?.access_token) {
    throw new Error("ikas /oauth/token response missing access_token");
  }
  return data as IkasTokenResponse;
}

/**
 * Refresh an expired access token using the stored refresh token. ikas
 * rotates the refresh token on each call, so callers MUST persist the new
 * value returned here.
 */
export async function refreshAccessToken(
  store:        string,
  refreshToken: string
): Promise<IkasTokenResponse> {
  if (!isValidStoreName(store)) {
    throw new Error(`Refusing to refresh against invalid ikas store "${store}"`);
  }
  if (!env.ikasClientId || !env.ikasClientSecret) {
    throw new Error("ikas API credentials are not configured");
  }

  const { data } = await axios.post(
    `https://${storeDomain(store)}/api/admin/oauth/token`,
    {
      client_id:     env.ikasClientId,
      client_secret: env.ikasClientSecret,
      grant_type:    "refresh_token",
      refresh_token: refreshToken,
    },
    { headers: { "Content-Type": "application/json" } }
  );

  if (!data?.access_token) {
    throw new Error("ikas refresh_token response missing access_token");
  }
  return data as IkasTokenResponse;
}

export interface IkasIdentity {
  merchantId?: string;
  storeName?:  string;
  raw:         unknown;
}

/**
 * Introspect the token by calling ikas's `me` GraphQL query (lightweight —
 * returns merchant id + store settings). We use this to capture the
 * merchant id before stashing the connection.
 */
export async function introspectMerchant(
  store:       string,
  accessToken: string
): Promise<IkasIdentity> {
  try {
    const { data } = await axios.post(
      `${env.ikasApiBase}/api/${env.ikasApiVersion}/admin/graphql`,
      {
        query: `query me { me { id storeName } }`,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    const me = (data?.data?.me ?? {}) as { id?: string; storeName?: string };
    return {
      merchantId: me.id,
      storeName:  me.storeName ?? store,
      raw:        data,
    };
  } catch (err) {
    return { raw: { error: (err as Error).message } };
  }
}
