import type { FooterContent } from "./schema.js";

export const DEFAULT_FOOTER_CONTENT: FooterContent = {
  tagline: "Design-led studio. Built to last.",
  columns: [
    {
      heading: "Studio",
      links: [
        { label: "Work", href: "/work" },
        { label: "About", href: "/about" },
        { label: "Journal", href: "/journal" },
      ],
    },
    {
      heading: "Contact",
      links: [
        { label: "Email", href: "mailto:hello@example.com" },
        { label: "Instagram", href: "https://instagram.com/" },
      ],
    },
  ],
  socials: [
    { platform: "instagram", href: "https://instagram.com/" },
    { platform: "linkedin", href: "https://linkedin.com/" },
  ],
  legal: `© ${new Date().getFullYear()} Studio. All rights reserved.`,
};
