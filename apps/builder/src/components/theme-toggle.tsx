"use client";

import { useEffect, useState } from "react";

/**
 * Minimal light/dark toggle. Reads the state `html.dark` was already set to
 * by the pre-hydration script in layout.tsx, so there's no mismatch between
 * server and client — we only *observe* the class after mount. The toggle
 * persists the user's choice to localStorage so it survives reloads.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("yf.theme", next ? "dark" : "light");
    } catch {
      /* storage unavailable — toggle still works for this session */
    }
  }

  // Render nothing until after mount so the server output stays stable.
  if (dark === null) {
    return <span className="inline-block h-8 w-[88px]" aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-full border border-black/10 px-3 py-1.5 text-xs tracking-wide transition hover:border-black/30 dark:border-white/10 dark:hover:border-white/30"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
    >
      <span aria-hidden="true">{dark ? "◑" : "◐"}</span>
      <span>{dark ? "Light" : "Dark"}</span>
    </button>
  );
}
