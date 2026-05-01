import type { ProductGridContent } from "./schema.js";

export const DEFAULT_PRODUCT_GRID_CONTENT: ProductGridContent = {
  eyebrow: "Shop",
  heading: "Latest drops",
  subhead: "",
  columns: 3,
  // Default to manual mode so the seeded fixture renders standalone (no
  // library required). The builder migration flips this to "library" when
  // it extracts these into SiteProject.productLibrary.
  mode: "manual",
  productIds: [],
  products: [
    {
      id: "p-001",
      handle: "classic-tee",
      title: "Classic tee",
      price: "$42",
      currency: "USD",
      image: {
        kind: "image",
        url: "/images/products/classic-tee.jpg",
        alt: "Classic tee",
        width: 1000,
        height: 1250,
      },
      href: "/products/classic-tee",
    },
    {
      id: "p-002",
      handle: "studio-cap",
      title: "Studio cap",
      price: "$28",
      currency: "USD",
      image: {
        kind: "image",
        url: "/images/products/studio-cap.jpg",
        alt: "Studio cap",
        width: 1000,
        height: 1250,
      },
      href: "/products/studio-cap",
    },
    {
      id: "p-003",
      handle: "canvas-tote",
      title: "Canvas tote",
      price: "$34",
      currency: "USD",
      image: {
        kind: "image",
        url: "/images/products/canvas-tote.jpg",
        alt: "Canvas tote",
        width: 1000,
        height: 1250,
      },
      href: "/products/canvas-tote",
    },
  ],
  ctaAll: { label: "View everything", href: "/collections/all" },
};
