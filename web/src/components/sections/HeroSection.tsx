"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { LogoBar } from "@/components/ui/LogoBar";

export function HeroSection() {
  const t = useTranslations("hero");

  return (
    <section className="relative pt-16">
      <GradientBackground variant="warm" className="pb-20 pt-20 sm:pt-28 sm:pb-28">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-3xl"
          >
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-7xl">
              {t("headline")}
              <br />
              <span className="text-white/80">{t("headlineAccent")}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/80 leading-relaxed">
              {t("description")}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button href="#cta" size="lg" className="bg-white text-brand-black hover:bg-gray-100">
                {t("cta")}
              </Button>
              <Button
                href="#demo"
                variant="ghost"
                size="lg"
                className="text-white border-white/30 border hover:bg-white/10"
              >
                {t("ctaSecondary")}
              </Button>
            </div>
          </motion.div>

          {/* Video Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="mt-12 max-w-2xl ml-auto -mb-32 relative z-10"
          >
            <VideoPlayer />
          </motion.div>
        </Container>
      </GradientBackground>

      {/* Logo Bar */}
      <div className="bg-white pt-40 pb-12">
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
