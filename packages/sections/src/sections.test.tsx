import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SectionSchema, type SectionType } from "@yappaflow/types";
import { SECTIONS, listSections } from "./index.js";
import { SECTION_DATA } from "./data.js";

describe("SECTIONS registry", () => {
  it("covers every SectionType exactly once", () => {
    const expectedTypes: SectionType[] = [
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
      // Phase 8b — Exhibit-backed
      "faq",
      "pricing",
      "stats-band",
      "timeline",
      "logo-cloud",
      "team",
      "newsletter",
      "contact",
      "product-detail",
    ];
    expect(Object.keys(SECTIONS).sort()).toEqual([...expectedTypes].sort());
    expect(listSections()).toHaveLength(expectedTypes.length);
  });

  it("mirrors SECTION_DATA keys", () => {
    expect(Object.keys(SECTIONS).sort()).toEqual(
      Object.keys(SECTION_DATA).sort(),
    );
  });
});

describe.each(Object.entries(SECTIONS))("section %s", (type, def) => {
  it("default content passes its own contentSchema", () => {
    const parsed = def.contentSchema.safeParse(def.defaultContent);
    expect(parsed.success, (!parsed.success && parsed.error.message) || "").toBe(
      true,
    );
  });

  it("default variant is one of the declared variants", () => {
    expect(def.variants).toContain(def.defaultVariant);
  });

  it("renders without throwing when handed its default content", () => {
    const section = SectionSchema.parse({
      id: `test_${type}`,
      type: type as SectionType,
      variant: def.defaultVariant,
      content: def.defaultContent,
      style: {},
    });
    const markup = renderToStaticMarkup(<def.Component section={section} />);
    expect(markup).toContain(`data-yf-section-type="${type}"`);
    expect(markup).toContain(`data-yf-section-variant="${def.defaultVariant}"`);
  });

  it("renders a recoverable warning for obviously broken content", () => {
    const section = SectionSchema.parse({
      id: `test_bad_${type}`,
      type: type as SectionType,
      content: { __nonsense__: true },
      style: {},
    });
    // Should not throw; should still produce section chrome.
    const markup = renderToStaticMarkup(<def.Component section={section} />);
    expect(markup).toContain(`data-yf-section-type="${type}"`);
  });

  it("serialises animation preset to data-yf-anim when set", () => {
    const section = SectionSchema.parse({
      id: `test_anim_${type}`,
      type: type as SectionType,
      content: def.defaultContent,
      animation: "fade-in",
      style: {},
    });
    const markup = renderToStaticMarkup(<def.Component section={section} />);
    expect(markup).toContain(`data-yf-anim="fade-in"`);
  });
});
