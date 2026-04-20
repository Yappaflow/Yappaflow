"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

export function CtaSection() {
  const t = useTranslations("ctaSection");
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "start 30%"] });
  const headingO = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const headingY = useTransform(scrollYProgress, [0, 1], [80, 0]);

  return (
    <section ref={sectionRef} className="relative bg-brand-dark py-32 sm:py-44 overflow-hidden">
      {/* Atmosphere */}
      <div className="absolute inset-0">
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-brand-orange/[0.03] blur-[200px]" />
      </div>

      {/* Grain */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44IiBudW1PY3RhdmVzPSI0IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==")`,
          backgroundRepeat: "repeat",
        }}
      />

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <motion.div style={{ opacity: headingO, y: headingY }}>
          {/* Eyebrow */}
          <p className="text-[10px] uppercase tracking-[0.5em] text-brand-orange/60 mb-8">
            {t("eyebrow")}
          </p>

          {/* Massive headline */}
          <h2 className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl uppercase tracking-tight leading-[0.9] text-white mb-10">
            {t("headline1")}<br />
            <span className="text-brand-orange">{t("headline2")}</span><br />
            {t("headline3")}
          </h2>

          {/* Description */}
          <p className="text-sm sm:text-base text-white/30 max-w-lg leading-relaxed mb-10">
            {t("description")}
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="#"
              className="inline-flex items-center justify-center gap-2 bg-brand-orange text-white text-xs uppercase tracking-widest px-10 py-5 hover:bg-brand-orange-dark transition-colors"
            >
              {t("ctaPrimary")}
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <a
              href="#"
              className="inline-flex items-center justify-center gap-2 border border-white/10 text-white/60 text-xs uppercase tracking-widest px-10 py-5 hover:border-white/25 hover:text-white transition-all"
            >
              {t("ctaSecondary")}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          {/* Trust line */}
          <p className="mt-8 text-[10px] uppercase tracking-widest text-white/15">
            {t("trust")}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
