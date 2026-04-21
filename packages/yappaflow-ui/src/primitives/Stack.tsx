import { forwardRef, type ElementType, type ReactNode, type CSSProperties } from "react";
import { cn } from "../utils/cn.js";

export type StackRhythm = "gutter" | "breath" | "room" | "hall";

export interface StackProps {
  children?: ReactNode;
  as?: ElementType;
  /** Vertical spacing between children. */
  rhythm?: StackRhythm;
  /** Horizontal alignment. */
  align?: "start" | "center" | "end" | "stretch";
  className?: string;
  style?: CSSProperties;
}

/**
 * <Stack> — vertical rhythm primitive.
 *
 * Applies named spacing tokens between children. Prefer this over ad-hoc
 * margin-bottom — it keeps rhythm consistent across exhibits.
 */
export const Stack = forwardRef<HTMLElement, StackProps>(function Stack(
  { children, as: Tag = "div", rhythm = "breath", align = "stretch", className, style },
  ref,
) {
  const Component = Tag as ElementType;
  const baseStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: align === "stretch" ? "stretch" : align === "center" ? "center" : align === "end" ? "flex-end" : "flex-start",
    gap: `var(--ff-rhythm-${rhythm})`,
    ...style,
  };
  return (
    <Component ref={ref as never} className={cn("ff-stack", className)} style={baseStyle} data-stack-rhythm={rhythm}>
      {children}
    </Component>
  );
});
