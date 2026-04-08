"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ShieldCheck, Lock, FileCheck } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

const badges = [
  { label: "SOC 2", sublabel: "Type II", Icon: ShieldCheck },
  { label: "ISO", sublabel: "27001", Icon: Lock },
  { label: "GDPR", sublabel: "Compliant", Icon: FileCheck },
];

export function TrustBadgesSection() {
  const t = useTranslations("trust");

  return (
    <section className="py-20 sm:py-28">
      <Container className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          {/* Badges */}
          <div className="flex items-center justify-center gap-6 sm:gap-10 mb-8">
            {badges.map(({ label, sublabel, Icon }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex flex-col items-center"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-purple text-white">
                  <Icon className="h-8 w-8" />
                </div>
                <span className="mt-2 text-sm font-bold">{label}</span>
                <span className="text-xs text-gray-500">{sublabel}</span>
              </motion.div>
            ))}
          </div>

          <h2 className="text-xl font-semibold sm:text-2xl">{t("headline")}</h2>
          <p className="mt-2 text-gray-500 max-w-md mx-auto">{t("description")}</p>

          <Button href="#" variant="secondary" className="mt-6">
            {t("viewTrustCenter")}
          </Button>
        </motion.div>
      </Container>
    </section>
  );
}
