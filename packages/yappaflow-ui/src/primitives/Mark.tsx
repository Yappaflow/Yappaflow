import { forwardRef, type ReactNode, type CSSProperties } from "react";
import { cn } from "../utils/cn.js";

export interface MarkProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * <Mark> — single-word accent span.
 *
 * Used sparingly. The moment of surprise in a headline.
 *
 *   <Display>The future of <Mark>code</Mark>.</Display>
 */
export const Mark = forwardRef<HTMLSpanElement, MarkProps>(function Mark(
  { children, className, style },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn("ff-mark", className)}
      style={{ color: "var(--ff-accent)", ...style }}
    >
      {children}
    </span>
  );
});
