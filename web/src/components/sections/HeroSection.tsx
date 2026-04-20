"use client";

import { useRef, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import dynamic from "next/dynamic";

const HeroScene = dynamic(
  () => import("@/components/three/HeroScene").then((m) => ({ default: m.HeroScene })),
  { ssr: false }
);

export function HeroSection() {
  const t = useTranslations("hero");
  const sectionRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const [scrollVal, setScrollVal] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => setScrollVal(v));

  // Mouse tracking
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mousePos.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mousePos.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const textY = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section ref={sectionRef} className="relative min-h-svh flex flex-col bg-brand-dark overflow-hidden">
      {/* Atmospheric space bg — ambient glow + dust */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full bg-brand-orange/[0.03] blur-[200px]" />
        <div className="absolute bottom-[10%] left-[15%] w-[500px] h-[500px] rounded-full bg-brand-orange/[0.02] blur-[160px]" />
        {[12,35,58,81,24,67,43,89,7,52,76,18,63,91,33].map((x, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${x}%`,
              top: `${[28,62,15,74,48,83,37,9,56,71,22,88,41,65,5][i]}%`,
              width: `${1 + (i % 2)}px`,
              height: `${1 + (i % 2)}px`,
              opacity: 0.03,
            }}
            animate={{ opacity: [0.01, 0.06, 0.01], y: [0, -25, 0] }}
            transition={{ duration: 7 + (i % 4) * 2, repeat: Infinity, delay: (i % 5) * 1.5 }}
          />
        ))}
      </div>

      {/* Three.js scene */}
      <div className="absolute inset-0 z-[2]">
        <HeroScene
          mousePos={mousePos}
          scrollProgress={scrollVal}
          className="w-full h-full"
        />
      </div>

      {/* Grain overlay */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC43NSIgbnVtT2N0YXZlcz0iNCIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWx0ZXI9InVybCgjbikiIG9wYWNpdHk9IjEiLz48L3N2Zz4=")`,
          backgroundRepeat: "repeat",
        }}
      />

      {/* Massive text — viewport-filling */}
      <motion.div
        style={{ y: textY, opacity: textOpacity }}
        className="flex-1 flex items-center justify-center relative z-10 pointer-events-none px-4"
      >
        <div className="text-center w-full">
          <motion.h1
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="font-heading uppercase leading-[0.85] tracking-tighter text-white"
            style={{ fontSize: "clamp(3rem, 11vw, 12rem)" }}
          >
            {t("h1Line1")}
          </motion.h1>
          <motion.h1
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="font-heading uppercase leading-[0.85] tracking-tighter"
            style={{ fontSize: "clamp(3rem, 11vw, 12rem)" }}
          >
            <span className="text-white">{t("h1Line2")} </span>
            <span className="text-brand-orange">{t("h1Code")}</span>
          </motion.h1>
        </div>
      </motion.div>

      {/* Bottom info bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        style={{ opacity: textOpacity }}
        className="relative z-10 pb-8 px-4 sm:px-8"
      >
        <div className="flex items-end justify-between max-w-7xl mx-auto">
          <div className="max-w-xs">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/25 mb-2">
              {t("trustedBy")}
            </p>
            <p className="text-xs text-white/40 leading-relaxed">
              {t("description")}
            </p>
          </div>

          <motion.p
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            className="text-[10px] uppercase tracking-[0.4em] text-white/20"
          >
            {t("scroll")}
          </motion.p>
        </div>
      </motion.div>
    </section>
  );
}
