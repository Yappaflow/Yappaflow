/**
 * Webflow OAuth 2.0 (Authorization Code grant).
 *
 * Spec: https://developers.webflow.com/data/reference/oauth-app
 *
 * Flow:
 *   1. GET  /auth/webflow/authorize
 *      → redirects the user to Webflow's install screen on
 *        `https://webflow.com/oauth/authorize`.
 *   2. Webflow redirects back to our registered redirect URI with:
 *        ?code=<code>&state=<state>
 *      We verify our own `state` signature and exchange the code.
 *   3. POST to https://api.webflow.com/oauth/access_token with
 *        { client_id, client_secret, code, grant_type: "authorization_code",
 *          redirect_uri }
 *      → returns `{ access_token, token_type, scope }`.
 *
 * Unlike Shopify, Webflow OAuth does NOT sign callback parameters with an
 * HMAC — our `state` (HMAC'd by us against the JWT secret) is the only
 * CSRF defense, so it's important that EVERY authorize call issues a fresh
 * state bound to the user.
 *
 * Token lifetime: Webflow tokens are currently long-lived (no short TTL,
 * no refresh token). Treat them like the Shopify Admin access token: store
 * encrypted on `PlatformConnection` and only invalidate on uninstall.
 */

import axios from "axios";
import { env } from "../config/env";

const WEBFLOW_AUTHORIZE_URL    = "https://webflow.com/oauth/authorize";
const WEBFLOW_TOKEN_URL        = "https://api.webflow.com/oauth/access_token";
const WEBFLOW_AUTHED_USER_URL  = "https://api.webflow.com/v2/token/authorized_by";

export interface WebflowTokenResponse {
  access_token: string;
  token_type:   string;
  scope?:       string;
}

/**
 * Build the Webflow OAuth install URL. The `state` value is opaque to us
 * here — callers embed whatever they want inside it and verify it on the
 * callback. `shopify.route.ts`'s `buildState` helper is the reference
 * implementation we mirror here.
 */
export function getWebflowAuthUrl(state: string): string {
  if (!env.webflowClientId) {
    throw new Error("WEBFLOW_CLIENT_ID is not set — cannot start OAuth");
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id:     env.webflowClientId,
    redirect_uri:  env.webflowRedirectUri,
    scope:         env.webflowScopes,
    state,
  });
  return `${WEBFLOW_AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code for a long-lived Data API access token.
 */
export async function exchangeCodeForAccessToken(
  code: string
): Promise<WebflowTokenResponse> {
  if (!env.webflowClientId || !env.webflowClientSecret) {
    throw new Error("Webflow API credentials are not configured");
  }

  const { data } = await axios.post(
    WEBFLOW_TOKEN_URL,
    {
      client_id:     env.webflowClientId,
      client_secret: env.webflowClientSecret,
      code,
      grant_type:    "authorization_code",
      redirect_uri:  env.webflowRedirectUri,
    },
    { headers: { "Content-Type": "application/json" } }
  );

  if (!data?.access_token) {
    throw new Error("Webflow /oauth/access_token response missing access_token");
  }
  return data as WebflowTokenResponse;
}

export interface WebflowAuthorizedUser {
  /** Workspace the token is authorized on, when applicable. */
  workspaceId?: string;
  /** Primary site attached to the token, when the app was installed site-scoped. */
  siteId?:      string;
  /** The Webflow user id that installed the app. */
  userId?:      string;
  /** Raw response — stored for debugging, not normalized beyond the above. */
  raw:          unknown;
}

/**
 * Introspect the token we just received so we can stash the workspace + (maybe)
 * default site on the PlatformConnection. Webflow's "authorized_by" endpoint
 * returns whatever scopes granted us access, so we defensively normalize.
 */
export async function introspectAuthorizedToken(
  accessToken: string
): Promise<WebflowAuthorizedUser> {
  try {
    const { data } = await axios.get(WEBFLOW_AUTHED_USER_URL, {
      headers: {
        Authorization:       `Bearer ${accessToken}`,
        "accept-version":    env.webflowApiVersion,
      },
    });
    const d = data as {
      workspaceIds?: string[];
      siteIds?:      string[];
      authorization?: {
        workspaceIds?: string[];
        siteIds?:      string[];
        user?:         { id?: string };
      };
      user?: { id?: string };
    };

    const workspaceIds =
      d.workspaceIds ?? d.authorization?.workspaceIds ?? [];
    const siteIds =
      d.siteIds ?? d.authorization?.siteIds ?? [];
    const userId = d.user?.id ?? d.authorization?.user?.id;

    return {
      workspaceId: workspaceIds[0],
      siteId:      siteIds[0],
      userId,
      raw:         data,
    };
  } catch (err) {
    // Don't fail the OAuth flow if introspection is refused — we can still
    // list sites later with the token itself.
    return { raw: { error: (err as Error).message } };
  }
}
