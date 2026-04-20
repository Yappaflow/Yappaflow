import { describe, it, expect } from "vitest";
import {
  validateShopifyBundle,
  LiquidBundleValidationError,
} from "../services/liquid-validator.service";

function file(filePath: string, content: string) {
  const ext  = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  const lang = ext === ".liquid" ? "liquid" : ext === ".json" ? "json" : "text";
  return { filePath, content, language: lang };
}

describe("validateShopifyBundle", () => {
  it("accepts a minimal well-formed Liquid + JSON theme bundle", () => {
    const files = [
      file(
        "layout/theme.liquid",
        `<!DOCTYPE html>\n<html>\n<head>{{ content_for_header }}</head>\n<body>\n  {% section 'header' %}\n  {{ content_for_layout }}\n</body>\n</html>\n`
      ),
      file(
        "templates/index.json",
        JSON.stringify({ sections: { main: { type: "main-index" } }, order: ["main"] }, null, 2)
      ),
      file(
        "sections/header.liquid",
        `<header>\n  {% if section.settings.logo %}\n    <img src="{{ section.settings.logo | img_url: 'master' }}" />\n  {% endif %}\n  <h1>{{ shop.name }}</h1>\n</header>\n\n{% schema %}\n{ "name": "Header", "settings": [] }\n{% endschema %}\n`
      ),
      file("assets/theme.css", `body { color: #111; }\n`),
    ];
    expect(() => validateShopifyBundle(files)).not.toThrow();
  });

  it("rejects a bundle with an unclosed {% if %}", () => {
    const files = [
      file(
        "sections/broken.liquid",
        `{% if section.settings.show %}\n  <h1>{{ shop.name }}</h1>\n`
      ),
    ];

    let caught: unknown;
    try {
      validateShopifyBundle(files);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(LiquidBundleValidationError);
    const e = caught as LiquidBundleValidationError;
    expect(e.issues).toHaveLength(1);
    expect(e.issues[0].filePath).toBe("sections/broken.liquid");
    expect(e.issues[0].kind).toBe("liquid-parse");
  });

  it("rejects a bundle with malformed JSON in a template", () => {
    const files = [
      file(
        "templates/index.json",
        `{ "sections": { "main": { "type": "main-index" } } `  // missing closing brace
      ),
    ];

    let caught: unknown;
    try {
      validateShopifyBundle(files);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(LiquidBundleValidationError);
    const e = caught as LiquidBundleValidationError;
    expect(e.issues[0].filePath).toBe("templates/index.json");
    expect(e.issues[0].kind).toBe("json-parse");
  });

  it("ignores non-Liquid/JSON files (CSS, JS, plain text)", () => {
    const files = [
      file("assets/theme.css", `this is { not } valid css but we don't care`),
      file("assets/theme.js",  `function( {{{ `),
      file("README.txt",       `{% this would be invalid liquid, but .txt is ignored %}`),
    ];
    expect(() => validateShopifyBundle(files)).not.toThrow();
  });

  it("reports multiple issues across multiple files", () => {
    const files = [
      file("sections/a.liquid",  `{% if x %}\n`),
      file("templates/b.json",   `not-json`),
      file("sections/c.liquid",  `<div>{{ shop.name }}</div>\n`), // this one is OK
      file("templates/d.json",   `{"ok": true}`),                 // this one is OK
      file("sections/e.liquid",  `{{ unclosed `),
    ];

    let caught: unknown;
    try {
      validateShopifyBundle(files);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(LiquidBundleValidationError);
    const e = caught as LiquidBundleValidationError;
    const paths = e.issues.map((i) => i.filePath).sort();
    expect(paths).toEqual([
      "sections/a.liquid",
      "sections/e.liquid",
      "templates/b.json",
    ]);
  });
});
