import { describe, it, expect } from "vitest";
import {
  SITE_PROJECT_SCHEMA_VERSION,
  SiteProjectSchema,
  SectionSchema,
  PageSchema,
  SECTION_TYPES,
  inferPageKind,
  productHandleFromSlug,
  type SectionType,
} from "./index.js";
import { FIXTURE_BRIEF } from "./brief.js";

function makeMinimalSection(type: SectionType, id: string) {
  return SectionSchema.parse({
    id,
    type,
    variant: "default",
    content: {},
    style: {},
  });
}

describe("SectionSchema", () => {
  it("accepts a minimal section with defaults applied", () => {
    const parsed = SectionSchema.parse({
      id: "s1",
      type: "hero",
      content: {},
    });
    expect(parsed.id).toBe("s1");
    expect(parsed.type).toBe("hero");
    // style defaults to an empty object
    expect(parsed.style).toEqual({});
  });

  it("rejects an unknown section type", () => {
    const parsed = SectionSchema.safeParse({
      id: "s1",
      type: "totally-made-up",
      content: {},
    });
    expect(parsed.success).toBe(false);
  });
});

describe("SECTION_TYPES", () => {
  it("starts with the original 10 MVP types in their canonical order", () => {
    // The first 10 are load-bearing for adapters keyed on these values.
    // Newer Phase 8b types append to the list — order MUST stay stable.
    expect(SECTION_TYPES.slice(0, 10)).toEqual([
      "header",
      "footer",
      "announcement-bar",
      "hero",
      "feature-grid",
      "feature-row",
      "product-grid",
      "cta-band",
      "testimonial",
      "rich-text",
    ]);
  });
});

describe("PageSchema", () => {
  it("accepts a home page with at least one section", () => {
    const page = PageSchema.parse({
      id: "p1",
      slug: "/",
      title: "Home",
      sections: [makeMinimalSection("hero", "s1")],
    });
    expect(page.seo.description).toBe("");
    expect(page.sections).toHaveLength(1);
    // Default kind is "content" when omitted — covers v1 → v2 schema bump
    // for fixtures and tests that haven't been updated yet.
    expect(page.kind).toBe("content");
  });

  it("accepts a product page with a productHandle", () => {
    const page = PageSchema.parse({
      id: "p2",
      slug: "/products/classic-tee",
      title: "Classic tee",
      kind: "product",
      productHandle: "classic-tee",
      sections: [makeMinimalSection("hero", "s1")],
    });
    expect(page.kind).toBe("product");
    expect(page.productHandle).toBe("classic-tee");
  });
});

describe("inferPageKind", () => {
  it("maps /products to the index", () => {
    expect(inferPageKind("/products")).toBe("product-index");
  });
  it("maps /products/<handle> to product", () => {
    expect(inferPageKind("/products/classic-tee")).toBe("product");
  });
  it("treats /products/ alone (no handle) as content", () => {
    // Trailing-slash-only ambiguity — never a valid product slug.
    expect(inferPageKind("/products/")).toBe("content");
  });
  it("falls through to content for everything else", () => {
    expect(inferPageKind("/")).toBe("content");
    expect(inferPageKind("/about")).toBe("content");
    expect(inferPageKind("/blog/2024")).toBe("content");
  });
});

describe("productHandleFromSlug", () => {
  it("extracts the handle for a product slug", () => {
    expect(productHandleFromSlug("/products/classic-tee")).toBe("classic-tee");
  });
  it("returns null for non-product slugs", () => {
    expect(productHandleFromSlug("/")).toBeNull();
    expect(productHandleFromSlug("/about")).toBeNull();
    expect(productHandleFromSlug("/products")).toBeNull();
  });
});

describe("SiteProjectSchema", () => {
  const dna = {
    schemaVersion: 1 as const,
    // rest of the DNA is passthrough — the schema only requires schemaVersion
    meta: { url: "x", finalUrl: "x", title: null, description: null },
  };

  it("validates a minimal, well-formed SiteProject", () => {
    const project = SiteProjectSchema.parse({
      schemaVersion: SITE_PROJECT_SCHEMA_VERSION,
      brief: FIXTURE_BRIEF,
      dna,
      pages: [
        {
          id: "home",
          slug: "/",
          title: "Home",
          sections: [makeMinimalSection("hero", "s1")],
        },
      ],
      globals: {
        header: makeMinimalSection("header", "h1"),
        footer: makeMinimalSection("footer", "f1"),
      },
    });
    expect(project.schemaVersion).toBe(SITE_PROJECT_SCHEMA_VERSION);
    expect(project.pages[0]?.slug).toBe("/");
    expect(project.globals.announcementBar).toBeUndefined();
  });

  it("rejects a SiteProject with zero pages", () => {
    const parsed = SiteProjectSchema.safeParse({
      schemaVersion: SITE_PROJECT_SCHEMA_VERSION,
      brief: FIXTURE_BRIEF,
      dna,
      pages: [],
      globals: {
        header: makeMinimalSection("header", "h1"),
        footer: makeMinimalSection("footer", "f1"),
      },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a SiteProject missing required globals", () => {
    const parsed = SiteProjectSchema.safeParse({
      schemaVersion: SITE_PROJECT_SCHEMA_VERSION,
      brief: FIXTURE_BRIEF,
      dna,
      pages: [
        {
          id: "home",
          slug: "/",
          title: "Home",
          sections: [makeMinimalSection("hero", "s1")],
        },
      ],
      globals: {
        header: makeMinimalSection("header", "h1"),
        // no footer
      },
    });
    expect(parsed.success).toBe(false);
  });
});
