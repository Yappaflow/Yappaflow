/**
 * PlaceholderSection — the shared visual every Phase-7 section uses for its
 * render stub. It intentionally renders nothing close to a final design: just
 * a labeled container with every section identity attribute the builder and
 * the adapters need to target.
 *
 * Phase 8 replaces each section's render.tsx with real UI (Tailwind + GSAP
 * bindings). Until then, the placeholder is the ground truth for iframe-canvas
 * round-trips and for adapter smoke tests.
 */

import type { Section } from "@yappaflow/types";
import type { ReactNode } from "react";

export interface PlaceholderSectionProps {
  section: Section;
  /** Variant actually in use (falls back to the section def's default). */
  variant: string;
  /** Free-form body content the specific section wants to show. */
  children?: ReactNode;
}

export function PlaceholderSection({
  section,
  variant,
  children,
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
    <section {...dataAttrs}>
      <div data-yf-section-label="">
        <span>{section.type}</span>
        <span aria-hidden="true">·</span>
        <span>{variant}</span>
      </div>
      <div data-yf-section-body="">{children}</div>
    </section>
  );
}
