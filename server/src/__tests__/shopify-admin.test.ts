import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createUnpublishedTheme,
  uploadThemeAsset,
  createProductViaGraphQL,
} from "../services/shopify-admin.service";

// ── Small helpers ────────────────────────────────────────────────────────────

function okJsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status:  200,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(status: number, body: string): Response {
  return new Response(body, { status });
}

/** Minimal REST client that records calls + returns scripted responses. */
function fakeRest(script: Partial<Record<"post" | "put" | "get" | "delete", (path: string, options?: any) => Response>>) {
  const calls: Array<{ method: string; path: string; options?: any }> = [];
  const handler =
    (method: "post" | "put" | "get" | "delete") =>
    async (path: string, options?: any) => {
      calls.push({ method, path, options });
      const fn = script[method];
      if (!fn) throw new Error(`No fake for ${method} ${path}`);
      return fn(path, options);
    };
  return {
    calls,
    client: {
      get:    handler("get"),
      post:   handler("post"),
      put:    handler("put"),
      delete: handler("delete"),
    } as any,
  };
}

/** Minimal GraphQL client that records calls + returns scripted data. */
function fakeGraphQL(scripted: (query: string, options?: any) => any) {
  const calls: Array<{ query: string; options?: any }> = [];
  return {
    calls,
    client: {
      request: async (query: string, options?: any) => {
        calls.push({ query, options });
        return scripted(query, options);
      },
    } as any,
  };
}

// ── Theme API ────────────────────────────────────────────────────────────────

describe("createUnpublishedTheme", () => {
  it("POSTs to /themes with role=unpublished and returns the parsed theme", async () => {
    const { client, calls } = fakeRest({
      post: () =>
        okJsonResponse({
          theme: { id: 123456, name: "Yappaflow – Test", role: "unpublished" },
        }),
    });

    const theme = await createUnpublishedTheme(client, "Yappaflow – Test");

    expect(theme).toEqual({
      id:   123456,
      name: "Yappaflow – Test",
      role: "unpublished",
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("post");
    expect(calls[0].path).toBe("themes");
    expect(calls[0].options).toEqual({
      data: { theme: { name: "Yappaflow – Test", role: "unpublished" } },
    });
  });

  it("throws with the Shopify status and body on non-2xx", async () => {
    const { client } = fakeRest({
      post: () => errorResponse(422, '{"errors":{"name":["is taken"]}}'),
    });

    await expect(createUnpublishedTheme(client, "Dup")).rejects.toThrow(
      /Shopify REST 422.*is taken/
    );
  });

  it("throws if Shopify omits the theme id", async () => {
    const { client } = fakeRest({ post: () => okJsonResponse({ theme: {} }) });
    await expect(createUnpublishedTheme(client, "X")).rejects.toThrow(
      /did not return a theme id/
    );
  });
});

describe("uploadThemeAsset", () => {
  it("PUTs the asset payload to /themes/{id}/assets", async () => {
    const { client, calls } = fakeRest({
      put: () =>
        okJsonResponse({
          asset: { key: "layout/theme.liquid", size: 123 },
        }),
    });

    await uploadThemeAsset(client, 999, "layout/theme.liquid", "<html></html>");

    expect(calls).toHaveLength(1);
    expect(calls[0].path).toBe("themes/999/assets");
    expect(calls[0].options).toEqual({
      data: { asset: { key: "layout/theme.liquid", value: "<html></html>" } },
    });
  });

  it("surfaces upload failures", async () => {
    const { client } = fakeRest({
      put: () => errorResponse(404, "Not Found"),
    });
    await expect(uploadThemeAsset(client, 1, "a", "b")).rejects.toThrow(
      /Shopify REST 404/
    );
  });
});

// ── Product API ──────────────────────────────────────────────────────────────

describe("createProductViaGraphQL", () => {
  it("sends a productSet mutation with the input and returns the created product", async () => {
    const { client, calls } = fakeGraphQL(() => ({
      data: {
        productSet: {
          product: {
            id:     "gid://shopify/Product/987",
            handle: "linen-shirt",
            title:  "Linen Shirt",
          },
          userErrors: [],
        },
      },
    }));

    const product = await createProductViaGraphQL(client, {
      title:           "Linen Shirt",
      descriptionHtml: "<p>Lightweight linen.</p>",
      vendor:          "Butik",
      productOptions:  [{ name: "Size", values: [{ name: "S" }, { name: "M" }] }],
      variants: [
        { price: "89.00", optionValues: [{ optionName: "Size", name: "S" }] },
        { price: "89.00", optionValues: [{ optionName: "Size", name: "M" }] },
      ],
    });

    expect(product.id).toBe("gid://shopify/Product/987");
    expect(product.handle).toBe("linen-shirt");

    expect(calls).toHaveLength(1);
    expect(calls[0].query).toMatch(/productSet\(input:/);
    expect(calls[0].options.variables.input.title).toBe("Linen Shirt");
    expect(calls[0].options.variables.input.variants).toHaveLength(2);
  });

  it("throws with all userErrors concatenated when productSet reports them", async () => {
    const { client } = fakeGraphQL(() => ({
      data: {
        productSet: {
          product: null,
          userErrors: [
            { field: ["input", "title"], message: "Title is required" },
            { field: ["input", "variants", "0", "price"], message: "Price is invalid" },
          ],
        },
      },
    }));

    await expect(
      createProductViaGraphQL(client, { title: "", variants: [] })
    ).rejects.toThrow(/Title is required.*Price is invalid/);
  });

  it("throws on GraphQL transport errors", async () => {
    const { client } = fakeGraphQL(() => ({
      errors: { message: "Unauthenticated" },
    }));

    await expect(
      createProductViaGraphQL(client, { title: "X" })
    ).rejects.toThrow(/Unauthenticated/);
  });
});

// ── beforeEach to keep vitest happy (no shared state but good hygiene) ───────
beforeEach(() => {
  vi.restoreAllMocks();
});
