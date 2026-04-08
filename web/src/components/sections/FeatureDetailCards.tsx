"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Instagram,
  ShoppingBag,
  Globe,
  Layout,
  Store,
  Server,
  Globe2,
} from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const integrations = [
  { name: "WhatsApp", Icon: MessageCircle },
  { name: "Instagram", Icon: Instagram },
  { name: "Shopify", Icon: ShoppingBag },
  { name: "WordPress", Icon: Globe },
  { name: "Webflow", Icon: Layout },
  { name: "IKAS", Icon: Store },
  { name: "Namecheap", Icon: Globe2 },
  { name: "Hostinger", Icon: Server },
];

export function FeatureDetailCards() {
  const t = useTranslations("detail");

  return (
    <section className="py-20 sm:py-28 bg-brand-gray-50">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            {/* Left: Text */}
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl italic">
                {t("headline")}
              </h2>
              <p className="mt-4 text-gray-600 leading-relaxed">
                {t("description")}
              </p>
              <Button href="#cta" className="mt-6">
                {t("learnMore")}
              </Button>
            </div>

            {/* Right: Integration Grid */}
            <Card className="p-8">
              <div className="grid grid-cols-4 gap-4">
                {integrations.map(({ name, Icon }, i) => (
                  <motion.div
                    key={name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-brand-gray-50 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-gray-100">
                      <Icon className="h-5 w-5 text-brand-gray-900" />
                    </div>
                    <span className="text-xs font-medium text-gray-500">{name}</span>
                  </motion.div>
                ))}
              </div>
            </Card>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
