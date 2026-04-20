"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { motion, useScroll, useTransform } from "framer-motion";
import { Play } from "lucide-react";

function AnimatedLine({ scrollYProgress, text, start, isOrange }: {
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
  text: string;
  start: number;
  isOrange?: boolean;
}) {
  const color = useTransform(
    scrollYProgress,
    [start, start + 0.15, start + 0.35],
    isOrange
      ? ["rgba(255,107,53,0.06)", "rgba(255,107,53,0.4)", "#FF6B35"]
      : ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.4)", "#ffffff"]
  );
  return <motion.span style={{ color }}>{text}</motion.span>;
}

export function VideoSection() {
  const t = useTranslations("videoSection");
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const videoY = useTransform(scrollYProgress, [0, 0.5, 1], ["40%", "10%", "0%"]);
  const videoScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.65, 0.85, 1]);
  const videoRadius = useTransform(scrollYProgress, [0, 0.7, 1], [20, 8, 0]);
  const videoHeight = useTransform(scrollYProgress, [0, 0.5, 1], ["50%", "75%", "100%"]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.05, 0.4, 0.65], [0, 1, 1, 0]);
  const scrubWidth = useTransform(scrollYProgress, [0.15, 0.9], ["0%", "40%"]);
  const playOpacity = useTransform(scrollYProgress, [0.7, 0.9], [1, 0]);

  return (
    <div ref={containerRef} className="relative bg-brand-dark" style={{ height: "300vh" }}>
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-[1]"
        style={{
          backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44IiBudW1PY3RhdmVzPSI0IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==")`,
          backgroundRepeat: "repeat",
        }}
      />

      <div className="sticky top-0 h-screen overflow-hidden z-10">
        {/* Heading */}
        <motion.div style={{ opacity: textOpacity }} className="absolute top-8 sm:top-12 left-0 right-0 px-4 sm:px-6 z-20">
          <h2 className="font-heading text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl uppercase tracking-tight leading-[1.0]">
            <AnimatedLine scrollYProgress={scrollYProgress} text={t("line1")} start={0} />
            <br />
            <AnimatedLine scrollYProgress={scrollYProgress} text={t("line2")} start={0.04} />
            <br />
            <AnimatedLine scrollYProgress={scrollYProgress} text={t("line3")} start={0.08} />
            <br />
            <AnimatedLine scrollYProgress={scrollYProgress} text={t("line4")} start={0.12} />
            <br />
            <AnimatedLine scrollYProgress={scrollYProgress} text={t("line5")} start={0.16} />
            <AnimatedLine scrollYProgress={scrollYProgress} text={t("line6")} start={0.16} isOrange />
          </h2>
        </motion.div>

        {/* Video */}
        <motion.div
          style={{ y: videoY, scale: videoScale, borderRadius: videoRadius, height: videoHeight }}
          className="absolute bottom-0 left-0 right-0 overflow-hidden"
        >
          <div className="w-full h-full bg-[#111114] relative">
            <div className="absolute top-0 left-0 right-0 h-7 bg-black/70 z-10 flex items-center justify-between px-4">
              <span className="text-[9px] text-white/30 font-mono">{t("timecode")}</span>
              <div className="flex items-center gap-3">
                <span className="text-[9px] text-white/25 font-mono">{t("format")}</span>
                <span className="text-[9px] text-white/15 font-mono">{t("resolution")}</span>
              </div>
            </div>
            <div className="absolute top-7 left-0 right-0 h-[2px] bg-white/10 z-10">
              <motion.div style={{ width: scrubWidth }} className="h-full bg-brand-orange" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-b from-[#111114] via-[#1a1218] to-[#111114]" />
              <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-brand-orange/[0.06] blur-[100px]" />
              <motion.div style={{ opacity: playOpacity }} className="relative z-10 flex flex-col items-center gap-3">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/[0.06] backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-white/[0.1] transition-colors group">
                  <Play className="h-6 w-6 sm:h-7 sm:w-7 text-white/80 ml-1 group-hover:text-white transition-colors" fill="currentColor" />
                </div>
                <span className="text-[9px] uppercase tracking-[0.3em] text-white/20">{t("watchDemo")}</span>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
