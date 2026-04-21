/**
 * Docs manifest — hand-maintained ordering for /docs sidebar.
 *
 * Kept as a static array (not file-system scanned) because Next's MDX loader
 * is most predictable when routes are explicitly declared, and a stable
 * ordering beats alphabetical here.
 */
export interface DocEntry {
  slug: string;
  title: string;
  summary: string;
  section: "Start" | "System" | "Patterns" | "Reference";
}

export const DOCS: DocEntry[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    section: "Start",
    summary: "Install the library, mount the shell, render your first exhibit.",
  },
  {
    slug: "tokens",
    title: "Design tokens",
    section: "System",
    summary:
      "The --ff-* layer — color, space, type, radius, motion. Swap once, restyle every site.",
  },
  {
    slug: "theming",
    title: "Theming",
    section: "System",
    summary:
      "Light default, dark toggle, and how the --ff-* token layer works.",
  },
  {
    slug: "motion-system",
    title: "Motion system",
    section: "System",
    summary:
      "GSAP + Lenis, the choreography score, and when to reach for Reveal vs. ScrollSection.",
  },
  {
    slug: "composition-patterns",
    title: "Composition patterns",
    section: "Patterns",
    summary: "How to compose primitives into shells and exhibits.",
  },
  {
    slug: "components",
    title: "Components",
    section: "Reference",
    summary:
      "Every public component — primitives, motion, shell, exhibits, theme.",
  },
  {
    slug: "publishing",
    title: "Publishing",
    section: "Reference",
    summary:
      "How to cut a release to npm — pack, verify, version, publish, deprecate.",
  },
  {
    slug: "changelog",
    title: "Changelog",
    section: "Reference",
    summary: "Version history.",
  },
];

export function getDoc(slug: string): DocEntry | undefined {
  return DOCS.find((d) => d.slug === slug);
}

export function docsBySection(): Record<string, DocEntry[]> {
  return DOCS.reduce<Record<string, DocEntry[]>>((acc, d) => {
    (acc[d.section] ||= []).push(d);
    return acc;
  }, {});
}

export const SECTION_ORDER = ["Start", "System", "Patterns", "Reference"] as const;
