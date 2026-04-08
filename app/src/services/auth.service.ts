const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

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

export async function apiRegisterEmail(email: string, password: string, name: string) {
  const data = await gql(
    `mutation($input: EmailRegisterInput!) {
      registerWithEmail(input: $input) { token user { id name email phoneVerified authProvider } }
    }`,
    { input: { email, password, name } }
  );
  return data.registerWithEmail as { token: string; user: AuthUser };
}

export async function apiLoginEmail(email: string, password: string) {
  const data = await gql(
    `mutation($input: EmailLoginInput!) {
      loginWithEmail(input: $input) { token user { id name email phoneVerified authProvider } }
    }`,
    { input: { email, password } }
  );
  return data.loginWithEmail as { token: string; user: AuthUser };
}

export async function apiRequestWhatsappOtp(phone: string) {
  const data = await gql(
    `mutation($phone: String!) { requestWhatsappOtp(phone: $phone) { success message } }`,
    { phone }
  );
  return data.requestWhatsappOtp as { success: boolean; message: string };
}

export async function apiVerifyWhatsappOtp(phone: string, code: string) {
  const data = await gql(
    `mutation($phone: String!, $code: String!) {
      verifyWhatsappOtp(phone: $phone, code: $code) { token user { id name phone phoneVerified authProvider } }
    }`,
    { phone, code }
  );
  return data.verifyWhatsappOtp as { token: string; user: AuthUser };
}

export async function apiRequestPhoneVerify(phone: string, token: string) {
  const data = await gql(
    `mutation($phone: String!) { requestPhoneVerification(phone: $phone) { success message } }`,
    { phone },
    token
  );
  return data.requestPhoneVerification as { success: boolean; message: string };
}

export async function apiVerifyPhone(phone: string, code: string, token: string) {
  const data = await gql(
    `mutation($phone: String!, $code: String!) {
      verifyPhone(phone: $phone, code: $code) { id name phone phoneVerified authProvider }
    }`,
    { phone, code },
    token
  );
  return data.verifyPhone as AuthUser;
}

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  phoneVerified: boolean;
  authProvider: string;
}
