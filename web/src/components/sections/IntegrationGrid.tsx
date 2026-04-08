"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  ShoppingBag,
  Globe,
  Layout,
  Store,
  Globe2,
  Server,
} from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

const categories = ["cms", "hosting", "messaging"] as const;

const integrations = [
  { key: "shopify", Icon: ShoppingBag, category: "cms" },
  { key: "wordpress", Icon: Globe, category: "cms" },
  { key: "webflow", Icon: Layout, category: "cms" },
  { key: "ikas", Icon: Store, category: "cms" },
  { key: "namecheap", Icon: Globe2, category: "hosting" },
  { key: "hostinger", Icon: Server, category: "hosting" },
];

export function IntegrationGrid() {
  const t = useTranslations("integrations");
  const [activeCategory, setActiveCategory] = useState<string>("cms");

  const filtered = integrations.filter(
    (item) => item.category === activeCategory
  );

  return (
    <section id="integrations" className="py-20 sm:py-28">
      <Container>
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {t("headline")}
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              {t("description")}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button key={cat} onClick={() => setActiveCategory(cat)}>
                  <Badge variant={activeCategory === cat ? "active" : "default"}>
                    {t(cat)}
                  </Badge>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Right */}
          <div className="grid grid-cols-2 gap-4">
            {filtered.map(({ key, Icon }, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Card hover className="h-full">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-gray-100">
                      <Icon className="h-5 w-5 text-brand-gray-900" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{t(key)}</h4>
                      <p className="mt-1 text-sm text-gray-500">
                        {t(`${key}Desc`)}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
