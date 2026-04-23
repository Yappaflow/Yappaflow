import type { HeaderContent } from "./schema.js";

export const DEFAULT_HEADER_CONTENT: HeaderContent = {
  logo: { text: "Studio" },
  nav: [
    { label: "Work", href: "/work" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  cta: { label: "Start a project", href: "/contact" },
};
