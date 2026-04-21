import { forwardRef, type ElementType, type ReactNode, type CSSProperties } from "react";
import { cn } from "../utils/cn.js";

export type FrameOffset = "left" | "right" | "center";
export type FrameBleed = "none" | "left" | "right" | "both";

export interface FrameProps {
  children?: ReactNode;
  as?: ElementType;
  /** Horizontal alignment within the canvas. */
  offset?: FrameOffset;
  /** Allow the frame to bleed past the canvas edge. */
  bleed?: FrameBleed;
  /** Column span out of 12. Default 10. */
  span?: 4 | 6 | 8 | 10 | 12;
  className?: string;
  style?: CSSProperties;
}

/**
 * <Frame> — the bounded art container.
 *
 * The grid-breaking primitive: exhibits compose by placing content inside a
 * Frame with intentional offset and bleed. Never write raw margin logic
 * above this layer.
 */
export const Frame = forwardRef<HTMLElement, FrameProps>(function Frame(
  { children, as: Tag = "div", offset = "center", bleed = "none", span = 10, className, style },
  ref,
) {
  const Component = Tag as ElementType;

  const widthPct = (span / 12) * 100;

  let marginLeft = "auto";
  let marginRight = "auto";
  if (offset === "left") {
    marginLeft = "var(--ff-inset-offset, 8.333%)";
    marginRight = "auto";
  } else if (offset === "right") {
    marginLeft = "auto";
    marginRight = "var(--ff-inset-offset, 8.333%)";
  }

  const baseStyle: CSSProperties = {
    width: `${widthPct}%`,
    maxWidth: "var(--ff-max-width, 1440px)",
    marginLeft,
    marginRight,
    paddingLeft: bleed === "left" || bleed === "both" ? 0 : "var(--ff-inset-edge)",
    paddingRight: bleed === "right" || bleed === "both" ? 0 : "var(--ff-inset-edge)",
    position: "relative",
    ...style,
  };

  return (
    <Component
      ref={ref as never}
      className={cn("ff-frame", `ff-frame--offset-${offset}`, className)}
      style={baseStyle}
      data-frame-span={span}
      data-frame-offset={offset}
      data-frame-bleed={bleed}
    >
      {children}
    </Component>
  );
});
