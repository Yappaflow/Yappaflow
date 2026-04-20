import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import crypto from "crypto";

// ── Env + model mocks (must run before service imports) ──────────────────────

beforeAll(() => {
  process.env.SHOPIFY_API_SECRET = "unit-test-secret";
  process.env.SHOPIFY_API_KEY    = "unit-test-key";
});

const deleteMany = vi.fn();
vi.mock("../models/PlatformConnection.model", () => ({
  PlatformConnection: {
    deleteMany: (...args: unknown[]) => deleteMany(...args),
  },
}));

vi.mock("../utils/logger", () => ({
  log:      vi.fn(),
  logError: vi.fn(),
}));

// Dynamic import — service reads env at module load.
async function loadService() {
  return await import("../services/shopify-webhook.service");
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function hmac(secret: string, body: Buffer): string {
  return crypto.createHmac("sha256", secret).update(body).digest("base64");
}

// ── verifyWebhookHmac ────────────────────────────────────────────────────────

describe("verifyWebhookHmac", () => {
  it("accepts a signature computed with the configured secret", async () => {
    const { verifyWebhookHmac } = await loadService();
    const body = Buffer.from('{"shop_domain":"demo.myshopify.com"}');
    const sig  = hmac("unit-test-secret", body);
    expect(verifyWebhookHmac(body, sig)).toBe(true);
  });

  it("rejects a signature computed with the wrong secret", async () => {
    const { verifyWebhookHmac } = await loadService();
    const body = Buffer.from("any body");
    const sig  = hmac("someone-else-secret", body);
    expect(verifyWebhookHmac(body, sig)).toBe(false);
  });

  it("rejects when the body has been tampered with", async () => {
    const { verifyWebhookHmac } = await loadService();
    const original = Buffer.from('{"ok":true}');
    const sig      = hmac("unit-test-secret", original);
    const tampered = Buffer.from('{"ok":false}');
    expect(verifyWebhookHmac(tampered, sig)).toBe(false);
  });

  it("rejects when the header is missing", async () => {
    const { verifyWebhookHmac } = await loadService();
    const body = Buffer.from("x");
    expect(verifyWebhookHmac(body, undefined)).toBe(false);
  });

  it("rejects a header that isn't even the right length (no crash)", async () => {
    const { verifyWebhookHmac } = await loadService();
    const body = Buffer.from("x");
    // `crypto.timingSafeEqual` throws if lengths differ — our code must
    // short-circuit before calling it so an attacker can't DoS us with a
    // 1-byte signature header.
    expect(() => verifyWebhookHmac(body, "nope")).not.toThrow();
    expect(verifyWebhookHmac(body, "nope")).toBe(false);
  });

  it("rejects a forged signature the same length as the real one", async () => {
    const { verifyWebhookHmac } = await loadService();
    const body  = Buffer.from("payload");
    const real  = hmac("unit-test-secret", body);
    // same length, different bytes
    const forged = "A".repeat(real.length);
    expect(verifyWebhookHmac(body, forged)).toBe(false);
  });
});

// ── handleAppUninstalled ─────────────────────────────────────────────────────

describe("handleAppUninstalled", () => {
  beforeEach(() => deleteMany.mockReset());

  it("deletes every Shopify PlatformConnection for the shop", async () => {
    deleteMany.mockResolvedValueOnce({ deletedCount: 2 });
    const { handleAppUninstalled } = await loadService();
    const out = await handleAppUninstalled("acme.myshopify.com");
    expect(deleteMany).toHaveBeenCalledWith({
      platform:   "shopify",
      shopDomain: "acme.myshopify.com",
    });
    expect(out).toEqual({ removed: 2 });
  });

  it("reports zero removed when the shop wasn't stored", async () => {
    deleteMany.mockResolvedValueOnce({ deletedCount: 0 });
    const { handleAppUninstalled } = await loadService();
    const out = await handleAppUninstalled("nobody.myshopify.com");
    expect(out).toEqual({ removed: 0 });
  });

  it("tolerates a mongo result without deletedCount (e.g. older driver)", async () => {
    deleteMany.mockResolvedValueOnce({});
    const { handleAppUninstalled } = await loadService();
    const out = await handleAppUninstalled("old.myshopify.com");
    expect(out).toEqual({ removed: 0 });
  });
});

// ── handleCustomersDataRequest / handleCustomersRedact ───────────────────────

describe("GDPR customer webhooks (no-op, log only)", () => {
  beforeEach(() => deleteMany.mockReset());

  it("customers/data_request does NOT touch the DB — we don't store customer data", async () => {
    const { handleCustomersDataRequest } = await loadService();
    await handleCustomersDataRequest({
      shop_domain: "acme.myshopify.com",
      customer:    { id: 42, email: "buyer@example.com" },
    });
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("customers/redact does NOT touch the DB — we don't store customer data", async () => {
    const { handleCustomersRedact } = await loadService();
    await handleCustomersRedact({
      shop_domain: "acme.myshopify.com",
      customer:    { id: 42 },
    });
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("handles missing fields gracefully (shop partner sometimes omits email)", async () => {
    const { handleCustomersDataRequest, handleCustomersRedact } = await loadService();
    await expect(handleCustomersDataRequest({})).resolves.toBeUndefined();
    await expect(handleCustomersRedact({})).resolves.toBeUndefined();
  });
});

// ── handleShopRedact ─────────────────────────────────────────────────────────

describe("handleShopRedact", () => {
  beforeEach(() => deleteMany.mockReset());

  it("deletes connections for the given shop (belt-and-braces after uninstall)", async () => {
    deleteMany.mockResolvedValueOnce({ deletedCount: 1 });
    const { handleShopRedact } = await loadService();
    await handleShopRedact({ shop_domain: "acme.myshopify.com" });
    expect(deleteMany).toHaveBeenCalledWith({
      platform:   "shopify",
      shopDomain: "acme.myshopify.com",
    });
  });

  it("is a no-op when shop_domain is missing (don't nuke every shopify row!)", async () => {
    const { handleShopRedact } = await loadService();
    await handleShopRedact({});
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
