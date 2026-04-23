import { describe, it, expect } from "vitest";
import {
  SITE_PROJECT_SCHEMA_VERSION,
  SiteProjectSchema,
  SectionSchema,
  PageSchema,
  SECTION_TYPES,
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
  it("contains exactly the 10 MVP section types", () => {
    expect(SECTION_TYPES).toEqual([
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
    expect(project.schemaVersion).toBe(1);
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
