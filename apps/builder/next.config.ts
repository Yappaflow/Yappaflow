import type { NextConfig } from "next";

/**
 * Builder Next.js config.
 *
 * Phase 7: placeholder app with zero workspace dependencies — nothing to
 * transpile, no custom webpack, no Vercel env tricks. Keep this as-is until
 * Phase 8 starts importing @yappaflow/sections and @yappaflow/types from the
 * iframe canvas renderer. When that happens, either:
 *   (a) add them to `transpilePackages` so Next transpiles their src
 *       directly, or
 *   (b) ensure `turbo build --filter=@yappaflow/builder` is the Vercel build
 *       command so their dist/ is built first (preferred — matches the
 *       existing turbo dependency graph).
 */
const config: NextConfig = {
  reactStrictMode: true,
};

export default config;
