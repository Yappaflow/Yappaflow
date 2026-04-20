"use client";

import { useRef, useState, Suspense } from "react";
import { useTranslations } from "next-intl";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FaultyTerminal } from "@/components/ui/FaultyTerminal";

/* ── Manifesto Data ── */

const MANIFESTO_ACCENTS = [true, false, true, false, true, false, true, false, false, true, false, true];

/* ── Manifesto Line ── */

function ManifestoLine({ text, accent }: { text: string; accent: boolean }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 90%", "start 40%"] });
  const opacity = useTransform(scrollYProgress, [0, 1], [0.1, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const color = useTransform(scrollYProgress, [0, 0.5, 1], accent
    ? ["rgba(255,107,53,0.1)", "rgba(255,107,53,0.5)", "#FF6B35"]
    : ["rgba(255,255,255,0.1)", "rgba(255,255,255,0.5)", "#ffffff"]
  );
  return (
    <motion.p ref={ref} style={{ opacity, y, color }}
      className="font-heading uppercase tracking-tight leading-[1.1] text-[clamp(1.6rem,4vw,4rem)]">
      {text}
    </motion.p>
  );
}

/* ── Exploding Cube (Three.js) ── */

const FRAG_COUNT = 27;

function ExplodingCubeScene({ progress }: { progress: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const fragsRef = useRef<THREE.Mesh[]>([]);

  const grid = useRef(
    Array.from({ length: FRAG_COUNT }, (_, i) => {
      const x = (i % 3) - 1, y = (Math.floor(i / 3) % 3) - 1, z = Math.floor(i / 9) - 1;
      return {
        gx: x * 0.35, gy: y * 0.35, gz: z * 0.35,
        ex: (x + (Math.random() - 0.5)) * 7,
        ey: (y + (Math.random() - 0.5)) * 7,
        ez: (z + (Math.random() - 0.5)) * 7,
        rx: (Math.random() - 0.5) * Math.PI * 5,
        ry: (Math.random() - 0.5) * Math.PI * 5,
      };
    })
  ).current;

  // Fragment 13 (center) is the one we zoom into
  const ZOOM_IDX = 13;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    // Phase 1 (0-0.3): Cube rotates intact
    // Phase 2 (0.3-0.6): Explosion
    // Phase 3 (0.6-1.0): Zoom into center fragment

    const preExplode = progress < 0.3;
    if (preExplode) {
      groupRef.current.rotation.y = t * 0.4;
      groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.2;
    }

    const explodeT = Math.max(0, Math.min(1, (progress - 0.3) / 0.3));
    const eased = explodeT * explodeT;

    // Zoom phase: camera zooms toward fragment 13
    const zoomT = Math.max(0, Math.min(1, (progress - 0.6) / 0.35));

    fragsRef.current.forEach((mesh, i) => {
      if (!mesh) return;
      const f = grid[i];

      if (i === ZOOM_IDX && zoomT > 0) {
        // Center fragment stays, scales up to fill view
        const s = 1 + zoomT * 12;
        mesh.scale.setScalar(s);
        mesh.position.set(0, 0, zoomT * 2);
        mesh.rotation.set(0, 0, 0);
        const mat = mesh.material as THREE.MeshStandardMaterial;
        // Shift from orange to cream as it fills screen
        const cr = THREE.MathUtils.lerp(1, 1, zoomT);
        const cg = THREE.MathUtils.lerp(0.42, 0.97, zoomT);
        const cb = THREE.MathUtils.lerp(0.21, 0.95, zoomT);
        mat.color.setRGB(cr, cg, cb);
        mat.emissiveIntensity = THREE.MathUtils.lerp(0.3, 0, zoomT);
        mat.opacity = 1;
      } else {
        // Explode
        mesh.position.x = THREE.MathUtils.lerp(f.gx, f.ex, eased);
        mesh.position.y = THREE.MathUtils.lerp(f.gy, f.ey, eased);
        mesh.position.z = THREE.MathUtils.lerp(f.gz, f.ez, eased);
        mesh.rotation.x = f.rx * eased;
        mesh.rotation.y = f.ry * eased;
        mesh.scale.setScalar(1);
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = Math.max(0, 1 - eased * 1.8 - zoomT * 2);
      }
    });
  });

  return (
    <group ref={groupRef}>
      {grid.map((_, i) => (
        <mesh key={i} ref={(el) => { if (el) fragsRef.current[i] = el; }}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial
            color="#FF6B35"
            emissive="#FF6B35"
            emissiveIntensity={0.3}
            metalness={0.7}
            roughness={0.3}
            transparent
            opacity={1}
          />
        </mesh>
      ))}
      {/* Wireframe outline */}
      <mesh scale={[1.08, 1.08, 1.08]}>
        <boxGeometry args={[1.05, 1.05, 1.05]} />
        <meshBasicMaterial color="#FF6B35" wireframe transparent
          opacity={Math.max(0, 0.15 * (1 - progress * 2.5))} />
      </mesh>
    </group>
  );
}

/* ── Deployment Process (appears from the zoomed cube) ── */

function DeploymentProcess({ progress }: { progress: number }) {
  const t = useTranslations("manifesto");
  if (progress <= 0) return null;

  const steps = [
    { label: t("stepAnalyzing"),  pct: 100 },
    { label: t("stepGenerating"), pct: 100 },
    { label: t("stepBuilding"),   pct: 100 },
    { label: t("stepDns"),        pct: 100 },
    { label: t("stepSsl"),        pct: Math.min(100, progress * 300) },
    { label: t("stepCdn"),        pct: Math.min(100, Math.max(0, (progress - 0.3) * 300)) },
    { label: t("stepHealth"),     pct: Math.min(100, Math.max(0, (progress - 0.5) * 400)) },
  ];

  const isLive = progress > 0.85;

  return (
    <motion.div
      style={{ opacity: progress }}
      className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
    >
      <div className="w-full max-w-2xl mx-4 bg-[#0c0c0f] rounded-xl overflow-hidden shadow-2xl border border-white/[0.06]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
              <div className="w-2 h-2 rounded-full bg-[#febc2e]" />
              <div className="w-2 h-2 rounded-full bg-[#28c840]" />
            </div>
            <span className="text-[10px] text-white/20 font-mono ml-2">{t("deployCmd")}</span>
          </div>
          {isLive && (
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-green-400 uppercase tracking-wider font-medium">{t("live")}</span>
            </div>
          )}
        </div>

        {/* Terminal-style deploy log */}
        <div className="p-5 font-mono text-xs space-y-3">
          {steps.map((step, i) => {
            const visible = progress > i * 0.1;
            const done = step.pct >= 100;
            return visible ? (
              <div key={step.label} className="flex items-center gap-3">
                <span className={`shrink-0 ${done ? "text-green-400" : "text-brand-orange"}`}>
                  {done ? "✓" : "›"}
                </span>
                <span className={`flex-1 ${done ? "text-white/40" : "text-white/70"}`}>
                  {step.label}
                </span>
                {!done && step.pct > 0 && (
                  <div className="w-16 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full bg-brand-orange rounded-full" style={{ width: `${step.pct}%` }} />
                  </div>
                )}
              </div>
            ) : null;
          })}

          {/* Final output */}
          {isLive && (
            <div className="mt-4 pt-3 border-t border-white/[0.05] space-y-1.5">
              <div className="text-green-400">
                <span className="text-white/30">{t("deployCompletePrompt")}</span>
                {t("deployComplete")}
              </div>
              <div className="text-white/30">
                <span className="text-white/15">{t("arrow")}</span>
                {t("deployUrl")}
              </div>
              <div className="text-white/30">
                <span className="text-white/15">{t("arrow")}</span>
                {t("meta")}
              </div>
              <div className="text-white/20 mt-2">
                {t("totalTime")}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Zoom Transition Section ── */

function ZoomTransition() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [prog, setProg] = useState(0);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => setProg(v));

  // Deploy process fades in as cube zooms
  const deployProgress = prog > 0.65 ? Math.min(1, (prog - 0.65) / 0.3) : 0;

  // Terminal bg fades, scene bg transitions to cream
  const terminalOpacity = useTransform(scrollYProgress, [0.7, 0.9], [1, 0]);
  const darkBgFade = useTransform(scrollYProgress, [0.75, 0.95], [1, 0]);

  return (
    <div ref={containerRef} className="relative" style={{ height: "400vh" }}>
      {/* Cream bg underneath */}
      <div className="absolute inset-0" style={{ background: "#FFF8F2" }} />

      {/* Black bg */}
      <motion.div className="absolute inset-0 bg-black z-[1]" style={{ opacity: darkBgFade }} />

      {/* Faulty Terminal background */}
      <motion.div className="absolute inset-0 z-[2]" style={{ opacity: terminalOpacity }}>
        <FaultyTerminal color="#FF6B35" scanlineOpacity={0.06} glitchIntensity={0.4} />
      </motion.div>

      {/* Sticky viewport */}
      <div className="sticky top-0 h-screen overflow-hidden z-10">
        {/* 3D Exploding cube */}
        <div className="absolute inset-0 z-[5]">
          <Canvas
            dpr={[1, 1.5]}
            camera={{ position: [0, 0, 4], fov: 50 }}
            gl={{ antialias: true, alpha: true }}
            style={{ background: "transparent" }}
          >
            <Suspense fallback={null}>
              <ambientLight intensity={0.4} />
              <directionalLight position={[3, 5, 4]} intensity={0.7} />
              <pointLight position={[-2, -1, 3]} intensity={0.4} color="#FF6B35" />
              <ExplodingCubeScene progress={prog} />
            </Suspense>
          </Canvas>
        </div>

        {/* Deploy process fades in as cube zooms */}
        <DeploymentProcess progress={deployProgress} />
      </div>
    </div>
  );
}

/* ── Main Export ── */

export function ManifestoSection() {
  const t = useTranslations("manifesto");
  const lines = MANIFESTO_ACCENTS.map((accent, i) => ({
    text: t(`line${i + 1}` as
      | "line1" | "line2" | "line3" | "line4" | "line5" | "line6"
      | "line7" | "line8" | "line9" | "line10" | "line11" | "line12"),
    accent,
  }));
  return (
    <>
      {/* Part 1: Manifesto text */}
      <div className="relative bg-brand-dark">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[30%] left-[20%] w-[900px] h-[600px] rounded-full bg-brand-orange/[0.02] blur-[200px]" />
        </div>
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-[1]"
          style={{
            backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44IiBudW1PY3RhdmVzPSI0IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==")`,
            backgroundRepeat: "repeat",
          }}
        />
        <div className="relative z-10 px-6 sm:px-10 lg:px-16 py-32 sm:py-40">
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 0.6 }} viewport={{ once: true }}
            className="text-[10px] uppercase tracking-[0.5em] text-brand-orange mb-10">
            {t("eyebrow")}
          </motion.p>
          <div className="space-y-1">
            {lines.map((line, i) => (
              <ManifestoLine key={i} text={line.text} accent={line.accent} />
            ))}
          </div>
        </div>
      </div>

      {/* Part 2: Exploding cube on terminal bg → zooms into website */}
      <ZoomTransition />
    </>
  );
}
