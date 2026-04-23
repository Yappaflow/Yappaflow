import {
  AlignLeft,
  BarChart3,
  Bell,
  Building2,
  Clock,
  Columns2,
  Contact,
  Grid3x3,
  HelpCircle,
  LayoutList,
  Mail,
  Megaphone,
  Minus,
  Package,
  Quote,
  ShoppingBag,
  Sparkles,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { SectionType } from "@yappaflow/types";

/**
 * Visual identity for each section type — used in the Insert palette cards
 * and the Layers list rows. A single source of truth so picker and list
 * never drift out of sync.
 *
 * Icons lean descriptive, not decorative — if a user scans the palette
 * quickly, they should recognise "hero" from the sparkles, "product-grid"
 * from the shopping bag, etc.
 */
export const SECTION_ICONS: Record<SectionType, LucideIcon> = {
  // 10 MVP section types
  hero: Sparkles,
  "feature-grid": Grid3x3,
  "feature-row": Columns2,
  "product-grid": ShoppingBag,
  testimonial: Quote,
  "cta-band": Megaphone,
  "rich-text": AlignLeft,
  header: LayoutList,
  footer: Minus,
  "announcement-bar": Bell,

  // 8 Exhibit-backed section types (Phase 8b)
  faq: HelpCircle,
  pricing: Tag,
  "stats-band": BarChart3,
  timeline: Clock,
  "logo-cloud": Building2,
  team: Users,
  newsletter: Mail,
  contact: Contact,

  // Phase 8d — product-detail page section
  "product-detail": Package,
};

export function iconForSection(type: SectionType): LucideIcon {
  return SECTION_ICONS[type];
}
