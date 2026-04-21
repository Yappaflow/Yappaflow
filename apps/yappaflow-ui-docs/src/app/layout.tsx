import type { Metadata } from "next";
import { type ReactNode } from "react";
import { Space_Grotesk, Inter_Tight, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "yappaflow-ui/styles.css";
import "./globals.css";
import { SiteShell } from "@/components/SiteShell";

// Font wiring — next/font exposes each family as a CSS custom property that
// globals.css maps onto the library's --ff-font-* tokens. Picking free,
// Google-hosted stand-ins for the premium fonts named in tokens.css (Neue
// Machina → Space Grotesk, GT Sectra → Instrument Serif).
const fontDisplay = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-yf-display",
  display: "swap",
});
const fontBody = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-yf-body",
  display: "swap",
});
const fontEditorial = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-yf-editorial",
  display: "swap",
});
const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-yf-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ui.yappaflow.com"),
  title: {
    default: "yappaflow-ui — a React + GSAP component library",
    template: "%s · yappaflow-ui",
  },
  description:
    "An opinionated art-gallery component library for production websites. Tokens, motion, primitives, shell, and exhibits — built for Yappaflow's AI site generator, open to everyone else.",
  openGraph: {
    title: "yappaflow-ui",
    description:
      "An opinionated art-gallery component library for production websites.",
    type: "website",
    url: "https://ui.yappaflow.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "yappaflow-ui",
    description:
      "An opinionated art-gallery component library for production websites.",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const fontClasses = [
    fontDisplay.variable,
    fontBody.variable,
    fontEditorial.variable,
    fontMono.variable,
  ].join(" ");

  return (
    <html lang="en" suppressHydrationWarning className={fontClasses}>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
