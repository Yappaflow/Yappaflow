"use client";

import { useRef, useEffect, useCallback } from "react";

const RESOLUTION = 0.5; // render at 50% for perf, scaled up via CSS
const DAMPING = 0.988;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// Pre-build gradient LUT (orange → peach)
function buildGradientLUT(w: number, h: number): Uint8Array {
  const lut = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = Math.max(0, Math.min(1, (x / w) * 0.55 + (y / h) * 0.45));
      const i = (y * w + x) * 3;
      lut[i]     = Math.round(lerp(249, 253, t)); // r
      lut[i + 1] = Math.round(lerp(115, 186, t)); // g
      lut[i + 2] = Math.round(lerp(22,  116, t)); // b
    }
  }
  return lut;
}

export function WaterCanvas({ className }: { className?: string }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const buf1       = useRef<Float32Array | null>(null);
  const buf2       = useRef<Float32Array | null>(null);
  const lut        = useRef<Uint8Array | null>(null);
  const imgData    = useRef<ImageData | null>(null);
  const rafRef     = useRef<number>(0);
  const W          = useRef(0);
  const H          = useRef(0);

  const addRipple = useCallback((cx: number, cy: number, strength = 180) => {
    const b = buf1.current;
    const w = W.current;
    const h = H.current;
    if (!b) return;
    const r = 7;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r) {
          const px = cx + dx;
          const py = cy + dy;
          if (px >= 1 && px < w - 1 && py >= 1 && py < h - 1) {
            b[py * w + px] += strength;
          }
        }
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const init = () => {
      const pw = Math.max(1, Math.floor(canvas.offsetWidth  * RESOLUTION));
      const ph = Math.max(1, Math.floor(canvas.offsetHeight * RESOLUTION));
      if (pw === W.current && ph === H.current) return;
      canvas.width  = pw;
      canvas.height = ph;
      W.current     = pw;
      H.current     = ph;
      buf1.current  = new Float32Array(pw * ph);
      buf2.current  = new Float32Array(pw * ph);
      lut.current   = buildGradientLUT(pw, ph);
      imgData.current = ctx.createImageData(pw, ph);
    };
    init();

    const tick = () => {
      const b1 = buf1.current;
      const b2 = buf2.current;
      const gl = lut.current;
      const img = imgData.current;
      if (!b1 || !b2 || !gl || !img) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const w = W.current;
      const h = H.current;
      const d = img.data;

      // Wave equation
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          b2[i] = ((b1[i - 1] + b1[i + 1] + b1[i - w] + b1[i + w]) / 2 - b2[i]) * DAMPING;
        }
      }

      // Swap
      const tmp  = buf1.current;
      buf1.current = buf2.current;
      buf2.current = tmp;
      const cur  = buf1.current!;

      // Render with refraction + specular
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i  = y * w + x;
          const gx = (cur[i + 1] - cur[i - 1]) * 0.35;
          const gy = (cur[i + w] - cur[i - w]) * 0.35;

          const sx = Math.max(1, Math.min(w - 2, x + Math.round(gx)));
          const sy = Math.max(1, Math.min(h - 2, y + Math.round(gy)));

          const li = (sy * w + sx) * 3;
          const spec = Math.max(0, gx - gy) * 2.2;

          const pi  = i * 4;
          d[pi]     = Math.min(255, gl[li]     + spec);
          d[pi + 1] = Math.min(255, gl[li + 1] + spec * 0.55);
          d[pi + 2] = Math.min(255, gl[li + 2] + spec * 0.25);
          d[pi + 3] = 255;
        }
      }

      ctx.putImageData(img, 0, 0);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    // Mouse / touch ripples
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      addRipple(
        Math.floor((e.clientX - rect.left)  * RESOLUTION),
        Math.floor((e.clientY - rect.top)   * RESOLUTION),
        140
      );
    };
    const onTouch = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      for (const t of Array.from(e.touches)) {
        addRipple(
          Math.floor((t.clientX - rect.left) * RESOLUTION),
          Math.floor((t.clientY - rect.top)  * RESOLUTION),
          200
        );
      }
    };

    // Ambient drips
    const drip = setInterval(() => {
      const w = W.current;
      const h = H.current;
      if (w > 0 && h > 0) {
        addRipple(
          Math.floor(Math.random() * (w - 2) + 1),
          Math.floor(Math.random() * (h - 2) + 1),
          70
        );
      }
    }, 1800);

    window.addEventListener("mousemove", onMove);
    canvas.addEventListener("touchmove", onTouch, { passive: true });

    const ro = new ResizeObserver(init);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(drip);
      window.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("touchmove", onTouch);
      ro.disconnect();
    };
  }, [addRipple]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
