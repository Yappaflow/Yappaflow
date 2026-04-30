/**
 * Sample SiteProject for local dev. Mirrors what
 * `assembleSiteProject()` in apps/yappaflow-mcp would produce for the
 * fixture brief (FIXTURE_BRIEF), but inlined here so the builder can boot
 * without talking to the MCP.
 *
 * When Phase 10.5 wires the studio → builder handoff, the real entry point
 * becomes `/p/<projectId>` fetching from the server cache; this fixture
 * stays around for standalone testing at `/p/sample`.
 */

import {
  FIXTURE_BRIEF,
  SITE_PROJECT_SCHEMA_VERSION,
  type MergedDna,
  type Section,
  type SectionType,
  type SiteProject,
} from "@yappaflow/types";
import { SECTION_DATA } from "@yappaflow/sections/data";

/**
 * Minimal MergedDna — enough shape to satisfy SiteProject.dna's passthrough
 * schema. The builder canvas doesn't (yet) render based on DNA tokens; Phase
 * 8b resolves DNA-bound colors/spacing when it wires the skeleton styling.
 */
const SAMPLE_DNA: MergedDna = {
  schemaVersion: 1,
  meta: {
    url: "https://sample.yappaflow",
    finalUrl: "https://sample.yappaflow",
    title: "Sample",
    description: null,
    capturedAt: new Date().toISOString(),
    viewport: { width: 1440, height: 900 },
    timings: { navigateMs: 0, scrollMs: 0, analyzeMs: 0, totalMs: 0 },
    warnings: [],
  },
  typography: { styles: [], families: [], scalePx: [14, 16, 18, 24, 32, 48, 64] },
  colors: {
    palette: [
      { value: "#0b0b0b", count: 100, roles: ["foreground"] },
      { value: "#f6f5f2", count: 95, roles: ["background"] },
      { value: "#d4af37", count: 20, roles: ["fill"] },
    ],
    customProperties: [],
    summary: {
      backgrounds: ["#f6f5f2", "#0b0b0b"],
      foregrounds: ["#0b0b0b", "#f6f5f2"],
      accents: ["#d4af37"],
    },
  },
  motion: {
    keyframes: [],
    transitions: [],
    runtimeAnimations: [],
    scrollHints: [],
  },
  grid: {
    containers: [],
    rhythm: { maxWidth: "1200px", padding: "24px", gap: "24px" },
  },
  stack: { libraries: [], frameworks: [] },
  assets: {
    fonts: [],
    images: [],
    videos: [],
    scripts: [],
    stylesheets: [],
    totalTransferKb: 0,
  },
  mergeMeta: {
    structureSource: {
      url: "sample://structure",
      finalUrl: "sample://structure",
      title: "sample",
    },
    typographySource: {
      url: "sample://typography",
      finalUrl: "sample://typography",
      title: "sample",
    },
    motionSource: {
      url: "sample://motion",
      finalUrl: "sample://motion",
      title: "sample",
    },
    paletteSource: {
      url: "sample://palette",
      finalUrl: "sample://palette",
      title: "sample",
    },
    reasoning: ["builder fixture — no real DNA merge performed"],
  },
};

function defaultSection<T extends SectionType>(
  id: string,
  type: T,
  extra?: { animation?: Section["animation"]; variant?: string },
): Section {
  const data = SECTION_DATA[type];
  return {
    id,
    type,
    variant: extra?.variant ?? data.defaultVariant,
    content: { ...(data.defaultContent as Record<string, unknown>) },
    style: {},
    ...(extra?.animation ? { animation: extra.animation } : {}),
  };
}

const SAMPLE_PRODUCT_CARDS = [
  {
    id: "p-001",
    handle: "classic-tee",
    title: "Classic tee",
    price: "$42",
    currency: "USD",
    image: { kind: "image", url: "/images/products/classic-tee.jpg", alt: "Classic tee" },
    href: "/products/classic-tee",
  },
  {
    id: "p-002",
    handle: "studio-cap",
    title: "Studio cap",
    price: "$28",
    currency: "USD",
    image: { kind: "image", url: "/images/products/studio-cap.jpg", alt: "Studio cap" },
    href: "/products/studio-cap",
  },
  {
    id: "p-003",
    handle: "canvas-tote",
    title: "Canvas tote",
    price: "$34",
    currency: "USD",
    image: { kind: "image", url: "/images/products/canvas-tote.jpg", alt: "Canvas tote" },
    href: "/products/canvas-tote",
  },
];

