import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Builder · Yappaflow",
  description:
    "The Yappaflow in-house site builder — the agency-facing surface where AI-assembled SiteProjects get tweaked before CMS export.",
  robots: { index: false, follow: false },
};

/**
 * Root layout. A tiny pre-hydration script reads the user's theme preference
 * (localStorage first, then system) and toggles `html.dark` synchronously so
 * the page paints in the right theme on first render — no flash of light
 * content on refreshing a dark-mode session.
 */
const themeBootstrap = `
(function () {
  try {
    var stored = localStorage.getItem("yf.theme");
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var dark = stored === "dark" || (stored == null && prefersDark);
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`.trim();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
