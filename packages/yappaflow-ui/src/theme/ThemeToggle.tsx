"use client";

import { type HTMLAttributes } from "react";
import { useTheme } from "./ThemeProvider.js";
import { cn } from "../utils/cn.js";

export interface ThemeToggleProps extends Omit<HTMLAttributes<HTMLButtonElement>, "children"> {
  /** Visual variant. "mark" is the default minimal one-glyph toggle. */
  variant?: "mark" | "framed";
  /** Accessible label. Defaults to a context-aware one. */
  label?: string;
}

/**
 * Light / dark toggle.
 *
 * Per Yappaflow standing rule: every generated site ships this. The Shell
 * layer's NavShell slots it in by default unless explicitly removed.
 *
 * No animation library dependency — a pure CSS transition on transform.
 */
export function ThemeToggle({
  variant = "mark",
  label,
  className,
  ...rest
}: ThemeToggleProps) {
  const { resolved, toggle } = useTheme();
  const isDark = resolved === "dark";

  return (
    <button
      type="button"
      aria-label={label ?? (isDark ? "Switch to light theme" : "Switch to dark theme")}
      aria-pressed={isDark}
      onClick={toggle}
      className={cn("ff-theme-toggle", `ff-theme-toggle--${variant}`, className)}
      data-theme-resolved={resolved}
      {...rest}
    >
      <span className="ff-theme-toggle__mark" aria-hidden="true" />
    </button>
  );
}
