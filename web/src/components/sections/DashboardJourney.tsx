"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { MessageCircle, Code, Rocket, Settings, Zap, Check, Globe, ExternalLink } from "lucide-react";

/* ─── Static icon map — labels come from i18n at render ─── */

const SIDEBAR_ICONS = [Zap, MessageCircle, Code, Rocket, Settings];
const SIDEBAR_KEYS = [
  "sidebarCommand",
  "sidebarSignals",
  "sidebarEngine",
  "sidebarDeploy",
  "sidebarIntegrations",
] as const;

const CODE_STRING = `import { Store } from '@yappaflow/core'
import { Payment } from '@yappaflow/pay'

export default function App() {
  return (
    <Store platform="shopify" locale="tr">
      <Header />
      <ProductGrid columns={3} />
      <CartSidebar />
      <Payment provider="iyzico" />
      <Footer />
    </Store>
  )
}`;

/* ─── Phase Content ─── */

function ListenContent({ progress }: { progress: MotionValue<number> }) {
  const t = useTranslations("dashboardJourney");
  const ahmet = t("chatSenderAhmet");
  const you = t("chatSenderYou");
  const chatMessages = [
    { sender: ahmet, text: t("chat1Text"), time: t("chat1Time") },
    { sender: you,   text: t("chat2Text"), time: t("chat2Time") },
    { sender: ahmet, text: t("chat3Text"), time: t("chat3Time") },
    { sender: ahmet, text: t("chat4Text"), time: t("chat4Time") },
    { sender: you,   text: t("chat5Text"), time: t("chat5Time") },
  ];
  const extractions = [
    t("extract1"), t("extract2"), t("extract3"),
    t("extract4"), t("extract5"), t("extract6"),
  ];

  return (
    <div className="p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[10px] text-white/30 uppercase tracking-wider">{t("listeningHeader")}</span>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left: Client conversation (AI is silently listening) */}
        <div className="flex-1 space-y-2">
          {chatMessages.map((msg, i) => (
            <motion.div
              key={i}
              style={{ opacity: useTransform(progress, [0.02 + i * 0.06, 0.08 + i * 0.06], [0, 1]) }}
            >
              <div className="bg-white/[0.03] rounded-xl px-3.5 py-2.5">
                <p className="text-[9px] text-white/20 mb-0.5">{msg.sender} · {msg.time}</p>
                <p className="text-[11px] leading-relaxed text-white/50">{msg.text}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Right: AI silently extracting requirements */}
        <div className="w-44 shrink-0 hidden sm:block">
          <div className="flex items-center gap-1.5 mb-3">
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="h-1.5 w-1.5 rounded-full bg-brand-orange"
            />
            <span className="text-[9px] text-brand-orange uppercase tracking-wider">{t("aiExtracting")}</span>
          </div>
          <div className="space-y-1.5">
            {extractions.map((item, i) => (
              <motion.div
                key={i}
                style={{ opacity: useTransform(progress, [0.15 + i * 0.08, 0.22 + i * 0.08], [0, 1]) }}
                className="flex items-center gap-2 text-[10px]"
              >
                <span className="text-green-400 shrink-0">✓</span>
                <span className="text-white/40">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BuildContent({ progress }: { progress: MotionValue<number> }) {
  const t = useTranslations("dashboardJourney");
  const charCount = useTransform(progress, [0, 0.9], [0, CODE_STRING.length]);

  return (
    <div className="p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Code className="h-3.5 w-3.5 text-brand-orange" />
          <span className="text-[10px] text-white/30 uppercase tracking-wider">{t("generating")}</span>
        </div>
      </div>
      <div className="flex-1 bg-[#08080a] rounded-lg p-4 overflow-hidden font-mono text-[11px] leading-relaxed">
        <motion.span className="text-white/60 whitespace-pre-wrap">
          {CODE_STRING.split("").map((char, i) => (
            <motion.span
              key={i}
              style={{ opacity: useTransform(charCount, (v) => (i < v ? 1 : 0)) }}
            >
              {char}
            </motion.span>
          ))}
        </motion.span>
        <motion.span
          className="inline-block w-[2px] h-3.5 bg-brand-orange ml-0.5 align-middle"
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 0.6 }}
        />
      </div>
    </div>
  );
}

function ShipContent({ progress }: { progress: MotionValue<number> }) {
  const t = useTranslations("dashboardJourney");
  const barWidth = useTransform(progress, [0, 0.7], [0, 100]);
  const deploySteps = [
    t("deployStep1"),
    t("deployStep2"),
    t("deployStep3"),
    t("deployStep4"),
  ];

  return (
    <div className="p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Rocket className="h-3.5 w-3.5 text-brand-orange" />
          <span className="text-[10px] text-white/30 uppercase tracking-wider">{t("deploying")}</span>
        </div>
        <motion.div
          style={{ opacity: useTransform(progress, [0.8, 0.9], [0, 1]) }}
          className="flex items-center gap-1.5"
        >
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-green-400 font-medium uppercase tracking-wider">{t("live")}</span>
        </motion.div>
      </div>

      <div className="mb-5">
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            style={{ width: useTransform(barWidth, (v) => `${v}%`) }}
            className="h-full bg-brand-orange rounded-full"
          />
        </div>
      </div>

      <div className="space-y-3 flex-1">
        {deploySteps.map((step, i) => (
          <motion.div
            key={step}
            style={{ opacity: useTransform(progress, [0.1 + i * 0.15, 0.2 + i * 0.15], [0, 1]) }}
            className="flex items-center gap-3"
          >
            <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
              <Check className="h-2.5 w-2.5 text-green-400" />
            </div>
            <span className="text-xs text-white/50">{step}</span>
          </motion.div>
        ))}
      </div>

      <motion.div
        style={{ opacity: useTransform(progress, [0.8, 0.9], [0, 1]) }}
        className="mt-4 p-3 rounded-lg border border-green-500/10 bg-green-500/[0.03] flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-green-400" />
          <span className="text-xs text-white/70">{t("liveDomain")}</span>
        </div>
        <ExternalLink className="h-3 w-3 text-white/20" />
      </motion.div>
    </div>
  );
}

/* ─── Main: Single Dashboard that scales in → then transforms ─── */

export function DashboardJourney() {
  const t = useTranslations("dashboardJourney");
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });
  const sidebarItems = SIDEBAR_ICONS.map((Icon, i) => ({
    icon: Icon,
    label: t(SIDEBAR_KEYS[i]),
  }));

  // PHASE 0 (0-0.10): Dashboard scales in — fast
  const scale = useTransform(scrollYProgress, [0, 0.05, 0.10], [0.45, 0.75, 1]);
  const rotateX = useTransform(scrollYProgress, [0, 0.07, 0.10], [14, 4, 0]);
  const dashY = useTransform(scrollYProgress, [0, 0.05, 0.10], [300, 80, 0]);
  const dashOpacity = useTransform(scrollYProgress, [0, 0.03, 0.08], [0, 0.7, 1]);

  // PHASE 1 (0.10-0.37): Listen — gets ~27%
  const p1 = useTransform(scrollYProgress, [0.10, 0.37], [0, 1]);
  const o1 = useTransform(scrollYProgress, [0.08, 0.12, 0.33, 0.38], [0, 1, 1, 0]);

  // PHASE 2 (0.37-0.64): Build — gets ~27%
  const p2 = useTransform(scrollYProgress, [0.37, 0.64], [0, 1]);
  const o2 = useTransform(scrollYProgress, [0.35, 0.40, 0.60, 0.66], [0, 1, 1, 0]);

  // PHASE 3 (0.64-1.0): Ship — gets ~36% (more time to see deploy)
  const p3 = useTransform(scrollYProgress, [0.64, 1.0], [0, 1]);
  const o3 = useTransform(scrollYProgress, [0.62, 0.68, 0.92, 1], [0, 1, 1, 1]);

  // Active sidebar index: 1=Signals, 2=Engine, 3=Deploy — matches content phases
  const activeIdx = useTransform(scrollYProgress, (v) =>
    v < 0.37 ? 1 : v < 0.64 ? 2 : 3
  );

  return (
    <div ref={containerRef} className="relative bg-brand-dark" style={{ height: "900vh" }}>
      {/* ═══ Tenbin-style atmospheric background ═══ */}

      {/* Deep ambient glow — warm orange center fading to dark edges */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[1200px] h-[800px] rounded-full bg-brand-orange/[0.03] blur-[200px]" />
        <div className="absolute bottom-[20%] left-[20%] w-[600px] h-[600px] rounded-full bg-brand-orange/[0.02] blur-[180px]" />
        <div className="absolute top-[60%] right-[10%] w-[400px] h-[400px] rounded-full bg-white/[0.01] blur-[150px]" />
      </div>

      {/* Grain/noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none z-[1]"
        style={{
          backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44IiBudW1PY3RhdmVzPSI0IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==")`,
          backgroundRepeat: "repeat",
        }}
      />

      {/* Floating dust particles — small, drifting upward slowly */}
      <div className="absolute inset-0 overflow-hidden z-[2]">
        {[
          {x:8,y:15,s:1},{x:22,y:45,s:2},{x:37,y:72,s:1},{x:52,y:28,s:1.5},{x:67,y:88,s:1},
          {x:78,y:35,s:2},{x:91,y:62,s:1},{x:14,y:83,s:1.5},{x:44,y:12,s:1},{x:63,y:55,s:2},
          {x:85,y:78,s:1},{x:31,y:92,s:1.5},{x:56,y:8,s:1},{x:73,y:48,s:2},{x:18,y:67,s:1},
          {x:42,y:38,s:1.5},{x:88,y:22,s:1},{x:5,y:52,s:2},{x:69,y:95,s:1},{x:35,y:18,s:1.5},
          {x:95,y:45,s:1},{x:27,y:75,s:2},{x:48,y:58,s:1},{x:82,y:10,s:1.5},{x:11,y:30,s:1},
        ].map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.s}px`,
              height: `${p.s}px`,
              opacity: 0.03,
            }}
            animate={{
              y: [0, -40 - (i % 5) * 10, 0],
              opacity: [0.02, 0.08, 0.02],
              x: [0, (i % 2 === 0 ? 8 : -8), 0],
            }}
            transition={{
              duration: 8 + (i % 5) * 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: (i % 8) * 1.2,
            }}
          />
        ))}

        {/* Larger faint orbs — like the Tenbin floating debris */}
        {[
          {x:20,y:25,s:80},{x:70,y:60,s:60},{x:45,y:80,s:100},{x:85,y:20,s:50},
        ].map((p, i) => (
          <motion.div
            key={`orb-${i}`}
            className="absolute rounded-full border border-white/[0.02]"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.s}px`,
              height: `${p.s}px`,
            }}
            animate={{
              y: [0, -15, 0],
              rotate: [0, 180, 360],
              opacity: [0.01, 0.03, 0.01],
            }}
            transition={{
              duration: 20 + i * 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 3,
            }}
          />
        ))}
      </div>

      {/* Phase label */}
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden px-4 z-10">
        <div className="absolute top-6 left-6 sm:left-10 z-20">
          <div className="relative h-6">
            <motion.p style={{ opacity: useTransform(scrollYProgress, (v) => v < 0.15 ? 1 : 0) }}
              className="absolute font-heading text-sm uppercase tracking-wider text-white/40">
              {t("eyebrow")}
            </motion.p>
            <motion.p style={{ opacity: o1 }} className="absolute font-heading text-sm uppercase tracking-wider text-white/60">
              {t("phase1")}
            </motion.p>
            <motion.p style={{ opacity: o2 }} className="absolute font-heading text-sm uppercase tracking-wider text-white/60">
              {t("phase2")}
            </motion.p>
            <motion.p style={{ opacity: o3 }} className="absolute font-heading text-sm uppercase tracking-wider text-white/60">
              {t("phase3")}
            </motion.p>
          </div>
          <div className="mt-2 w-20 h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div
              style={{ scaleX: scrollYProgress, transformOrigin: "left" }}
              className="h-full bg-brand-orange"
            />
          </div>
        </div>

        {/* Single dashboard */}
        <div className="perspective-1200 w-full max-w-5xl">
          <motion.div
            style={{
              scale,
              rotateX,
              y: dashY,
              opacity: dashOpacity,
              transformStyle: "preserve-3d",
            }}
            className="w-full"
          >
            <div className="bg-[#0c0c0f] border border-white/[0.06] rounded-xl overflow-hidden shadow-2xl shadow-black/80">
              {/* Title bar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05] bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                  </div>
                  <span className="text-[10px] text-white/20 font-mono">app.yappaflow.com</span>
                </div>
                <span className="text-[10px] text-white/15 font-heading uppercase tracking-wider">Yappaflow</span>
              </div>

              <div className="flex min-h-[400px] sm:min-h-[480px]">
                {/* Sidebar — persistent, active changes */}
                <div className="w-44 border-r border-white/[0.05] p-3 hidden sm:block shrink-0">
                  <div className="space-y-0.5">
                    {sidebarItems.map((item, i) => (
                      <motion.div
                        key={item.label}
                        style={{
                          backgroundColor: useTransform(activeIdx, (v) =>
                            Math.round(v as number) === i ? "rgba(255,107,53,0.1)" : "transparent"
                          ),
                          color: useTransform(activeIdx, (v) =>
                            Math.round(v as number) === i ? "#FF6B35" : "rgba(255,255,255,0.25)"
                          ),
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px]"
                      >
                        <item.icon className="h-3.5 w-3.5" />
                        <span>{item.label}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Content — phases crossfade */}
                <div className="flex-1 relative">
                  <motion.div style={{ opacity: o1 }} className="absolute inset-0">
                    <ListenContent progress={p1} />
                  </motion.div>
                  <motion.div style={{ opacity: o2 }} className="absolute inset-0">
                    <BuildContent progress={p2} />
                  </motion.div>
                  <motion.div style={{ opacity: o3 }} className="absolute inset-0">
                    <ShipContent progress={p3} />
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
