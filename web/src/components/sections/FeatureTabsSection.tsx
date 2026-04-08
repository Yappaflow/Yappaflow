"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Headphones, Code, Rocket } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { TabBar } from "@/components/ui/TabBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const TAB_ICONS = {
  listen: Headphones,
  build: Code,
  ship: Rocket,
} as const;

export function FeatureTabsSection() {
  const t = useTranslations("features");
  const [activeTab, setActiveTab] = useState("listen");

  const tabs = [
    { key: "listen", label: t("listen"), sublabel: t("listenSub") },
    { key: "build", label: t("build"), sublabel: t("buildSub") },
    { key: "ship", label: t("ship"), sublabel: t("shipSub") },
  ];

  const tabContent = {
    listen: { title: t("listenTitle"), desc: t("listenDesc") },
    build: { title: t("buildTitle"), desc: t("buildDesc") },
    ship: { title: t("shipTitle"), desc: t("shipDesc") },
  };

  const content = tabContent[activeTab as keyof typeof tabContent];
  const Icon = TAB_ICONS[activeTab as keyof typeof TAB_ICONS];

  return (
    <section id="features" className="py-20 sm:py-28">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="mt-12 grid gap-8 lg:grid-cols-2 items-center"
          >
            {/* Text */}
            <div>
              <h3 className="text-2xl font-bold sm:text-3xl">{content.title}</h3>
              <p className="mt-4 text-gray-600 leading-relaxed">{content.desc}</p>
              <Button href="#cta" variant="secondary" className="mt-6">
                {t("listenSub")}
              </Button>
            </div>

            {/* Card Preview */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-white to-brand-peach-light/30">
              <div className="flex flex-col items-center justify-center py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gray-100">
                  <Icon className="h-8 w-8 text-brand-gray-900" />
                </div>
                <p className="mt-4 text-sm font-medium text-gray-500">
                  {content.title}
                </p>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </Container>
    </section>
  );
}
