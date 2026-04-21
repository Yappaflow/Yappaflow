"use client";

import { forwardRef, useRef, type ElementType, type ReactNode, type CSSProperties } from "react";
import { useReveal, type RevealVariant } from "../hooks/use-reveal.js";
import { durations, staggers, easingsGsap, choreography, type ChoreographyName } from "../../tokens/motion.js";
import { cn } from "../../utils/cn.js";

export interface RevealProps {
  children?: ReactNode;
  as?: ElementType;
  variant?: RevealVariant;
  /**
   * Semantic position in the page-load score. Sets delay/duration/ease
   * from the choreography tokens. You rarely need to override this.
   */
  beat?: ChoreographyName;
  /** Override the stagger token name (text variants only). */
  stagger?: keyof typeof staggers;
  /** Viewport trigger instead of mount. */
  trigger?: "mount" | "in-view";
  className?: string;
  style?: CSSProperties;
}

/**
 * <Reveal> — the declarative entry-animation wrapper.
 *
 * Consumers pass a semantic `beat` instead of fiddling with delay/duration.
 * The page-load choreography (structure → primary → secondary → cta) is
 * encoded in tokens so the AI's output stays consistent across pages.
 */
export const Reveal = forwardRef<HTMLElement, RevealProps>(function Reveal(
  {
    children,
    as: Tag = "div",
    variant = "fade-translate",
    beat = "primary",
    stagger,
    trigger = "mount",
    className,
    style,
  },
  _forwardedRef,
) {
  const localRef = useRef<HTMLElement | null>(null);

  const beatTokens = choreography[beat];
  useReveal(localRef, {
    variant,
    delay: beatTokens.delay,
    duration: beatTokens.duration,
    stagger: stagger ? staggers[stagger] : undefined,
    ease: easingsGsap.expoOut,
    trigger,
  });

  const Component = Tag as ElementType;
  // Initial style.
  //   - fade-translate / stagger-children: opacity 1 on wrapper; gsap handles
  //     its own opacity:0 → 1 on child elements.
  //   - text-lines / text-words: wrapper stays opacity 1, but we hide the
  //     FIRST CHILD (the real typography element, e.g. <h1>) via opacity 0
  //     so there's no flash between first-paint and when GSAP boots. The
  //     hook clears that initial opacity right before splitting + animating.
  //   - mask-up: leave the inline styles untouched; hook sets clip-path.
  const initialStyle: CSSProperties =
    variant === "fade-translate" || variant === "stagger-children"
      ? { opacity: 1, ...style }
      : style ?? {};

  return (
    <Component
      ref={localRef as never}
      className={cn("ff-reveal", className)}
      style={initialStyle}
      data-reveal-variant={variant}
      data-reveal-beat={beat}
    >
      {children}
    </Component>
  );
});
