"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { API_REQUEST_EXAMPLE, API_RESPONSE_EXAMPLE } from "@/lib/constants";

export function ApiSection() {
  const t = useTranslations("api");

  return (
    <section id="api" className="py-20 sm:py-28 bg-brand-gray-50">
      <Container>
        <div className="grid gap-12 lg:grid-cols-2 items-start">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="lg:sticky lg:top-32"
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("headline")}
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              {t("description")}
            </p>
            <Button href="#" className="mt-6">
              {t("learnMore")}
            </Button>
          </motion.div>

          {/* Right: Code Blocks */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-4"
          >
            <CodeBlock code={API_REQUEST_EXAMPLE} title="Request" />
            <CodeBlock code={API_RESPONSE_EXAMPLE} title="Response" />
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
