import { forwardRef, type ElementType, type ReactNode, type CSSProperties } from "react";
import { cn } from "../utils/cn.js";

export type ExhibitTone = "dense" | "breathing" | "signature";
export type ExhibitEdge = "contained" | "full-bleed";
export type ExhibitRhythm = "gutter" | "breath" | "room" | "hall";

export interface ExhibitProps {
  children?: ReactNode;
  as?: ElementType;
  tone?: ExhibitTone;
  edge?: ExhibitEdge;
  rhythm?: ExhibitRhythm;
  /** Semantic id for navigation anchors. */
  id?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * <Exhibit> — a section wrapper that encodes composition rhythm.
 *
 * - `tone` sets vertical space (dense / breathing / signature).
 * - `edge` controls whether the section is contained or bleeds to the viewport.
 * - `rhythm` overrides the default spacing token if needed.
 *
 * Exhibits render nested content — typically a Frame + a composition.
 */
export const Exhibit = forwardRef<HTMLElement, ExhibitProps>(function Exhibit(
  { children, as: Tag = "section", tone = "breathing", edge = "contained", rhythm, id, className, style },
  ref,
) {
  const Component = Tag as ElementType;

  const resolvedRhythm: ExhibitRhythm =
    rhythm ??
    (tone === "dense" ? "gutter" : tone === "signature" ? "room" : "breath");

  const paddingBlock = `var(--ff-rhythm-${resolvedRhythm})`;

  const baseStyle: CSSProperties = {
    position: "relative",
    paddingTop: paddingBlock,
    paddingBottom: paddingBlock,
    width: edge === "full-bleed" ? "100vw" : "100%",
    marginLeft: edge === "full-bleed" ? "calc(50% - 50vw)" : undefined,
    ...style,
  };

  return (
    <Component
      ref={ref as never}
      id={id}
      className={cn("ff-exhibit", `ff-exhibit--${tone}`, className)}
      style={baseStyle}
      data-exhibit-tone={tone}
      data-exhibit-edge={edge}
    >
      {children}
    </Component>
  );
});
