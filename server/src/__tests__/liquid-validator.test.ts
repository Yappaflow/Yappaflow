import { describe, it, expect } from "vitest";
import {
  validateShopifyBundle,
  LiquidBundleValidationError,
  type ParsedFile,
} from "../services/liquid-validator.service";

function file(filePath: string, content: string): ParsedFile {
  const ext  = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  const lang = ext === ".liquid" ? "liquid" : ext === ".json" ? "json" : "text";
  return { filePath, content, language: lang };
}

/**
 * A minimum-viable Shopify theme bundle that passes every validator
 * rule (syntax + content-depth + required files + required tokens).
 * Individual tests extend or replace specific files to exercise one
 * failure mode at a time.
 *
 * The numbers here are deliberate: `sections/header.liquid` body is
 * padded to clear the 300-byte floor, `layout/theme.liquid` includes
 * both `{{ content_for_header }}` and `{{ content_for_layout }}`, and
 * `templates/index.json` has at least one section entry.
 */
function validBaseline(): ParsedFile[] {
  return [
    file(
      "layout/theme.liquid",
      `<!DOCTYPE html>
<html lang="{{ request.locale.iso_code }}" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="{{ settings.color_bg | default: '#ffffff' }}">
  <link rel="canonical" href="{{ canonical_url }}">
  <link rel="preconnect" href="https://cdn.shopify.com" crossorigin>
  <title>
    {{ page_title }}
    {%- if current_tags %} &ndash; {{ 'general.meta.tags' | t: tags: current_tags | join: ', ' }}{%- endif -%}
    {%- if current_page != 1 %} &ndash; {{ 'general.meta.page' | t: page: current_page }}{%- endif -%}
    {%- unless page_title contains shop.name %} &ndash; {{ shop.name }}{%- endunless -%}
  </title>
  {% if page_description %}<meta name="description" content="{{ page_description | escape }}">{% endif %}
  {{ content_for_header }}
  {{ 'theme.css' | asset_url | stylesheet_tag }}
</head>
<body class="template-{{ template | replace: '.', '-' | handleize }}">
  <a class="skip-to-content" href="#MainContent">{{ 'accessibility.skip_to_text' | t }}</a>
  {% section 'header' %}
  <main id="MainContent" class="content-for-layout" role="main" tabindex="-1">
    {{ content_for_layout }}
  </main>
  {% section 'footer' %}
  <script src="{{ 'theme.js' | asset_url }}" defer></script>
</body>
</html>
`
    ),
    file(
      "config/settings_schema.json",
      JSON.stringify(
        [
          { name: "theme_info", theme_name: "Yappaflow", theme_version: "1.0.0" },
          {
            name: "Colors",
            settings: [
              { id: "color_bg",   type: "color", label: "Background",    default: "#ffffff" },
              { id: "color_text", type: "color", label: "Body text",     default: "#111111" },
            ],
          },
        ],
        null,
        2
      )
    ),
    file(
      "templates/index.json",
      JSON.stringify(
        { sections: { main: { type: "main-index" } }, order: ["main"] },
        null,
        2
      )
    ),
    file(
      "sections/header.liquid",
      `<header class="site-header">
  {% if section.settings.logo != blank %}
    <a href="{{ routes.root_url }}" class="site-header__logo">
      <img src="{{ section.settings.logo | img_url: '200x' }}" alt="{{ shop.name }}" />
    </a>
  {% else %}
    <a href="{{ routes.root_url }}" class="site-header__logo">{{ shop.name }}</a>
  {% endif %}
  <nav class="site-header__nav">
    {% for link in section.settings.menu.links %}
      <a href="{{ link.url }}">{{ link.title }}</a>
    {% endfor %}
  </nav>
</header>

{% schema %}
{
  "name": "Header",
  "settings": [
    { "id": "logo", "type": "image_picker", "label": "Logo" },
    { "id": "menu", "type": "link_list",    "label": "Menu", "default": "main-menu" }
  ]
}
{% endschema %}
`
    ),
    file(
      "sections/footer.liquid",
      `<footer class="site-footer">
  <div class="site-footer__row">
    <p>&copy; {{ 'now' | date: '%Y' }} {{ shop.name }}. {{ 'general.footer.all_rights_reserved' | t }}</p>
  </div>
  <nav class="site-footer__nav">
    {% for link in section.settings.menu.links %}
      <a href="{{ link.url }}">{{ link.title }}</a>
    {% endfor %}
  </nav>
</footer>

{% schema %}
{
  "name": "Footer",
  "settings": [
    { "id": "menu", "type": "link_list", "label": "Menu", "default": "footer" }
  ]
}
{% endschema %}
`
    ),
  ];
}

/** Replace a file in a bundle in place, or add it if absent. */
function withFile(files: ParsedFile[], f: ParsedFile): ParsedFile[] {
  const next = files.filter((x) => x.filePath !== f.filePath);
  next.push(f);
  return next;
}

