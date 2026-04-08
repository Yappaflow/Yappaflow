const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function gql(query: string, variables?: Record<string, unknown>, token?: string) {
  const res = await fetch(`${API_URL}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
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
  return `${API_URL}/auth/instagram/authorize`;
}
