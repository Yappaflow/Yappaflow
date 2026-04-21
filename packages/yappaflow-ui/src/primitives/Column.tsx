import { forwardRef, type ElementType, type ReactNode, type CSSProperties } from "react";
import { cn } from "../utils/cn.js";

export type MeasureKey = "intimate" | "reading" | "wide";

export interface ColumnProps {
  children?: ReactNode;
  as?: ElementType;
  /** Reading width — intimate (45ch) / reading (62ch) / wide (75ch). */
  measure?: MeasureKey;
  className?: string;
  style?: CSSProperties;
}

/**
 * <Column> — a single intrinsic column with enforced measure.
 *
 * The editorial primitive: body prose should never extend beyond a
 * comfortable reading width. Wrap paragraphs in a Column.
 */
export const Column = forwardRef<HTMLElement, ColumnProps>(function Column(
  { children, as: Tag = "div", measure = "reading", className, style },
  ref,
) {
  const Component = Tag as ElementType;
  const baseStyle: CSSProperties = {
    maxWidth: `var(--ff-measure-${measure})`,
    ...style,
  };
  return (
    <Component ref={ref as never} className={cn("ff-column", className)} style={baseStyle}>
      {children}
    </Component>
  );
});
