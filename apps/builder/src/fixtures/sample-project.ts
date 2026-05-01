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
  type Product,
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

/**
 * Sample product library — the canonical catalog for the fixture site. v3
 * SiteProjects keep products here; product-grid sections reference items by
 * id (mode:"library") and product-detail sections reference by productId.
 *
 * Ids match `apps/builder/src/lib/products-store.ts` so the localStorage
 * legacy library and the in-SiteProject library refer to the same products.
 * That equivalence lets the v2→v3 migration dedupe by id without surprises.
 */
const SAMPLE_PRODUCT_LIBRARY: Product[] = [
  {
    id: "p-001",
    handle: "classic-tee",
    title: "Classic tee",
    price: "$42",
    currency: "USD",
    description: "",
    images: [{ kind: "image", url: "/images/products/classic-tee.jpg", alt: "Classic tee" }],
    variantGroups: [],
    specs: [],
    tags: ["apparel"],
  },
  {
    id: "p-002",
    handle: "studio-cap",
    title: "Studio cap",
    price: "$28",
    currency: "USD",
    description: "",
    images: [{ kind: "image", url: "/images/products/studio-cap.jpg", alt: "Studio cap" }],
    variantGroups: [],
    specs: [],
    tags: ["apparel", "headwear"],
  },
  {
    id: "p-003",
    handle: "canvas-tote",
    title: "Canvas tote",
    price: "$34",
    currency: "USD",
    description: "",
    images: [{ kind: "image", url: "/images/products/canvas-tote.jpg", alt: "Canvas tote" }],
    variantGroups: [],
    specs: [],
    tags: ["accessory"],
  },
];

/**
 * Legacy ProductCard projection of the library — kept around because the
 * fixture's manual-mode fallback sections (related-products grid on detail
 * pages) still embed them. New library-bound grids reference the library by
 * id and rely on the runtime hydration path.
 */
const SAMPLE_PRODUCT_CARDS = SAMPLE_PRODUCT_LIBRARY.map((p) => ({
  id: p.id,
  handle: p.handle,
  title: p.title,
  price: p.price,
  currency: p.currency,
  image: p.images[0]!,
  href: `/products/${p.handle}`,
}));

function buildProductDetailPage(id: string, product: Product): SiteProject["pages"][number] {
  return {
    id,
    slug: `/products/${product.handle}`,
    title: product.title,
    seo: { description: `${product.title} — shop on our store.` },
    kind: "product",
    productHandle: product.handle,
    sections: [
      {
        id: `${id}_detail`,
        type: "product-detail",
        variant: "gallery-left",
        content: {
          ...(SECTION_DATA["product-detail"].defaultContent as Record<string, unknown>),
          // Library-bound: catalog fields hydrate from SiteProject.productLibrary
          // at render time via ProductLibraryProvider. Inline content stays as a
          // safety net + carries the agency-controlled CTAs/eyebrow.
          productId: product.id,
          eyebrow: "Shop",
          title: product.title,
          price: product.price,
          currency: product.currency,
          images: product.images,
          primaryCta: { label: "Add to cart", href: `/cart/add?id=${product.id}` },
          secondaryCta: { label: "Ask a question", href: "/contact" },
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
          // Library-bound, exclude the current product. Renderer hydrates
          // each id from SiteProject.productLibrary at render time.
          mode: "library",
          productIds: SAMPLE_PRODUCT_LIBRARY
            .filter((p) => p.id !== product.id)
            .map((p) => p.id),
          products: [],
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
              // Library-bound — agency edits the library, every grid that
              // references these ids updates. Empty productIds would mean
              // "show all" but here we want explicit hand-picked ordering.
              mode: "library",
              productIds: SAMPLE_PRODUCT_LIBRARY.map((p) => p.id),
              products: [],
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
              // Empty productIds + library mode = "show entire library". This
              // is the contract the auto-managed /products index page uses,
              // so it always reflects the full catalog without explicit
              // re-syncing on every product CRUD.
              mode: "library",
              productIds: [],
              products: [],
            },
            style: {},
          },
        ],
      },
      // Individual product detail pages — one per library product. These
      // hydrate via productId at render time; deleting a product from the
      // library makes the page render a placeholder. The builder's
      // products-panel keeps these in sync (adds page on add, removes on
      // remove).
      buildProductDetailPage("pg_prod_001", SAMPLE_PRODUCT_LIBRARY[0]!),
      buildProductDetailPage("pg_prod_002", SAMPLE_PRODUCT_LIBRARY[1]!),
      buildProductDetailPage("pg_prod_003", SAMPLE_PRODUCT_LIBRARY[2]!),
    ],
    globals: {
      header: defaultSection("sec_header", "header"),
      footer: defaultSection("sec_footer", "footer"),
      announcementBar: defaultSection("sec_annbar", "announcement-bar"),
    },
    productLibrary: SAMPLE_PRODUCT_LIBRARY,
  };
}

/** Stable id of the home page's featured-products grid. */
export const HOME_FEATURED_GRID_ID = "sec_home_featured";
