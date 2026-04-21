"use client";

import { type ReactNode } from "react";
import { GalleryShell, NavShell, FootShell } from "yappaflow-ui/shell";

const NAV_LINKS = [
  { label: "Gallery", href: "/gallery" },
  { label: "Motion Lab", href: "/motion-lab" },
  { label: "Docs", href: "/docs" },
];

/**
 * <SiteShell> — the single chrome wrapper for every docs route.
 *
 * Always renders in this order:
 *   NavShell (sticky)  →  <main> with page content  →  FootShell
 *
 * GalleryShell handles Theme + Motion + (optional) Cursor providers, so
 * nothing below it needs to worry about theme or animation bootstrap.
 *
 * Kept in the docs app (not the library) because the sidebar + link structure
 * is specific to this site — yappaflow-ui's own NavShell remains generic.
 */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <GalleryShell theme="auto" smoothScroll>
      <NavShell
        brand={<BrandMark />}
        links={NAV_LINKS}
        cta={{ label: "GitHub", href: "https://github.com/yappaflow" }}
      />
      <main>{children}</main>
      <FootShell
        brand="yappaflow-ui"
        tagline="The design vocabulary behind Yappaflow's AI site generator."
        columns={[
          {
            title: "Library",
            links: [
              { label: "Gallery", href: "/gallery" },
              { label: "Motion Lab", href: "/motion-lab" },
              { label: "Docs", href: "/docs" },
            ],
          },
          {
            title: "Project",
            links: [
              { label: "Yappaflow", href: "https://yappaflow.com" },
              { label: "GitHub", href: "https://github.com/yappaflow" },
              { label: "Changelog", href: "/docs/changelog" },
            ],
          },
        ]}
        fineprint={`© ${new Date().getFullYear()} Yappaflow · MIT License`}
      />
    </GalleryShell>
  );
}

function BrandMark() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        fontFamily: "var(--ff-font-display)",
        fontWeight: 500,
        letterSpacing: "-0.01em",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: 10,
          height: 10,
          borderRadius: 2,
          background: "var(--ff-accent)",
        }}
      />
      <a href="/" style={{ color: "inherit", textDecoration: "none" }}>
        yappaflow<span style={{ color: "var(--ff-text-tertiary)" }}>-ui</span>
      </a>
    </span>
  );
}
