import { forwardRef, type ElementType, type ReactNode, type CSSProperties } from "react";
import { cn } from "../utils/cn.js";

export type BodySize = "lg" | "md" | "sm";
export type BodyTone = "primary" | "secondary" | "tertiary";

export interface BodyProps {
  children?: ReactNode;
  as?: ElementType;
  size?: BodySize;
  tone?: BodyTone;
  className?: string;
  style?: CSSProperties;
}

/**
 * <Body> — base prose primitive. Always uses the body font stack and
 * generous line-height. Color is selected from the text hierarchy.
 */
export const Body = forwardRef<HTMLElement, BodyProps>(function Body(
  { children, as: Tag = "p", size = "md", tone = "primary", className, style },
  ref,
) {
  const Component = Tag as ElementType;
  const baseStyle: CSSProperties = {
    fontFamily: "var(--ff-font-body)",
    fontSize: `var(--ff-type-body-${size})`,
    lineHeight: "var(--ff-leading-body)" as unknown as number,
    color: `var(--ff-text-${tone})`,
    ...style,
  };
  return (
    <Component ref={ref as never} className={cn("ff-body", className)} style={baseStyle}>
      {children}
    </Component>
  );
});
