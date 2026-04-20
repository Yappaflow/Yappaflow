"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { NAV_LINKS } from "@/lib/constants";
import { Link, usePathname } from "@/i18n/navigation";

export function Navbar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <Container className="flex h-14 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <span className="font-heading text-lg uppercase tracking-tight text-white">{t("brand")}</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            link.href.startsWith("/") ? (
              <Link
                key={link.key}
                href={link.href}
                className="text-[11px] uppercase tracking-widest text-white/40 transition-colors hover:text-white"
              >
                {t(link.key)}
              </Link>
            ) : (
              <a
                key={link.key}
                href={link.href}
                className="text-[11px] uppercase tracking-widest text-white/40 transition-colors hover:text-white"
              >
                {t(link.key)}
              </a>
            )
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href={pathname}
            locale={pathname === "/" ? "tr" : "en"}
            className="text-[11px] uppercase tracking-widest text-white/30 hover:text-white transition-colors"
          >
            {t("langSwitch")}
          </Link>
          <a
            href={pathname === "/" ? "/en/auth" : "/tr/auth"}
            className="bg-brand-orange text-white text-[11px] uppercase tracking-widest px-5 py-2 hover:bg-brand-orange-dark transition-colors"
          >
            {t("getStarted")}
          </a>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden p-2 text-white/60"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </Container>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-brand-dark/95 backdrop-blur-md border-b border-white/5"
          >
            <Container className="py-6 flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.key}
                  href={link.href}
                  className="text-sm uppercase tracking-widest text-white/40 hover:text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  {t(link.key)}
                </a>
              ))}
              <a href="#cta" className="bg-brand-orange text-white text-xs uppercase tracking-widest px-5 py-3 text-center mt-2">
                {t("getStarted")}
              </a>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
