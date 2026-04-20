import { describe, it, expect, beforeAll } from "vitest";

// The service reads env at call time via the `env` export (evaluated at
// import). Set vars BEFORE importing the module — same pattern the Shopify
// auth tests use.
beforeAll(() => {
  process.env.JWT_SECRET              = "test-jwt-secret-for-wordpress";
  process.env.WORDPRESS_CLIENT_ID     = "test-wp-client-id";
  process.env.WORDPRESS_CLIENT_SECRET = "test-wp-client-secret";
  process.env.WORDPRESS_SCOPES        = "global";
  process.env.WORDPRESS_REDIRECT_URI  = "https://app.example.com/auth/wordpress/callback";
});

async function loadService() {
  return await import("../services/wordpress-auth.service");
}

// ── Site URL normalization ──────────────────────────────────────────────────

describe("normalizeWordPressSiteUrl", () => {
  it("accepts a bare host and adds https", async () => {
    const { normalizeWordPressSiteUrl } = await loadService();
    expect(normalizeWordPressSiteUrl("example.com")).toBe("https://example.com");
  });

  it("accepts a full URL and strips the trailing slash", async () => {
    const { normalizeWordPressSiteUrl } = await loadService();
    expect(normalizeWordPressSiteUrl("https://example.com/")).toBe("https://example.com");
  });

  it("keeps a sub-path (sub-directory install)", async () => {
    const { normalizeWordPressSiteUrl } = await loadService();
    expect(normalizeWordPressSiteUrl("https://example.com/wp")).toBe("https://example.com/wp");
    expect(normalizeWordPressSiteUrl("https://example.com/wp/")).toBe("https://example.com/wp");
  });

  it("allows http for dev / LAN installs", async () => {
    const { normalizeWordPressSiteUrl } = await loadService();
    expect(normalizeWordPressSiteUrl("http://dev.local")).toBe("http://dev.local");
  });

  it("rejects empty, non-http, hostless, or query-bearing inputs", async () => {
    const { normalizeWordPressSiteUrl } = await loadService();
    expect(normalizeWordPressSiteUrl("")).toBeNull();
    expect(normalizeWordPressSiteUrl("   ")).toBeNull();
    expect(normalizeWordPressSiteUrl("ftp://example.com")).toBeNull();
    expect(normalizeWordPressSiteUrl("localhost")).toBeNull();         // no dot
    expect(normalizeWordPressSiteUrl("https://example.com?x=1")).toBeNull();
    expect(normalizeWordPressSiteUrl("https://example.com#frag")).toBeNull();
  });
});

describe("isValidWordPressSiteUrl", () => {
  it("agrees with normalizeWordPressSiteUrl's null/non-null outcomes", async () => {
    const { isValidWordPressSiteUrl } = await loadService();
    expect(isValidWordPressSiteUrl("example.com")).toBe(true);
    expect(isValidWordPressSiteUrl("")).toBe(false);
    expect(isValidWordPressSiteUrl("not-a-url")).toBe(false);
  });
});

// ── Self-hosted verify (application password) ───────────────────────────────

