import type { AnnouncementBarContent } from "./schema.js";

export const DEFAULT_ANNOUNCEMENT_BAR_CONTENT: AnnouncementBarContent = {
  message: "Free shipping on orders over $100.",
  cta: { label: "Shop now", href: "/collections/all" },
  dismissible: true,
};
