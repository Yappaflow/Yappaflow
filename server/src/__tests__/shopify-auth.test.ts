import { describe, it, expect, beforeAll } from "vitest";
import crypto from "crypto";

// The service reads env at call time (via the `env` export which is evaluated
// at import). We need to set the vars BEFORE importing the module.
beforeAll(() => {
  process.env.SHOPIFY_API_KEY      = "test-api-key";
  process.env.SHOPIFY_API_SECRET   = "test-api-secret";
  process.env.SHOPIFY_SCOPES       = "write_themes,read_themes,write_products";
  process.env.SHOPIFY_REDIRECT_URI = "https://app.example.com/auth/shopify/callback";
});

async function loadService() {
  // Dynamic import after env is set
  return await import("../services/shopify-auth.service");
}

describe("isValidShopDomain", () => {
  it("accepts valid myshopify subdomains", async () => {
    const { isValidShopDomain } = await loadService();
    expect(isValidShopDomain("acme.myshopify.com")).toBe(true);
    expect(isValidShopDomain("my-store-99.myshopify.com")).toBe(true);
  });
  it("rejects spoofed or malformed domains", async () => {
    const { isValidShopDomain } = await loadService();
    expect(isValidShopDomain("acme.com")).toBe(false);
    expect(isValidShopDomain("acme.myshopify.com.evil.com")).toBe(false);
    expect(isValidShopDomain("evil.com/acme.myshopify.com")).toBe(false);
    expect(isValidShopDomain("-acme.myshopify.com")).toBe(false);
    expect(isValidShopDomain("")).toBe(false);
  });
});

describe("getShopifyAuthUrl", () => {
  it("builds a correct authorize URL with our scopes + redirect", async () => {
    const { getShopifyAuthUrl } = await loadService();
    const url = new URL(getShopifyAuthUrl("acme.myshopify.com", "state-xyz"));
    expect(url.origin).toBe("https://acme.myshopify.com");
    expect(url.pathname).toBe("/admin/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("test-api-key");
    expect(url.searchParams.get("scope")).toBe("write_themes,read_themes,write_products");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://app.example.com/auth/shopify/callback"
    );
    expect(url.searchParams.get("state")).toBe("state-xyz");
  });

  it("refuses to build a URL for a spoofed shop domain", async () => {
    const { getShopifyAuthUrl } = await loadService();
    expect(() => getShopifyAuthUrl("evil.com", "x")).toThrow(/invalid shop domain/);
  });
});

describe("verifyShopifyHmac", () => {
  async function makeSignedQuery(
    params: Record<string, string>,
    secret = "test-api-secret"
  ) {
    const message = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&");
    const hmac = crypto.createHmac("sha256", secret).update(message).digest("hex");
    return { ...params, hmac };
  }

  it("accepts a correctly-signed callback query", async () => {
    const { verifyShopifyHmac } = await loadService();
    const q = await makeSignedQuery({
      code:      "abc123",
      shop:      "acme.myshopify.com",
      state:     "opaque-state",
      timestamp: "1700000000",
    });
    expect(verifyShopifyHmac(q)).toBe(true);
  });

  it("rejects a tampered query", async () => {
    const { verifyShopifyHmac } = await loadService();
    const q = await makeSignedQuery({
      code:      "abc123",
      shop:      "acme.myshopify.com",
      state:     "opaque-state",
      timestamp: "1700000000",
    });
    (q as any).shop = "evil.myshopify.com";
    expect(verifyShopifyHmac(q)).toBe(false);
  });

  it("rejects a query with a missing hmac param", async () => {
    const { verifyShopifyHmac } = await loadService();
    expect(
      verifyShopifyHmac({ code: "x", shop: "y.myshopify.com", state: "z" })
    ).toBe(false);
  });

  it("rejects a query signed with the wrong secret", async () => {
    const { verifyShopifyHmac } = await loadService();
    const q = await makeSignedQuery(
      { code: "abc", shop: "acme.myshopify.com", state: "s", timestamp: "1" },
      "wrong-secret"
    );
    expect(verifyShopifyHmac(q)).toBe(false);
  });
});