describe("verifyApplicationPassword", () => {
  it("hits /wp-json/wp/v2/users/me with the right Basic-auth header", async () => {
    const { verifyApplicationPassword } = await loadService();

    let capturedUrl = "";
    let capturedHeader = "";

    const fetchImpl = (async (url: string, config: any) => {
      capturedUrl    = url;
      capturedHeader = config?.headers?.Authorization ?? "";
      return {
        status: 200,
        data: { id: 42, slug: "author", capabilities: { edit_posts: true } },
      };
    }) as any;

    const res = await verifyApplicationPassword({
      siteUrl:             "https://example.com",
      username:            "author",
      applicationPassword: "abcd efgh ijkl mnop qrst uvwx",
      fetchImpl,
    });

    expect(res.ok).toBe(true);
    expect(res.userId).toBe(42);
    expect(res.username).toBe("author");
    expect(res.capabilities).toEqual({ edit_posts: true });

    expect(capturedUrl).toBe("https://example.com/wp-json/wp/v2/users/me?context=edit");
    // Header should be  Basic base64("author:abcdefghijklmnopqrstuvwx")
    const expected = Buffer.from("author:abcdefghijklmnopqrstuvwx", "utf8").toString("base64");
    expect(capturedHeader).toBe(`Basic ${expected}`);
  });

  it("returns unauthorized on 401", async () => {
    const { verifyApplicationPassword } = await loadService();
    const fetchImpl = (async () => ({ status: 401, data: {} })) as any;

    const res = await verifyApplicationPassword({
      siteUrl:             "https://example.com",
      username:            "author",
      applicationPassword: "bad-pass",
      fetchImpl,
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("unauthorized");
  });

  it("returns rest_api_not_found on 404", async () => {
    const { verifyApplicationPassword } = await loadService();
    const fetchImpl = (async () => ({ status: 404, data: "Not Found" })) as any;

    const res = await verifyApplicationPassword({
      siteUrl:             "https://example.com",
      username:            "author",
      applicationPassword: "x",
      fetchImpl,
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("rest_api_not_found");
  });

  it("rejects missing fields up front without making a request", async () => {
    const { verifyApplicationPassword } = await loadService();
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return { status: 200, data: {} };
    }) as any;

    const r1 = await verifyApplicationPassword({
      siteUrl:             "not-a-url",
      username:            "u",
      applicationPassword: "p",
      fetchImpl,
    });
    expect(r1.ok).toBe(false);
    expect(r1.reason).toBe("invalid_site_url");

    const r2 = await verifyApplicationPassword({
      siteUrl:             "https://example.com",
      username:            "",
      applicationPassword: "p",
      fetchImpl,
    });
    expect(r2.ok).toBe(false);
    expect(r2.reason).toBe("missing_username");

    const r3 = await verifyApplicationPassword({
      siteUrl:             "https://example.com",
      username:            "u",
      applicationPassword: "",
      fetchImpl,
    });
    expect(r3.ok).toBe(false);
    expect(r3.reason).toBe("missing_password");

    expect(called).toBe(false);
  });

  it("swallows network errors and returns reason: network_error:…", async () => {
    const { verifyApplicationPassword } = await loadService();
    const fetchImpl = (async () => {
      throw new Error("connect ECONNREFUSED");
    }) as any;
    const res = await verifyApplicationPassword({
      siteUrl:             "https://example.com",
      username:            "u",
      applicationPassword: "p",
      fetchImpl,
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/^network_error:/);
  });
});

// ── WooCommerce detect ──────────────────────────────────────────────────────

describe("detectWooCommerce", () => {
  it("enabled=true for 200 on /wp-json/wc/v3", async () => {
    const { detectWooCommerce } = await loadService();
    const fetchImpl = (async () => ({ status: 200, data: { namespace: "wc/v3" } })) as any;
    expect(await detectWooCommerce("https://example.com", { fetchImpl })).toEqual({ enabled: true });
  });

  it("enabled=true for 401 (installed but auth required)", async () => {
    const { detectWooCommerce } = await loadService();
    const fetchImpl = (async () => ({ status: 401, data: {} })) as any;
    expect(await detectWooCommerce("https://example.com", { fetchImpl })).toEqual({ enabled: true });
  });

  it("enabled=false for 404", async () => {
    const { detectWooCommerce } = await loadService();
    const fetchImpl = (async () => ({ status: 404, data: {} })) as any;
    expect(await detectWooCommerce("https://example.com", { fetchImpl })).toEqual({ enabled: false });
  });

  it("enabled=false on network error", async () => {
    const { detectWooCommerce } = await loadService();
    const fetchImpl = (async () => {
      throw new Error("boom");
    }) as any;
    expect(await detectWooCommerce("https://example.com", { fetchImpl })).toEqual({ enabled: false });
  });

  it("enabled=false on invalid site URL (no network call at all)", async () => {
    const { detectWooCommerce } = await loadService();
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return { status: 200, data: {} };
    }) as any;
    expect(await detectWooCommerce("", { fetchImpl })).toEqual({ enabled: false });
    expect(called).toBe(false);
  });
});

// ── OAuth URL + state helpers ───────────────────────────────────────────────

describe("getWordPressComAuthUrl", () => {
  it("builds a correct WP.com authorize URL with our scopes + redirect", async () => {
    const { getWordPressComAuthUrl } = await loadService();
    const url = new URL(getWordPressComAuthUrl("state-xyz"));
    expect(url.origin).toBe("https://public-api.wordpress.com");
    expect(url.pathname).toBe("/oauth2/authorize");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe("test-wp-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://app.example.com/auth/wordpress/callback"
    );
    expect(url.searchParams.get("scope")).toBe("global");
    expect(url.searchParams.get("state")).toBe("state-xyz");
  });
});

describe("buildWordPressOAuthState / parseWordPressOAuthState", () => {
  it("round-trips userId and siteUrl (URL contains colons)", async () => {
    const { buildWordPressOAuthState, parseWordPressOAuthState } = await loadService();

    const userId  = "user-abc-123";
    const siteUrl = "https://example.com/wp";
    const state   = buildWordPressOAuthState(userId, siteUrl);

    const parsed = parseWordPressOAuthState(state);
    expect(parsed).not.toBeNull();
    expect(parsed!.userId).toBe(userId);
    expect(parsed!.siteUrl).toBe(siteUrl);
  });

  it("rejects a tampered state (signature fails)", async () => {
    const { buildWordPressOAuthState, parseWordPressOAuthState } = await loadService();
    const state = buildWordPressOAuthState("u1", "https://example.com");

    // Flip one char in the base64url-decoded payload
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const tampered = Buffer.from(decoded.replace("u1", "u2"), "utf8").toString("base64url");

    expect(parseWordPressOAuthState(tampered)).toBeNull();
  });

  it("rejects garbage / truncated states", async () => {
    const { parseWordPressOAuthState } = await loadService();
    expect(parseWordPressOAuthState("")).toBeNull();
    expect(parseWordPressOAuthState("not-base64!")).toBeNull();
    expect(parseWordPressOAuthState("YWJj")).toBeNull();   // "abc" — too few parts
  });

  it("produces different states for the same inputs (nonce is fresh)", async () => {
    const { buildWordPressOAuthState } = await loadService();
    const a = buildWordPressOAuthState("u", "https://example.com");
    const b = buildWordPressOAuthState("u", "https://example.com");
    expect(a).not.toBe(b);
  });
});
