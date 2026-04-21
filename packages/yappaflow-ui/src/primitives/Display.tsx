import { forwardRef, type ElementType, type ReactNode, type CSSProperties } from "react";
import { cn } from "../utils/cn.js";

export type DisplaySize = "xl" | "lg" | "md" | "sm";
export type DisplayTracking = "tight" | "normal";

export interface DisplayProps {
  children?: ReactNode;
  as?: ElementType;
  size?: DisplaySize;
  tracking?: DisplayTracking;
  /** Text balance — uses CSS text-wrap: balance for tight headlines. */
  balance?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * <Display> — headline typography primitive.
 *
 * Always uses the display font stack, tight tracking, and architectural
 * line-height. Never use a raw <h1> styled with Tailwind for hero headlines
 * — route through Display.
 */
export const Display = forwardRef<HTMLElement, DisplayProps>(function Display(
  { children, as: Tag = "h1", size = "lg", tracking = "tight", balance = true, className, style },
  ref,
) {
  const Component = Tag as ElementType;
  const baseStyle: CSSProperties = {
    fontFamily: "var(--ff-font-display)",
    fontSize: `var(--ff-type-display-${size})`,
    fontWeight: "var(--ff-weight-medium)" as unknown as number,
    letterSpacing: `var(--ff-tracking-display-${tracking})`,
    lineHeight:
      tracking === "tight"
        ? ("var(--ff-leading-display-tight)" as unknown as number)
        : ("var(--ff-leading-display-normal)" as unknown as number),
    color: "var(--ff-text-primary)",
    ...(balance ? ({ textWrap: "balance" } as CSSProperties) : null),
    ...style,
  };
  return (
    <Component
      ref={ref as never}
      className={cn("ff-display", `ff-display--${size}`, className)}
      style={baseStyle}
      data-display-size={size}
    >
      {children}
    </Component>
  );
});
