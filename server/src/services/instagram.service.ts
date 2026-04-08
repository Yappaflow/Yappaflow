import axios from "axios";
import { env } from "../config/env";

export interface InstagramProfile {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  account_type?: string;
}

export function getInstagramAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.instagramClientId,
    redirect_uri: env.instagramRedirectUri,
    scope: "instagram_business_basic",
    response_type: "code",
    state,
  });
  return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: env.instagramClientId,
    client_secret: env.instagramClientSecret,
    grant_type: "authorization_code",
    redirect_uri: env.instagramRedirectUri,
    code,
  });

  const { data } = await axios.post(
    "https://api.instagram.com/oauth/access_token",
    params.toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  return data.access_token;
}

export async function getInstagramProfile(
  accessToken: string
): Promise<InstagramProfile> {
  const { data } = await axios.get("https://graph.instagram.com/me", {
    params: {
      fields: "id,username,name,profile_picture_url,account_type",
      access_token: accessToken,
    },
  });
  return data;
}
