"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Eye, Rocket, Shield } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";

const cards = [
  { key: "card1", Icon: Eye },
  { key: "card2", Icon: Rocket },
  { key: "card3", Icon: Shield },
];

export function ShowcaseGrid() {
  const t = useTranslations("showcase");

  return (
    <section className="py-20 sm:py-28">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <SectionHeading title={t("headline")} />
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map(({ key, Icon }, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Card hover className="h-full">
                {/* Preview placeholder */}
                <div className="mb-4 rounded-xl bg-brand-gray-50 p-6 flex items-center justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-card">
                    <Icon className="h-6 w-6 text-brand-gray-900" />
                  </div>
                </div>

                <h3 className="text-lg font-semibold">{t(`${key}Title`)}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {t(`${key}Desc`)}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
