import type { Config } from "tailwindcss";

/**
 * Builder Tailwind config — minimal palette for the Phase 7 placeholder.
 * Phase 8 expands this with DNA-bound tokens, motion utilities, and the
 * full builder chrome design system.
 */
const config: Config = {
  // Class-based toggle lets us honour the Yappaflow doctrine: light by
  // default, every surface ships with a dark-mode toggle under user control.
  // `html.dark` flips theme; see src/components/theme-toggle.tsx.
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0b0b",
        paper: "#f6f5f2",
      },
    },
  },
  plugins: [],
};

export default config;
