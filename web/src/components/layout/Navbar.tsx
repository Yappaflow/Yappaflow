"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { NAV_LINKS } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { Link, usePathname } from "@/i18n/navigation";

export function Navbar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-brand-gray-100">
      <Container className="flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-black">
            <span className="text-sm font-bold text-white">Y</span>
          </div>
          <span className="text-lg font-bold tracking-tight">Yappaflow</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.key}
              href={link.href}
              className="text-sm text-gray-600 transition-colors hover:text-brand-black"
            >
              {t(link.key)}
            </a>
          ))}
        </div>

        {/* Desktop CTA + Language Toggle */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href={pathname}
            locale={pathname === "/" ? "tr" : "en"}
            className="text-sm text-gray-500 hover:text-brand-black transition-colors"
          >
            TR / EN
          </Link>
          <Button href="#cta" size="sm">
            {t("getStarted")}
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2"
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
            className="md:hidden bg-white border-b border-brand-gray-100"
          >
            <Container className="py-4 flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.key}
                  href={link.href}
                  className="text-sm text-gray-600 hover:text-brand-black"
                  onClick={() => setMobileOpen(false)}
                >
                  {t(link.key)}
                </a>
              ))}
              <Button href="#cta" size="sm" className="w-full">
                {t("getStarted")}
              </Button>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
