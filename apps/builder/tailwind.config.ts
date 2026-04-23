import type { Config } from "tailwindcss";

/**
 * Builder Tailwind config.
 *
 * The `content` glob includes packages/sections/src/** so class names used
 * inside the section render components (e.g. `bg-white`, `md:grid-cols-3`)
 * are picked up by Tailwind's JIT when the builder renders the canvas. Next
 * builds the builder from apps/builder as root, but Tailwind's content
 * scanner walks relative paths regardless — pointing at the sibling package
 * is the standard monorepo pattern.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/sections/src/**/*.{ts,tsx}",
  ],
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