function productDetailContent(card: (typeof SAMPLE_PRODUCT_CARDS)[number]) {
  return {
    eyebrow: "Shop",
    title: card.title,
    price: card.price,
    currency: card.currency,
    description: "",
    images: [{ kind: "image", url: card.image.url, alt: card.image.alt }],
    variantGroups: [],
    specs: [],
    primaryCta: { label: "Add to cart", href: `/cart/add?id=${card.id}` },
    secondaryCta: { label: "Ask a question", href: "/contact" },
  };
}

function buildProductDetailPage(id: string, card: (typeof SAMPLE_PRODUCT_CARDS)[number]): SiteProject["pages"][number] {
  return {
    id,
    slug: `/products/${card.handle}`,
    title: card.title,
    seo: { description: `${card.title} — shop on our store.` },
    kind: "product",
    productHandle: card.handle,
    sections: [
      {
        id: `${id}_detail`,
        type: "product-detail",
        variant: "gallery-left",
        content: {
          ...(SECTION_DATA["product-detail"].defaultContent as Record<string, unknown>),
          ...productDetailContent(card),
        },
        style: {},
      },
      {
        id: `${id}_related`,
        type: "product-grid",
        variant: "card",
        content: {
          ...(SECTION_DATA["product-grid"].defaultContent as Record<string, unknown>),
          eyebrow: "Related",
          heading: "You might also like",
          columns: 3,
          products: SAMPLE_PRODUCT_CARDS.filter((p) => p.id !== card.id),
        },
        style: {},
      },
    ],
  };
}

export function buildSampleSiteProject(): SiteProject {
  return {
    schemaVersion: SITE_PROJECT_SCHEMA_VERSION,
    brief: FIXTURE_BRIEF,
    dna: SAMPLE_DNA,
    pages: [
      {
        id: "pg_home",
        slug: "/",
        title: "Home",
        seo: {
          description: "Sample site assembled for the builder.",
        },
        kind: "content",
        sections: [
          defaultSection("sec_hero", "hero", { animation: "slide-up" }),
          defaultSection("sec_fgrid", "feature-grid", {
            animation: "stagger-children",
          }),
          // Featured products strip — mirrors how Shopify / IKAS surface a
          // "Latest drops" block on the storefront home by default. The
          // `featured-grid` id is also the target the builder's
          // upsertHomeFeaturedGrid action looks for, so adding a product to
          // the library propagates here automatically.
          {
            id: "sec_home_featured",
            type: "product-grid",
            variant: "card",
            content: {
              ...(SECTION_DATA["product-grid"].defaultContent as Record<string, unknown>),
              eyebrow: "Shop",
              heading: "Featured products",
              subhead: "Hand-picked from the catalog.",
              columns: 3,
              products: SAMPLE_PRODUCT_CARDS,
              ctaAll: { label: "View all products", href: "/products" },
            },
            style: {},
            animation: "stagger-children",
          },
          defaultSection("sec_frow", "feature-row", { animation: "slide-left" }),
          defaultSection("sec_test", "testimonial", { animation: "fade-in" }),
          defaultSection("sec_cta", "cta-band", { animation: "scale-in" }),
        ],
      },
      // /products catalog page — lists all products with links to detail pages
      {
        id: "pg_products",
        slug: "/products",
        title: "Products",
        seo: { description: "Browse our full product catalog." },
        kind: "product-index",
        sections: [
          {
            id: "sec_products_hero",
            type: "hero",
            variant: "centered",
            content: {
              ...(SECTION_DATA["hero"].defaultContent as Record<string, unknown>),
              eyebrow: "Shop",
              heading: "All products.",
              subhead: "Browse the full collection.",
            },
            style: {},
          },
          {
            id: "sec_products_grid",
            type: "product-grid",
            variant: "card",
            content: {
              ...(SECTION_DATA["product-grid"].defaultContent as Record<string, unknown>),
              eyebrow: "",
              heading: "",
              columns: 4,
              products: SAMPLE_PRODUCT_CARDS,
            },
            style: {},
          },
        ],
      },
      // Individual product detail pages — one per sample product
      buildProductDetailPage("pg_prod_001", SAMPLE_PRODUCT_CARDS[0]!),
      buildProductDetailPage("pg_prod_002", SAMPLE_PRODUCT_CARDS[1]!),
      buildProductDetailPage("pg_prod_003", SAMPLE_PRODUCT_CARDS[2]!),
    ],
    globals: {
      header: defaultSection("sec_header", "header"),
      footer: defaultSection("sec_footer", "footer"),
      announcementBar: defaultSection("sec_annbar", "announcement-bar"),
    },
  };
}

/** Stable id of the home page's featured-products grid. */
export const HOME_FEATURED_GRID_ID = "sec_home_featured";
