"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { Button } from "@/components/ui/Button";

export function CtaSection() {
  const t = useTranslations("cta");

  return (
    <section id="cta">
      <GradientBackground variant="cool" className="py-20 sm:py-28">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="grid gap-12 lg:grid-cols-2 items-center"
          >
            {/* Left */}
            <div>
              <p className="text-sm font-medium text-white/60 uppercase tracking-wider mb-2">
                10 Minutes. Your Content. Live Results.
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                {t("headline")}
              </h2>
              <p className="mt-4 text-white/70 leading-relaxed">
                {t("description")}
              </p>

              {/* Email Form */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  className="flex-1 rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <Button className="bg-white text-brand-black hover:bg-gray-100" size="lg">
                  {t("getDemo")}
                </Button>
              </div>

              <div className="mt-3">
                <Button
                  variant="ghost"
                  className="text-white/70 hover:text-white hover:bg-white/10"
                  size="sm"
                >
                  {t("watchDemo")}
                </Button>
              </div>
            </div>

            {/* Right: Testimonial */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <blockquote className="text-lg text-white/90 italic leading-relaxed">
                {t("testimonial")}
              </blockquote>
              <div className="mt-4">
                <p className="text-sm font-semibold text-white">
                  {t("testimonialAuthor")}
                </p>
                <p className="text-sm text-white/60">{t("testimonialCompany")}</p>
              </div>
            </motion.div>
          </motion.div>
        </Container>
      </GradientBackground>
    </section>
  );
}
