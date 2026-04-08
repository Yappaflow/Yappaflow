import type { Metadata } from "next";
import { inter, jetbrainsMono } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yappaflow",
  description:
    "AI-powered SaaS platform that automates the entire web development pipeline — from client discovery to deployment.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-white text-brand-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
