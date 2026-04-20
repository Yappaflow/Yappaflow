import { describe, it, expect } from "vitest";
import { parseArtifacts } from "../services/static-site-generator.service";
import { getGenerateStaticSitePrompt } from "../ai/prompts/generate-static-site.prompt";

describe("parseArtifacts", () => {
  it("parses multiple filepath blocks in order", () => {
    const raw = [
      "```filepath:index.html",
      "<!DOCTYPE html><title>x</title>",
      "```",
      "",
      "```filepath:assets/style.css",
      "body { color: red; }",
      "```",
    ].join("\n");

    const files = parseArtifacts(raw);
    expect(files).toHaveLength(2);
    expect(files[0].filePath).toBe("index.html");
    expect(files[0].language).toBe("html");
    expect(files[0].content).toContain("<!DOCTYPE html>");
    expect(files[1].filePath).toBe("assets/style.css");
    expect(files[1].language).toBe("css");
  });

  it("rejects path-traversal and absolute paths", () => {
    const raw = [
      "```filepath:../escape.html",
      "nope",
      "```",
      "```filepath:/etc/passwd",
      "nope",
      "```",
      "```filepath:ok.html",
      "ok",
      "```",
    ].join("\n");
    const files = parseArtifacts(raw);
    expect(files).toHaveLength(1);
    expect(files[0].filePath).toBe("ok.html");
  });
});

describe("getGenerateStaticSitePrompt", () => {
  it("includes the dual-theme mandate in every invocation", () => {
    const prompt = getGenerateStaticSitePrompt();
    expect(prompt).toMatch(/light/i);
    expect(prompt).toMatch(/dark/i);
    expect(prompt).toContain("data-theme");
    expect(prompt).toContain("localStorage");
    expect(prompt).toContain("prefers-color-scheme");
  });

  it("tells the model to skip #shop when no products are passed", () => {
    const prompt = getGenerateStaticSitePrompt({ products: [] });
    expect(prompt).toMatch(/do NOT render a Shop section/);
  });

  it("asks for a #shop section with variants when products are present", () => {
    const prompt = getGenerateStaticSitePrompt({
      products: [
        {
          name:        "Linen Shirt",
          price:       89,
          variantKind: "size",
          variants:    [{ label: "S" }, { label: "M" }, { label: "L" }, { label: "XL" }],
        },
      ],
    });
    expect(prompt).toContain('id="shop"');
    expect(prompt).toMatch(/variants/i);
    expect(prompt).toMatch(/add to cart/i);
    expect(prompt).toMatch(/yappaflow_cart/);
  });
});
