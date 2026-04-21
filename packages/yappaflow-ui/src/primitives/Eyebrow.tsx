import { forwardRef, type ReactNode, type CSSProperties } from "react";
import { cn } from "../utils/cn.js";

export interface EyebrowProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * <Eyebrow> — small uppercase label that sits above a headline.
 * Used by heroes, section openers, nav categories.
 */
export const Eyebrow = forwardRef<HTMLSpanElement, EyebrowProps>(function Eyebrow(
  { children, className, style },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn("ff-eyebrow", className)}
      style={{
        fontFamily: "var(--ff-font-body)",
        fontSize: "var(--ff-type-eyebrow)",
        fontWeight: "var(--ff-weight-medium)" as unknown as number,
        letterSpacing: "var(--ff-tracking-eyebrow)",
        textTransform: "uppercase",
        color: "var(--ff-text-secondary)",
        lineHeight: 1,
        display: "inline-block",
        ...style,
      }}
    >
      {children}
    </span>
  );
});
