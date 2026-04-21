import { forwardRef, type ElementType, type ReactNode, type CSSProperties } from "react";
import { cn } from "../utils/cn.js";

export type SpreadRatio = "1:1" | "1:2" | "2:3" | "1:4" | "phi";

const RATIO_MAP: Record<SpreadRatio, string> = {
  "1:1": "1fr 1fr",
  "1:2": "1fr 2fr",
  "2:3": "2fr 3fr",
  "1:4": "1fr 4fr",
  phi: "1fr 1.618fr", // golden ratio
};

export interface SpreadProps {
  children?: ReactNode;
  as?: ElementType;
  ratio?: SpreadRatio;
  /** Align tracks vertically. */
  align?: "start" | "center" | "end";
  /** Gutter between tracks. */
  gap?: "tight" | "breath" | "room";
  /** Reverse on mobile where the two tracks stack. */
  stackReverse?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * <Spread> — two-track asymmetric layout.
 *
 * The asymmetry primitive. Editorial heroes, case study spreads, anything
 * with intentional imbalance.
 *
 * On mobile both tracks stack vertically.
 */
export const Spread = forwardRef<HTMLElement, SpreadProps>(function Spread(
  { children, as: Tag = "div", ratio = "1:2", align = "center", gap = "breath", stackReverse = false, className, style },
  ref,
) {
  const Component = Tag as ElementType;
  const gapVar =
    gap === "tight"
      ? "var(--ff-space-5)"
      : gap === "room"
        ? "var(--ff-space-8)"
        : "var(--ff-space-7)";

  const baseStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: RATIO_MAP[ratio],
    alignItems: align === "center" ? "center" : align === "end" ? "end" : "start",
    gap: gapVar,
    ...style,
  };

  return (
    <Component
      ref={ref as never}
      className={cn("ff-spread", `ff-spread--${ratio}`, stackReverse && "ff-spread--stack-reverse", className)}
      style={baseStyle}
      data-spread-ratio={ratio}
    >
      <style>{SPREAD_CSS}</style>
      {children}
    </Component>
  );
});

const SPREAD_CSS = /* css */ `
@media (max-width: 900px) {
  .ff-spread { grid-template-columns: 1fr !important; }
  .ff-spread--stack-reverse { direction: rtl; }
  .ff-spread--stack-reverse > * { direction: ltr; }
}
`;