describe("validateShopifyBundle — syntax checks", () => {
  it("accepts a well-formed minimum bundle", () => {
    expect(() => validateShopifyBundle(validBaseline())).not.toThrow();
  });

  it("rejects a bundle with an unclosed {% if %}", () => {
    // Unclosed-if is padded past the 300-byte floor so the only issue
    // surfaced is the parse failure, not a stray content-empty error.
    const broken = file(
      "sections/broken.liquid",
      `{% if section.settings.show_banner %}
  <div class="banner">
    <h1>{{ shop.name }}</h1>
    <p>{{ section.settings.message | default: 'Welcome to our store' }}</p>
    <a class="btn" href="{{ section.settings.cta_link }}">{{ section.settings.cta_label }}</a>
  </div>
`
    );

    const caught = assertThrows(() =>
      validateShopifyBundle(withFile(validBaseline(), broken))
    );
    const issue = caught.issues.find((i) => i.filePath === "sections/broken.liquid");
    expect(issue).toBeDefined();
    expect(issue!.kind).toBe("liquid-parse");
  });

  it("rejects a bundle with malformed JSON in a template", () => {
    const broken = file(
      "templates/index.json",
      `{ "sections": { "main": { "type": "main-index" } } ` // missing closing brace
    );

    const caught = assertThrows(() =>
      validateShopifyBundle(withFile(validBaseline(), broken))
    );
    const issue = caught.issues.find((i) => i.filePath === "templates/index.json");
    expect(issue).toBeDefined();
    expect(issue!.kind).toBe("json-parse");
  });

  it("ignores non-Liquid/JSON files (CSS, JS, plain text)", () => {
    const files = [
      ...validBaseline(),
      file("assets/theme.css", `this is { not } valid css but we don't care`),
      file("assets/theme.js",  `function( {{{ `),
      file("README.txt",       `{% this would be invalid liquid, but .txt is ignored %}`),
    ];
    expect(() => validateShopifyBundle(files)).not.toThrow();
  });

  it("reports multiple issues across multiple files", () => {
    // Swap in three separate failures on top of a valid baseline —
    // verify every one gets reported rather than short-circuiting on
    // the first.
    const files = withFile(
      withFile(
        withFile(validBaseline(), file("sections/a.liquid", `{% if x %}\n<div>some body content padded out past the 200-byte floor</div>\n<p>more text here so this isn't flagged as a stub</p>\n<p>even more padding to clear the minimum</p>`)),
        file("templates/index.json", `not-json`)
      ),
      file("sections/e.liquid", `{{ unclosed and padded out so the issue is parse-only, not empty. Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`)
    );

    const caught = assertThrows(() => validateShopifyBundle(files));
    const paths = caught.issues.map((i) => i.filePath).sort();
    expect(paths).toContain("sections/a.liquid");
    expect(paths).toContain("sections/e.liquid");
    expect(paths).toContain("templates/index.json");
  });
});

/**
 * Regression suite for the "hollow-stub" failure mode we hit in prod
 * on 2026-04-21: model emitted 18 correctly-shaped but tiny files
 * (avg 355 bytes each, sections with no real body, templates/*.json
 * with empty `sections: {}`). Syntax-only validation passed, Shopify
 * accepted the upload, but every rendered page was blank.
 */
