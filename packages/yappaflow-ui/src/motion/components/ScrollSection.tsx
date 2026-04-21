"use client";

import { forwardRef, useRef, type ElementType, type ReactNode, type CSSProperties } from "react";
import { useScrollTrigger, type ScrollSectionMode } from "../hooks/use-scroll-trigger.js";
import { cn } from "../../utils/cn.js";

export interface ScrollSectionProps {
  children?: ReactNode;
  as?: ElementType;
  type?: ScrollSectionMode;
  start?: string;
  end?: string;
  scrub?: boolean | number;
  className?: string;
  style?: CSSProperties;
}

/**
 * <ScrollSection> — a section that reveals, pins, or subtly parallaxes on
 * scroll. The type prop is the only thing the AI needs to reason about.
 */
export const ScrollSection = forwardRef<HTMLElement, ScrollSectionProps>(
  function ScrollSection(
    { children, as: Tag = "section", type = "reveal", start, end, scrub, className, style },
    _forwardedRef,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    useScrollTrigger(localRef, { mode: type, start, end, scrub });

    const Component = Tag as ElementType;
    return (
      <Component
        ref={localRef as never}
        className={cn("ff-scroll-section", className)}
        style={style}
        data-scroll-type={type}
      >
        {children}
      </Component>
    );
  },
);
