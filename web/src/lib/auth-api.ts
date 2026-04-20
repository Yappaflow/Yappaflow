let _apiBase: string | null = null;
function getApiBase(): string {
  if (_apiBase !== null) return _apiBase;
  const direct = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  if (typeof window === "undefined") return direct;
  _apiBase = direct;
  return _apiBase;
}

/**
 * Exchange a freshly-minted JWT for an httpOnly session cookie.
 * The cookie is what Next.js middleware checks to guard /dashboard — without
 * it, anyone could paste the URL and see the dashboard shell.
 *
 * IMPORTANT: we hit the SAME-ORIGIN path `/api/auth/session` (proxied via
 * Next.js rewrites in next.config.ts). Hitting the Railway origin directly
 * would set the cookie on the API domain, where the frontend middleware
 * can't see it — that's the cross-origin cookie bug we'd bounce on forever.
 * With the rewrite, the Set-Cookie header flows back through yappaflow.com
 * and the cookie lands on the frontend origin, which is exactly where
 * middleware reads from.
 *
 * `credentials: "same-origin"` (the default is fine too) because the request
 * is now same-origin.
 */
export async function establishSession(token: string): Promise<void> {
  if (!token) return;
  try {
    await fetch(`/api/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ token }),
    });
  } catch {
    // If the cookie call fails the middleware will just bounce the user
    // back to /auth — better than silently ignoring a token mismatch.
  }
}

export async function destroySession(): Promise<void> {
  try {
    await fetch(`/api/auth/session`, {
      method: "DELETE",
      credentials: "same-origin",
    });
  } catch {
    /* ignore */
  }
}

async function gql(query: string, variables?: Record<string, unknown>, token?: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000); // 15 s — Twilio can be slow

  let res: Response;
  try {
    res = await fetch(`${getApiBase()}/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
  } catch (err) {
    const isTimeout = err instanceof DOMException && err.name === "AbortError";
    throw new Error(
      isTimeout
        ? "Request timed out — check your internet connection and that the API server is running."
        : "Cannot reach the server. Make sure the API server is running on port 4000."
    );
  } finally {
    clearTimeout(timeout);
  }

  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

export async function registerWithEmail(
  email: string,
  password: string,
  name: string
) {
  return gql(
    `mutation Register($input: EmailRegisterInput!) {
      registerWithEmail(input: $input) { token user { id name email phoneVerified authProvider } }
    }`,
    { input: { email, password, name } }
  );
}

export async function loginWithEmail(email: string, password: string) {
  return gql(
    `mutation Login($input: EmailLoginInput!) {
      loginWithEmail(input: $input) { token user { id name email phoneVerified authProvider } }
    }`,
    { input: { email, password } }
  );
}

export async function requestWhatsappOtp(phone: string) {
  return gql(
    `mutation Req($phone: String!) { requestWhatsappOtp(phone: $phone) { success message } }`,
    { phone }
  );
}

export async function verifyWhatsappOtp(phone: string, code: string) {
  return gql(
    `mutation Verify($phone: String!, $code: String!) {
      verifyWhatsappOtp(phone: $phone, code: $code) { token user { id name phone phoneVerified authProvider } }
    }`,
    { phone, code }
  );
}

export async function requestPhoneVerification(phone: string, token: string) {
  return gql(
    `mutation ReqPhone($phone: String!) { requestPhoneVerification(phone: $phone) { success message } }`,
    { phone },
    token
  );
}

export async function verifyPhone(phone: string, code: string, token: string) {
  return gql(
    `mutation VerifyPhone($phone: String!, $code: String!) {
      verifyPhone(phone: $phone, code: $code) { id name phone phoneVerified authProvider }
    }`,
    { phone, code },
    token
  );
}

export function getInstagramAuthUrl() {
  // Always return a stable string for SSR consistency.
  // On ngrok/deployed, the Next.js rewrite proxies /api/* to the API server.
  // On localhost, /api/* also works via rewrites, so this is safe everywhere.
  return "/api/auth/instagram/authorize";
}

// ── WhatsApp Business API connection (used during onboarding) ─────────────────

const PLATFORM_FIELDS = `id platform displayPhone igUsername createdAt`;

export async function connectWhatsApp(input: { accessToken: string; wabaId?: string }, token: string) {
  return gql(
    `mutation ConnectWhatsApp($input: ConnectWhatsAppInput!) {
      connectWhatsApp(input: $input) { ${PLATFORM_FIELDS} }
    }`,
    { input },
    token
  );
}

export async function connectWhatsAppEmbedded(
  input: { code: string; wabaId?: string; phoneNumberId?: string; redirectUri?: string },
  token: string
) {
  return gql(
    `mutation ConnectWhatsAppEmbedded($input: ConnectWhatsAppEmbeddedInput!) {
      connectWhatsAppEmbedded(input: $input) { ${PLATFORM_FIELDS} }
    }`,
    { input },
    token
  );
}