describe("validateShopifyBundle — content-depth rules", () => {
  it("rejects layout/theme.liquid that's below the 500-byte floor", () => {
    // A "looks real" but tiny layout — 57 bytes of meaningful content.
    // Still syntactically valid Liquid + includes both required tokens,
    // so nothing else trips; only the content-empty rule should fire.
    const stub = file(
      "layout/theme.liquid",
      `<html><body>{{ content_for_header }}{{ content_for_layout }}</body></html>`
    );
    const caught = assertThrows(() =>
      validateShopifyBundle(withFile(validBaseline(), stub))
    );
    const issue = caught.issues.find(
      (i) => i.filePath === "layout/theme.liquid" && i.kind === "content-empty"
    );
    expect(issue).toBeDefined();
    expect(issue!.message).toContain("stub");
  });

  it("rejects sections/header.liquid that's below the 300-byte floor", () => {
    const stub = file(
      "sections/header.liquid",
      `<header>{{ shop.name }}</header>\n{% schema %}\n{"name":"Header"}\n{% endschema %}\n`
    );
    const caught = assertThrows(() =>
      validateShopifyBundle(withFile(validBaseline(), stub))
    );
    expect(
      caught.issues.some(
        (i) => i.filePath === "sections/header.liquid" && i.kind === "content-empty"
      )
    ).toBe(true);
  });

  it("rejects arbitrary sections/*.liquid below the 200-byte floor", () => {
    // Generic section (not header/footer) still has a 200-byte floor.
    const stub = file("sections/hero.liquid", `<div>{{ shop.name }}</div>\n`);
    const caught = assertThrows(() =>
      validateShopifyBundle(withFile(validBaseline(), stub))
    );
    expect(
      caught.issues.some(
        (i) => i.filePath === "sections/hero.liquid" && i.kind === "content-empty"
      )
    ).toBe(true);
  });

  it("strips comments before counting — padding with comments doesn't satisfy the floor", () => {
    // 800+ bytes of comments wrapping 30 bytes of body — should be
    // treated as a stub. Catches the model trying to "just make it
    // long" via a huge disclaimer block.
    const padded =
      `{% comment %}${"This is a very long comment meant to pad the byte count. ".repeat(15)}{% endcomment %}\n` +
      `<div>stub</div>\n`;
    const stub = file("sections/stub.liquid", padded);
    const caught = assertThrows(() =>
      validateShopifyBundle(withFile(validBaseline(), stub))
    );
    expect(
      caught.issues.some(
        (i) => i.filePath === "sections/stub.liquid" && i.kind === "content-empty"
      )
    ).toBe(true);
  });

  it("rejects templates/*.json with an empty sections object", () => {
    // The exact prod failure shape: JSON parses fine, but sections:{}
    // means the customizer renders a blank page with the "This page
    // doesn't have any sections" banner.
    const stub = file(
      "templates/index.json",
      JSON.stringify({ sections: {}, order: [] })
    );
    const caught = assertThrows(() =>
      validateShopifyBundle(withFile(validBaseline(), stub))
    );
    const issue = caught.issues.find(
      (i) => i.filePath === "templates/index.json" && i.kind === "content-empty"
    );
    expect(issue).toBeDefined();
    expect(issue!.message).toContain("no sections");
  });

  it("rejects templates/*.json missing the sections key entirely", () => {
    const stub = file("templates/index.json", JSON.stringify({ order: [] }));
    const caught = assertThrows(() =>
      validateShopifyBundle(withFile(validBaseline(), stub))
    );
    expect(
      caught.issues.some(
        (i) => i.filePath === "templates/index.json" && i.kind === "content-empty"
      )
    ).toBe(true);
  });
});

describe("validateShopifyBundle — required files + tokens", () => {
  it("rejects a bundle missing layout/theme.liquid", () => {
    const files = validBaseline().filter((f) => f.filePath !== "layout/theme.liquid");
    const caught = assertThrows(() => validateShopifyBundle(files));
    expect(
      caught.issues.some(
        (i) => i.filePath === "layout/theme.liquid" && i.kind === "missing-required"
      )
    ).toBe(true);
  });

  it("rejects a bundle missing config/settings_schema.json", () => {
    const files = validBaseline().filter(
      (f) => f.filePath !== "config/settings_schema.json"
    );
    const caught = assertThrows(() => validateShopifyBundle(files));
    expect(
      caught.issues.some(
        (i) =>
          i.filePath === "config/settings_schema.json" && i.kind === "missing-required"
      )
    ).toBe(true);
  });

  it("rejects layout/theme.liquid missing {{ content_for_layout }}", () => {
    // Well above the byte floor, parses fine, but no content_for_layout
    // → rendered pages have no body. This is exactly the rule that would
    // have caught the 2026-04-21 prod failure at validation time.
    const noLayout = file(
      "layout/theme.liquid",
      `<!DOCTYPE html>
<html>
<head>
  <title>{{ page_title }}</title>
  {{ content_for_header }}
  {{ 'theme.css' | asset_url | stylesheet_tag }}
</head>
<body>
  {% section 'header' %}
  <main>
    <!-- whoops, no content_for_layout — nothing ever renders here -->
  </main>
  {% section 'footer' %}
</body>
</html>
`
    );
    const caught = assertThrows(() =>
      validateShopifyBundle(withFile(validBaseline(), noLayout))
    );
    const issue = caught.issues.find(
      (i) => i.filePath === "layout/theme.liquid" && i.kind === "missing-token"
    );
    expect(issue).toBeDefined();
    expect(issue!.message).toContain("content_for_layout");
  });

  it("rejects layout/theme.liquid missing {{ content_for_header }}", () => {
    const noHeader = file(
      "layout/theme.liquid",
      `<!DOCTYPE html>
<html>
<head>
  <title>{{ page_title }}</title>
  {{ 'theme.css' | asset_url | stylesheet_tag }}
</head>
<body>
  {% section 'header' %}
  <main>{{ content_for_layout }}</main>
  {% section 'footer' %}
</body>
</html>
`
    );
    const caught = assertThrows(() =>
      validateShopifyBundle(withFile(validBaseline(), noHeader))
    );
    expect(
      caught.issues.some(
        (i) =>
          i.filePath === "layout/theme.liquid" &&
          i.kind === "missing-token" &&
          i.message.includes("content_for_header")
      )
    ).toBe(true);
  });
});

// Local test helper — `expect(fn).toThrow()` doesn't let us inspect
// issue kinds/paths on the thrown error. Do it by hand.
function assertThrows(fn: () => void): LiquidBundleValidationError {
  try {
    fn();
    throw new Error("validateShopifyBundle should have thrown");
  } catch (err) {
    expect(err).toBeInstanceOf(LiquidBundleValidationError);
    return err as LiquidBundleValidationError;
  }
}
