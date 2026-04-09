"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { WaterCanvas } from "@/components/ui/WaterCanvas";
import { LogoBar } from "@/components/ui/LogoBar";

export function HeroSection() {
  const t = useTranslations("hero");

  return (
    <section className="relative pt-16 overflow-hidden">
      {/* Water canvas — fills entire hero */}
      <div className="absolute inset-0 z-0 min-h-[85vh]">
        <WaterCanvas className="w-full h-full" />
      </div>

      {/* Subtle dark gradient at bottom for contrast */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/10 via-transparent to-black/40 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 pt-24 pb-28 sm:pt-32 sm:pb-36 min-h-[85vh] flex flex-col justify-center">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-6xl"
          >
            {/* Eyebrow badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 backdrop-blur-sm"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-sm font-semibold tracking-wide text-white uppercase">
                AI-Powered Web Agency
              </span>
            </motion.div>

            {/* Giant headline */}
            <h1
              className="font-black tracking-tighter text-white leading-[0.88]"
              style={{ fontSize: "clamp(3.5rem, 10vw, 9rem)" }}
            >
              {t("headline")}
              <br />
              <span
                className="text-white/60"
                style={{ WebkitTextStroke: "1px rgba(255,255,255,0.4)" }}
              >
                {t("headlineAccent")}
              </span>
            </h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-8 max-w-lg text-lg font-medium text-white/75 leading-relaxed"
            >
              {t("description")}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <Button
                href="#cta"
                size="lg"
                className="bg-white text-gray-900 hover:bg-gray-100 font-bold text-base shadow-xl shadow-black/20"
              >
                {t("cta")}
              </Button>
              <Button
                href="#demo"
                variant="ghost"
                size="lg"
                className="border-2 border-white/40 text-white hover:bg-white/10 font-bold text-base backdrop-blur-sm"
              >
                {t("ctaSecondary")}
              </Button>
            </motion.div>
          </motion.div>
        </Container>
      </div>

      {/* Logo bar */}
      <div className="relative z-10 bg-white py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <LogoBar label={t("trustedBy")} />
        </motion.div>
      </div>
    </section>
  );
}
