import { describe, it, expect } from "vitest";
import AdmZip from "adm-zip";
import {
  buildInnerShopifyThemeZip,
  repackShopifyBundle,
  type ZipFile,
} from "../services/zip-export.service";

describe("buildInnerShopifyThemeZip", () => {
  it("places theme files at the ZIP root (no wrapping folder)", () => {
    const files: ZipFile[] = [
      { filePath: "theme/layout/theme.liquid",     content: "<html></html>" },
      { filePath: "theme/templates/index.json",    content: "{}" },
      { filePath: "theme/sections/header.liquid",  content: "<header />" },
      { filePath: "theme/assets/theme.css",        content: "body{}" },
    ];

    const buf = buildInnerShopifyThemeZip(files);
    const zip = new AdmZip(buf);
    const keys = zip.getEntries().map((e) => e.entryName).sort();

    // Everything is at root — Shopify's "Upload zip file" expects this exactly.
    expect(keys).toEqual([
      "assets/theme.css",
      "layout/theme.liquid",
      "sections/header.liquid",
      "templates/index.json",
    ]);

    // Content round-trips cleanly.
    const layout = zip.readAsText("layout/theme.liquid");
    expect(layout).toBe("<html></html>");
  });

  it("passes through paths that don't already carry the theme/ prefix", () => {
    const buf = buildInnerShopifyThemeZip([
      { filePath: "layout/theme.liquid", content: "x" },
    ]);
    const zip = new AdmZip(buf);
    expect(zip.getEntries().map((e) => e.entryName)).toEqual([
      "layout/theme.liquid",
    ]);
  });
});

describe("repackShopifyBundle", () => {
  const files: ZipFile[] = [
    { filePath: "theme/layout/theme.liquid",    content: "<html></html>" },
    { filePath: "theme/templates/index.json",   content: "{}" },
    { filePath: "theme/sections/header.liquid", content: "<header />" },
    { filePath: "README.txt",                   content: "Upload shopify-theme.zip to Shopify." },
    { filePath: "products.csv",                 content: "Handle,Title\nfoo,Foo\n" },
  ];

  it("produces an outer ZIP with shopify-theme.zip + README + products.csv at root", () => {
    const buf = repackShopifyBundle(files);
    const outer = new AdmZip(buf);

    const topLevel = outer.getEntries().map((e) => e.entryName).sort();
    expect(topLevel).toEqual([
      "README.txt",
      "products.csv",
      "shopify-theme.zip",
    ]);
  });

  it("the nested shopify-theme.zip unpacks directly (no theme/ wrapper)", () => {
    const outer = new AdmZip(repackShopifyBundle(files));
    const innerBuf = outer.getEntry("shopify-theme.zip")!.getData();
    const inner = new AdmZip(innerBuf);
    const innerKeys = inner.getEntries().map((e) => e.entryName).sort();
    expect(innerKeys).toEqual([
      "layout/theme.liquid",
      "sections/header.liquid",
      "templates/index.json",
    ]);
  });

  it("preserves non-theme extras verbatim", () => {
    const outer = new AdmZip(repackShopifyBundle(files));
    const readme = outer.readAsText("README.txt");
    const csv    = outer.readAsText("products.csv");
    expect(readme).toContain("shopify-theme.zip");
    expect(csv).toMatch(/^Handle,Title/);
  });

  it("throws when there are no theme files to pack", () => {
    expect(() =>
      repackShopifyBundle([
        { filePath: "README.txt",   content: "x" },
        { filePath: "products.csv", content: "Handle" },
      ])
    ).toThrow(/no theme\/\* files/);
  });
});
