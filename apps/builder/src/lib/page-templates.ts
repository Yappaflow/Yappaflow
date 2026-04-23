import {
  BookOpen,
  Contact,
  FileText,
  HelpCircle,
  Info,
  LayoutGrid,
  type LucideIcon,
  Package,
  Scale,
  ShoppingBag,
  Sparkles,
  Tag,
  UserCircle,
  Users,
} from "lucide-react";
import type { SectionType } from "@yappaflow/types";

/**
 * Starter-template system for the New Page flow.
 *
 * Each template declares an identity (id, label, description, icon) and a
 * `buildSections()` that returns a typed list of section specs. At page
 * creation the store hydrates each spec into a real Section instance using
 * the section library's defaults, overlaid with per-template content tweaks
 * where we have them (so the About page opens with a heading that actually
 * says "About us", not the generic default).
 *
 * Keeping templates as runtime composition (not static JSON) means when a
 * section's default content drifts, every template using that section
 * picks up the new defaults automatically.
 */

export interface TemplateSectionSpec {
  type: SectionType;
  variant?: string;
  /** Shallow-merged into the section's default content on create. */
  contentOverrides?: Record<string, unknown>;
}

export interface PageTemplate {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  defaultTitle: string;
  defaultSlug: string;
  buildSections: () => TemplateSectionSpec[];
}

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: "blank",
    label: "Blank",
    description: "Empty page. Drag sections in from Insert.",
    icon: FileText,
    defaultTitle: "New page",
    defaultSlug: "/new-page",
    buildSections: () => [],
  },
  {
    id: "about",
    label: "About",
    description: "Hero, story, team, stats, closing CTA.",
    icon: Info,
    defaultTitle: "About",
    defaultSlug: "/about",
    buildSections: () => [
      {
        type: "hero",
        variant: "centered",
        contentOverrides: {
          eyebrow: "About us",
          heading: "A studio with a point of view.",
          subhead: "Who we are, what we care about, and how we work.",
        },
      },
      {
        type: "feature-row",
        variant: "image-right",
        contentOverrides: {
          eyebrow: "Our story",
          heading: "Built over twelve years of shipping work.",
        },
      },
      { type: "team" },
      { type: "stats-band" },
      { type: "cta-band", variant: "centered" },
    ],
  },
  {
    id: "services",
    label: "Services",
    description: "What you offer, how you work, pricing CTA.",
    icon: LayoutGrid,
    defaultTitle: "Services",
    defaultSlug: "/services",
    buildSections: () => [
      {
        type: "hero",
        contentOverrides: {
          eyebrow: "Services",
          heading: "What we do.",
          subhead: "A short list of deep capabilities.",
        },
      },
      { type: "feature-grid" },
      { type: "feature-row", variant: "image-left" },
      { type: "pricing" },
      { type: "cta-band", variant: "split" },
    ],
  },
  {
    id: "products",
    label: "Products",
    description: "Catalog page with a large product grid.",
    icon: ShoppingBag,
    defaultTitle: "Shop",
    defaultSlug: "/shop",
    buildSections: () => [
      {
        type: "hero",
        variant: "centered",
        contentOverrides: {
          eyebrow: "Shop",
          heading: "Latest drops.",
          subhead: "Everything in stock, ready to ship.",
        },
      },
      {
        type: "product-grid",
        variant: "card",
        contentOverrides: { columns: 4 },
      },
      { type: "cta-band", variant: "centered" },
    ],
  },
  {
    id: "product-detail",
    label: "Product detail",
    description: "Single-product page: gallery, pricing, variants, related.",
    icon: Package,
    defaultTitle: "Product",
    defaultSlug: "/products/new-product",
    buildSections: () => [
      { type: "product-detail", variant: "gallery-left" },
      {
        type: "testimonial",
        variant: "single",
        contentOverrides: {
          eyebrow: "What people say",
          heading: "",
        },
      },
      {
        type: "faq",
        contentOverrides: {
          eyebrow: "Product FAQ",
          heading: "Sizing, shipping, and returns.",
        },
      },
      {
        type: "product-grid",
        variant: "card",
        contentOverrides: {
          eyebrow: "Related",
          heading: "You might also like",
          columns: 3,
        },
      },
    ],
  },
  {
    id: "pricing",
    label: "Pricing",
    description: "Hero, tiers, FAQ, closing CTA.",
    icon: Tag,
    defaultTitle: "Pricing",
    defaultSlug: "/pricing",
    buildSections: () => [
      {
        type: "hero",
        variant: "centered",
        contentOverrides: {
          eyebrow: "Plans",
          heading: "Pricing that matches your workload.",
          subhead: "Start free. Upgrade when it makes sense.",
        },
      },
      { type: "pricing" },
      { type: "faq" },
      { type: "cta-band", variant: "centered" },
    ],
  },
  {
    id: "contact",
    label: "Contact",
    description: "Editorial contact detail list + form.",
    icon: Contact,
    defaultTitle: "Contact",
    defaultSlug: "/contact",
    buildSections: () => [
      {
        type: "hero",
        variant: "centered",
        contentOverrides: {
          eyebrow: "Contact",
          heading: "Let's talk.",
          subhead: "We reply within a business day.",
        },
      },
      { type: "contact" },
    ],
  },
  {
    id: "faq",
    label: "FAQ",
    description: "Hero, accordion of Q&As, closing CTA.",
    icon: HelpCircle,
    defaultTitle: "FAQ",
    defaultSlug: "/faq",
    buildSections: () => [
      {
        type: "hero",
        variant: "centered",
        contentOverrides: {
          eyebrow: "FAQ",
          heading: "Answers to the questions we get most.",
        },
      },
      { type: "faq" },
      { type: "cta-band", variant: "centered" },
    ],
  },
  {
    id: "team",
    label: "Team",
    description: "Team grid, stats, and a hiring CTA.",
    icon: Users,
    defaultTitle: "Team",
    defaultSlug: "/team",
    buildSections: () => [
      {
        type: "hero",
        variant: "centered",
        contentOverrides: {
          eyebrow: "The studio",
          heading: "People who care about the result.",
        },
      },
      { type: "team" },
      { type: "stats-band" },
      {
        type: "cta-band",
        variant: "centered",
        contentOverrides: {
          heading: "Want to join?",
          subhead: "We're always meeting people.",
        },
      },
    ],
  },
  {
    id: "blog",
    label: "Blog index",
    description: "Hero + placeholder prose (blog list coming).",
    icon: BookOpen,
    defaultTitle: "Journal",
    defaultSlug: "/journal",
    buildSections: () => [
      {
        type: "hero",
        contentOverrides: {
          eyebrow: "Journal",
          heading: "Writing from the studio.",
          subhead: "Notes on design, type, and the craft of shipping.",
        },
      },
      { type: "rich-text" },
      { type: "cta-band", variant: "centered" },
    ],
  },
  {
    id: "login",
    label: "Login",
    description: "Minimal login placeholder — swap in your auth form.",
    icon: UserCircle,
    defaultTitle: "Sign in",
    defaultSlug: "/login",
    buildSections: () => [
      {
        type: "hero",
        variant: "centered",
        contentOverrides: {
          eyebrow: "Account",
          heading: "Sign in",
          subhead: "Access your projects and settings.",
          primaryCta: { label: "Continue", href: "/auth/continue" },
        },
      },
      { type: "newsletter" },
    ],
  },
  {
    id: "legal",
    label: "Legal",
    description: "Quiet hero + long-form prose for TOS / Privacy.",
    icon: Scale,
    defaultTitle: "Terms",
    defaultSlug: "/legal/terms",
    buildSections: () => [
      {
        type: "hero",
        variant: "centered",
        contentOverrides: {
          eyebrow: "Legal",
          heading: "Terms of service",
          subhead: "Last updated — today.",
        },
      },
      { type: "rich-text" },
    ],
  },
  {
    id: "404",
    label: "404",
    description: "Full-bleed not-found page with return CTA.",
    icon: Sparkles,
    defaultTitle: "Not found",
    defaultSlug: "/404",
    buildSections: () => [
      {
        type: "hero",
        variant: "fullscreen-media",
        contentOverrides: {
          eyebrow: "404",
          heading: "This page wandered off.",
          subhead: "Try the nav, or head home.",
          primaryCta: { label: "Go home", href: "/" },
        },
      },
    ],
  },
];

export function getPageTemplate(id: string): PageTemplate | undefined {
  return PAGE_TEMPLATES.find((t) => t.id === id);
}
