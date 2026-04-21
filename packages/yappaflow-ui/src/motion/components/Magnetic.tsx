"use client";

import { forwardRef, useRef, type ReactNode, type ElementType, type CSSProperties } from "react";
import { useMagnetic } from "../hooks/use-magnetic.js";
import { cn } from "../../utils/cn.js";

export interface MagneticProps {
  children?: ReactNode;
  as?: ElementType;
  strength?: number;
  radius?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * <Magnetic> — wrap a CTA or button to give it a subtle cursor-follow hover.
 */
export const Magnetic = forwardRef<HTMLElement, MagneticProps>(function Magnetic(
  { children, as: Tag = "span", strength = 0.35, radius = 120, className, style },
  _forwardedRef,
) {
  const ref = useRef<HTMLElement | null>(null);
  useMagnetic(ref, { strength, radius });

  const Component = Tag as ElementType;
  return (
    <Component
      ref={ref as never}
      className={cn("ff-magnetic", className)}
      style={{ display: "inline-block", willChange: "transform", ...style }}
    >
      {children}
    </Component>
  );
});
