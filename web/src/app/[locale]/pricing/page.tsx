"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Check, ArrowUpRight } from "lucide-react";

export default function PricingPage() {
  const t = useTranslations("pricing");
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const tiers: Array<{
    name: string;
    desc: string;
    monthly: string | null;
    annual: string | null;
    features: string[];
    cta: string;
    popular: boolean;
  }> = [
    {
      name: t("tierStarterName"),
      desc: t("tierStarterDesc"),
      monthly: t("tierStarterPriceMonthly"),
      annual: t("tierStarterPriceAnnual"),
      features: [
        t("tierStarterFeature1"),
        t("tierStarterFeature2"),
        t("tierStarterFeature3"),
        t("tierStarterFeature4"),
        t("tierStarterFeature5"),
        t("tierStarterFeature6"),
      ],
      cta: t("tierStarterCta"),
      popular: false,
    },
    {
      name: t("tierGrowthName"),
      desc: t("tierGrowthDesc"),
      monthly: t("tierGrowthPriceMonthly"),
      annual: t("tierGrowthPriceAnnual"),
      features: [
        t("tierGrowthFeature1"),
        t("tierGrowthFeature2"),
        t("tierGrowthFeature3"),
        t("tierGrowthFeature4"),
        t("tierGrowthFeature5"),
        t("tierGrowthFeature6"),
        t("tierGrowthFeature7"),
        t("tierGrowthFeature8"),
      ],
      cta: t("tierGrowthCta"),
      popular: true,
    },
    {
      name: t("tierScaleName"),
      desc: t("tierScaleDesc"),
      monthly: null,
      annual: null,
      features: [
        t("tierScaleFeature1"),
        t("tierScaleFeature2"),
        t("tierScaleFeature3"),
        t("tierScaleFeature4"),
        t("tierScaleFeature5"),
        t("tierScaleFeature6"),
        t("tierScaleFeature7"),
        t("tierScaleFeature8"),
      ],
      cta: t("tierScaleCta"),
      popular: false,
    },
  ];

  const faq = [
    { q: t("faqQ1"), a: t("faqA1") },
    { q: t("faqQ2"), a: t("faqA2") },
    { q: t("faqQ3"), a: t("faqA3") },
    { q: t("faqQ4"), a: t("faqA4") },
  ];

  return (
    <div className="min-h-screen bg-brand-dark text-white">
      {/* Atmosphere */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-brand-orange/[0.025] blur-[200px]" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44IiBudW1PY3RhdmVzPSI0IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==")`,
            backgroundRepeat: "repeat",
          }}
        />
      </div>

      {/* Nav back */}
      <div className="relative z-10 px-6 py-6">
        <a href="/" className="font-heading text-lg uppercase tracking-tight text-white hover:text-brand-orange transition-colors">
          {t("brand")}
        </a>
      </div>

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 pb-32">
        {/* Header */}
        <div className="max-w-4xl mx-auto text-center pt-16 sm:pt-24 mb-16">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="text-[10px] uppercase tracking-[0.5em] text-brand-orange/60 mb-6">
            {t("eyebrow")}
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
            className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl uppercase tracking-tight leading-[0.95]">
            {t("headline1")}<br />
            <span className="text-brand-orange">{t("headline2")}</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="mt-6 text-sm text-white/30 max-w-md mx-auto">
            {t("subhead")}
          </motion.p>

          {/* Annual/Monthly toggle */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="mt-8 flex items-center justify-center gap-3">
            <span className={`text-xs uppercase tracking-wider ${!annual ? "text-white" : "text-white/25"}`}>{t("billingMonthly")}</span>
            <button onClick={() => setAnnual(!annual)}
              className={`w-12 h-6 rounded-full flex items-center px-0.5 transition-colors ${annual ? "bg-brand-orange" : "bg-white/10"}`}>
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${annual ? "translate-x-6" : "translate-x-0"}`} />
            </button>
            <span className={`text-xs uppercase tracking-wider ${annual ? "text-white" : "text-white/25"}`}>
              {t("billingAnnual")} <span className="text-brand-orange text-[10px]">{t("annualBadge")}</span>
            </span>
          </motion.div>
        </div>

        {/* Tier cards */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
              className={`rounded-xl p-6 sm:p-8 flex flex-col ${
                tier.popular
                  ? "bg-[#111114] border-2 border-brand-orange/30 relative"
                  : "bg-[#0c0c0f] border border-white/[0.06]"
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-orange text-white text-[9px] uppercase tracking-widest px-4 py-1 rounded-full font-medium">
                  {t("mostPopular")}
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-heading text-xl uppercase tracking-tight text-white">{tier.name}</h3>
                <p className="text-xs text-white/25 mt-1">{tier.desc}</p>
              </div>

              <div className="mb-6">
                {tier.monthly ? (
                  <div className="flex items-baseline gap-1">
                    <span className="font-heading text-5xl text-white">{t("currency")}{annual ? tier.annual : tier.monthly}</span>
                    <span className="text-xs text-white/25">{t("perMonth")}</span>
                  </div>
                ) : (
                  <span className="font-heading text-3xl text-white">{t("custom")}</span>
                )}
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-xs text-white/40">
                    <Check className="h-3.5 w-3.5 text-brand-orange shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <a href={tier.monthly ? "#" : "mailto:hello@yappaflow.com"}
                className={`flex items-center justify-center gap-2 py-3.5 rounded-lg text-xs uppercase tracking-widest font-medium transition-colors ${
                  tier.popular
                    ? "bg-brand-orange text-white hover:bg-brand-orange-dark"
                    : "bg-white/[0.04] text-white/60 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white"
                }`}>
                {tier.cta}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </motion.div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-24">
          <h2 className="font-heading text-2xl uppercase tracking-tight text-white text-center mb-10">
            {t("faqHeadline")}
          </h2>
          <div className="space-y-2">
            {faq.map((item, i) => (
              <div key={i} className="border border-white/[0.04] rounded-lg overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-sm text-white/70">{item.q}</span>
                  <span className="text-white/20 text-lg">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4">
                    <p className="text-xs text-white/30 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-2xl mx-auto mt-20 text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/15">
            {t("bottomCta")}
          </p>
        </div>
      </div>
    </div>
  );
}

