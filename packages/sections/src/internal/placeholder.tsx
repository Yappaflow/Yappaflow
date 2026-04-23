/**
 * SectionFrame — the thin wrapper every section render component uses to
 * stamp a `<section>` element with the identity attributes the builder and
 * the CMS adapters rely on.
 *
 * No visible chrome here; the styled markup each section ships in its own
 * `render.tsx` is the actual visual. The frame just ensures that every
 * section shares a consistent outer element with:
 *   - `data-yf-section-id`, `-type`, `-variant` — for click-to-select in the
 *     builder and for per-section styling overrides in CMS adapters.
 *   - `data-yf-anim="<preset>"` when an animation is bound — read by the
 *     Phase 11 GSAP runtime.
 *
 * Historically called `PlaceholderSection`; kept under the same export name
 * for backward compatibility so the ten section renders don't churn.
 */

import type { Section } from "@yappaflow/types";
import type { ReactNode } from "react";

export interface PlaceholderSectionProps {
  section: Section;
  /** Variant actually in use (falls back to the section def's default). */
  variant: string;
  /** Content to render inside. Section renders pass their fully-styled markup. */
  children?: ReactNode;
  /** Optional className on the outer `<section>` for layout/spacing. */
  className?: string;
}

export function PlaceholderSection({
  section,
  variant,
  children,
  className,
}: PlaceholderSectionProps) {
  const dataAttrs: Record<string, string> = {
    "data-yf-section": "",
    "data-yf-section-id": section.id,
    "data-yf-section-type": section.type,
    "data-yf-section-variant": variant,
  };
  if (section.animation && section.animation !== "none") {
    dataAttrs["data-yf-anim"] = section.animation;
  }

  return (
    <section className={className} {...dataAttrs}>
      {children}
    </section>
  );
}
