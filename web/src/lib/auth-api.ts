let _apiBase: string | null = null;
function getApiBase(): string {
  if (_apiBase !== null) return _apiBase;
  const direct = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  if (typeof window === "undefined") return direct;
  const host = window.location.hostname;
  _apiBase = (host === "localhost" || host === "127.0.0.1") ? direct : "/api";
  return _apiBase;
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

export async function connectWhatsApp(input: { accessToken: string }, token: string) {
  return gql(
    `mutation ConnectWhatsApp($input: ConnectWhatsAppInput!) {
      connectWhatsApp(input: $input) { ${PLATFORM_FIELDS} }
    }`,
    { input },
    token
  );
}

export async function connectWhatsAppEmbedded(
  input: { code: string; wabaId: string; phoneNumberId: string },
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
