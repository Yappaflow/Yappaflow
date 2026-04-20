import { describe, it, expect } from "vitest";
import { buildWordPressClient } from "../services/wordpress-admin.service";

// These tests cover the pure / synchronous parts of the WordPress admin
// service — primarily `buildWordPressClient` which sets up the axios instance
// and namespace URLs differently for self-hosted (Basic auth) vs WordPress.com
// (Bearer). The REST-driven functions (createPage, uploadMediaFromUrl,
// createWooProduct, pushWordPressBundle) hit Mongo + axios and are covered
// by integration-style tests elsewhere.

describe("buildWordPressClient — self-hosted", () => {
  it("builds a Basic-auth axios instance scoped to the site's /wp-json roots", () => {
    const client = buildWordPressClient({
      siteUrl:     "https://example.com",
      flavor:      "self_hosted",
      username:    "author",
      accessToken: "abcd efgh ijkl mnop qrst uvwx",
    });

    expect(client.wpV2).toBe("https://example.com/wp-json/wp/v2");
    expect(client.wcV3).toBe("https://example.com/wp-json/wc/v3");

    // Authorization header should be Basic + base64 of "user:password_stripped"
    const expectedBasic = Buffer.from(
      "author:abcdefghijklmnopqrstuvwx",
      "utf8"
    ).toString("base64");
    expect(client.http.defaults.headers.Authorization).toBe(`Basic ${expectedBasic}`);
    expect(client.http.defaults.headers.Accept).toBe("application/json");

    // validateStatus is configured to never throw (caller inspects status)
    expect(typeof client.http.defaults.validateStatus).toBe("function");
    expect(client.http.defaults.validateStatus!(404)).toBe(true);
    expect(client.http.defaults.validateStatus!(500)).toBe(true);
  });

  it("throws when self_hosted is missing a username", () => {
    expect(() =>
      buildWordPressClient({
        siteUrl:     "https://example.com",
        flavor:      "self_hosted",
        accessToken: "secret",
      })
    ).toThrow(/self-hosted WordPress requires a username/i);
  });

  it("throws when siteUrl is missing (regardless of flavor)", () => {
    expect(() =>
      buildWordPressClient({
        siteUrl:     "",
        flavor:      "self_hosted",
        username:    "author",
        accessToken: "secret",
      })
    ).toThrow(/requires a siteUrl/i);
  });
});

describe("buildWordPressClient — WordPress.com (dotcom)", () => {
  it("uses the Bearer header and WP.com-proxied namespaces keyed by siteId", () => {
    const client = buildWordPressClient({
      siteUrl:     "https://author.wordpress.com",
      flavor:      "dotcom",
      accessToken: "wpcom-access-token",
      siteId:      "123456",
    });

    expect(client.wpV2).toBe("https://public-api.wordpress.com/wp/v2/sites/123456");
    expect(client.wcV3).toBe("https://public-api.wordpress.com/wc/v3/sites/123456");

    expect(client.http.defaults.headers.Authorization).toBe("Bearer wpcom-access-token");
    expect(client.http.defaults.headers.Accept).toBe("application/json");
  });

  it("does not require a username for dotcom", () => {
    expect(() =>
      buildWordPressClient({
        siteUrl:     "https://author.wordpress.com",
        flavor:      "dotcom",
        accessToken: "t",
        siteId:      "1",
      })
    ).not.toThrow();
  });

  it("leaves an empty siteId segment when siteId is omitted (caller's responsibility)", () => {
    // We don't throw here — the caller can still pull /sites/me or hit the
    // /me endpoint to resolve siteId. Just assert the URL shape.
    const client = buildWordPressClient({
      siteUrl:     "https://author.wordpress.com",
      flavor:      "dotcom",
      accessToken: "t",
    });
    expect(client.wpV2).toBe("https://public-api.wordpress.com/wp/v2/sites/");
    expect(client.wcV3).toBe("https://public-api.wordpress.com/wc/v3/sites/");
  });
});
