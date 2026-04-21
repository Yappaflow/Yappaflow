"use client";

import { type ReactNode } from "react";
import { ThemeProvider, type ThemeMode } from "../theme/ThemeProvider.js";
import { MotionProvider } from "../motion/provider.js";
import { Cursor, type CursorProps } from "../motion/components/Cursor.js";
import { cn } from "../utils/cn.js";

export interface GalleryShellProps {
  children?: ReactNode;
  /**
   * Initial theme mode. Default `"light"` per the Yappaflow standing rule —
   * every generated site ships light, with dark as an opt-in toggle. Pass
   * `"auto"` to follow system preference instead.
   */
  theme?: ThemeMode;
  /** Enable Lenis smooth scroll. Default true. */
  smoothScroll?: boolean;
  /** Enable the custom cursor. Default off. Pass `true` for minimal, or a variant. */
  cursor?: boolean | CursorProps["variant"];
  className?: string;
}

/**
 * <GalleryShell> — the root wrapper.
 *
 * Every Yappaflow-generated site renders exactly one of these, and nothing
 * outside it. It mounts (in order):
 *
 *   1. ThemeProvider — light/dark + storage
 *   2. MotionProvider — GSAP boot + Lenis + reduced-motion gating
 *   3. Optional Cursor overlay
 *
 * Content is rendered into a <main> with the gallery paper background.
 */
export function GalleryShell({
  children,
  theme = "light",
  smoothScroll = true,
  cursor = false,
  className,
}: GalleryShellProps) {
  const cursorVariant: CursorProps["variant"] | null =
    cursor === true ? "minimal" : cursor === false ? null : cursor;

  return (
    <ThemeProvider defaultMode={theme}>
      <MotionProvider smoothScroll={smoothScroll}>
        <div
          className={cn("ff-gallery-shell", className)}
          style={{
            position: "relative",
            minHeight: "100vh",
            background: "var(--ff-paper)",
            color: "var(--ff-text-primary)",
            fontFamily: "var(--ff-font-body)",
          }}
        >
          {children}
          {cursorVariant && <Cursor variant={cursorVariant} />}
        </div>
      </MotionProvider>
    </ThemeProvider>
  );
}
