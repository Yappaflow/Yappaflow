import type { ContactContent } from "./schema.js";

export const DEFAULT_CONTACT_CONTENT: ContactContent = {
  eyebrow: "Contact",
  heading: "Start a conversation.",
  subheading: "We take on a handful of engagements a quarter. We reply within a business day.",
  includeForm: true,
  formAction: "",
  rows: [
    { label: "Studio", value: "12 Gallery Row, Samsun, TR" },
    { label: "Email", value: "hello@studio.com", href: "mailto:hello@studio.com" },
    { label: "Hours", value: "Mon–Fri · 09:00–18:00 (GMT+3)" },
    { label: "Instagram", value: "@studio", href: "https://instagram.com/" },
  ],
};
