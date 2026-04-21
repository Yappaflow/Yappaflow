"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ThemeToggle } from "../theme/ThemeToggle.js";
import { Frame } from "../primitives/Frame.js";
import { cn } from "../utils/cn.js";

export interface NavLink {
  label: string;
  href: string;
}

export interface NavShellProps {
  brand: ReactNode;
  links?: NavLink[];
  cta?: { label: string; href: string };
  /** Show the theme toggle (default true — Yappaflow standing rule). */
  showThemeToggle?: boolean;
  /** Fixed at top of viewport. Default true. */
  sticky?: boolean;
  className?: string;
}

/**
 * <NavShell> — restrained top frame.
 *
 * Minimal information density by design. Opaque background only after
 * the user scrolls past the hero — before that it's transparent so the
 * hero art can bleed behind it.
 */
export function NavShell({
  brand,
  links = [],
  cta,
  showThemeToggle = true,
  sticky = true,
  className,
}: NavShellProps) {
  const [scrolled, setScrolled] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sticky) return;
    const onScroll = (): void => {
      setScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return (): void => window.removeEventListener("scroll", onScroll);
  }, [sticky]);

  return (
    <header
      ref={ref}
      className={cn("ff-nav-shell", scrolled && "ff-nav-shell--scrolled", className)}
      data-scrolled={scrolled}
      style={{
        position: sticky ? "fixed" : "relative",
        top: 0,
        left: 0,
        right: 0,
        zIndex: "var(--ff-z-nav, 50)" as unknown as number,
        transition: "background 400ms cubic-bezier(0.25, 1, 0.5, 1), backdrop-filter 400ms cubic-bezier(0.25, 1, 0.5, 1)",
        background: scrolled ? "color-mix(in srgb, var(--ff-paper) 80%, transparent)" : "transparent",
        backdropFilter: scrolled ? "blur(12px) saturate(1.1)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(12px) saturate(1.1)" : "none",
        borderBottom: scrolled ? "1px solid var(--ff-border)" : "1px solid transparent",
      }}
    >
      <Frame span={12} offset="center">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--ff-space-5)",
            paddingTop: "var(--ff-space-4)",
            paddingBottom: "var(--ff-space-4)",
            fontSize: "var(--ff-type-body-sm)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--ff-font-display)",
              fontWeight: "var(--ff-weight-medium)" as unknown as number,
              letterSpacing: "-0.01em",
              fontSize: "var(--ff-type-body-md)",
            }}
          >
            {brand}
          </div>

          <nav style={{ display: "flex", alignItems: "center", gap: "var(--ff-space-6)" }}>
            <ul style={{ display: "flex", gap: "var(--ff-space-5)" }}>
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    style={{
                      fontFamily: "var(--ff-font-body)",
                      color: "var(--ff-text-primary)",
                      fontSize: "var(--ff-type-body-sm)",
                    }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>

            {showThemeToggle && <ThemeToggle />}

            {cta && (
              <a
                href={cta.href}
                className="ff-nav-cta"
                style={{
                  fontFamily: "var(--ff-font-body)",
                  fontSize: "var(--ff-type-body-sm)",
                  fontWeight: "var(--ff-weight-medium)" as unknown as number,
                  padding: "var(--ff-space-2) var(--ff-space-4)",
                  background: "var(--ff-text-primary)",
                  color: "var(--ff-paper)",
                  borderRadius: "var(--ff-radius-sharp)",
                  transition: "transform 300ms cubic-bezier(0.25, 1, 0.5, 1)",
                }}
              >
                {cta.label}
              </a>
            )}
          </nav>
        </div>
      </Frame>
    </header>
  );
}
