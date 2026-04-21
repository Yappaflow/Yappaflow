import { defineConfig, type Options } from "tsup";
import { cp, readFile, writeFile } from "node:fs/promises";

/**
 * yappaflow-ui build configuration.
 *
 * Each layer is a separate entry point so tree-shaking is per-layer and the
 * AI generator can import only what it uses. `motion/engine.ts` is the single
 * legitimately side-effectful entry (it registers GSAP plugins on import) —
 * see package.json "sideEffects".
 *
 * CSS (tokens + base) is copied to dist/ so consumers can import
 * "yappaflow-ui/styles.css" once at the app root.
 *
 * Two cross-cutting concerns that esbuild does not handle out of the box:
 *
 * 1. "use client" directives are stripped on bundle. Next.js's React Server
 *    Components compiler requires them at the top of the imported JS module
 *    to allow hook/context imports across the RSC boundary. We re-attach
 *    them in onSuccess for the client-side layers.
 *
 * 2. Cross-layer imports (e.g., shell/ importing from theme/) would otherwise
 *    inline the target module into both bundles. For a Context provider like
 *    ThemeProvider, inlining produces two distinct Context objects at
 *    runtime — the consumer's `useTheme()` sees a different Context than the
 *    one the provider populated, and throws. The plugin below rewrites such
 *    imports to point at the sibling barrel (`../theme/index.js`) and marks
 *    them external so the bundles share a single module instance.
 */

const LAYER_BARRELS = ["theme", "motion", "primitives", "exhibits", "shell"] as const;
/** Match `./<layer>/...` or `../<layer>/...` where <layer> is one of our barrels. */
const CROSS_LAYER_RE = new RegExp(
  `^\\.\\.?\\/(${LAYER_BARRELS.join("|")})(\\/|$)`,
);

/**
 * Decide the relative prefix the externalized reference should use, based on
 * where the importing source file lives — which in turn determines where the
 * bundled output will land in dist/:
 *
 *   - `src/index.ts`               → dist/index.js          (0 levels deep → "./<layer>/index.js")
 *   - `src/<layer>/*.ts`           → dist/<layer>/*.js      (1 level deep → "../<layer>/index.js")
 *   - `src/<layer>/<sub>/*.ts`     → still emits into dist/<layer>/*.js via bundling
 */
function relativePrefixFor(importer: string): "./" | "../" {
  // Normalize to forward slashes so the same logic works on Windows.
  const normalized = importer.replace(/\\/g, "/");
  const srcIdx = normalized.lastIndexOf("/src/");
  if (srcIdx === -1) return "../";
  const afterSrc = normalized.slice(srcIdx + "/src/".length);
  // Depth 0 iff the file lives directly at src/<filename> (no intermediate dir).
  return afterSrc.includes("/") ? "../" : "./";
}

const crossLayerExternalPlugin: NonNullable<Options["esbuildPlugins"]>[number] = {
  name: "yf-cross-layer-external",
  setup(build) {
    build.onResolve({ filter: CROSS_LAYER_RE }, (args) => {
      const match = args.path.match(/^\.\.?\/([^/]+)/);
      if (!match) return null;
      const layer = match[1];
      const prefix = relativePrefixFor(args.importer);
      // Redirect every cross-layer deep import to the sibling's public barrel
      // and mark external so the reference survives into the bundled output.
      return {
        path: `${prefix}${layer}/index.js`,
        external: true,
      };
    });
  },
};

/**
 * Entry basenames (without "/index" suffix) that must carry the
 * "use client" directive in their bundled output. These layers all import
 * React hooks or context APIs. `tokens` and `primitives` are pure SSR-safe.
 */
const CLIENT_LAYERS = ["motion", "shell", "theme", "exhibits"] as const;

async function prependUseClient(path: string): Promise<void> {
  const source = await readFile(path, "utf8");
  if (source.startsWith('"use client"') || source.startsWith("'use client'")) {
    return;
  }
  await writeFile(path, `"use client";\n${source}`);
}

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "tokens/index": "src/tokens/index.ts",
    "motion/index": "src/motion/index.ts",
    "motion/engine": "src/motion/engine.ts",
    "primitives/index": "src/primitives/index.ts",
    "shell/index": "src/shell/index.ts",
    "exhibits/index": "src/exhibits/index.ts",
    "theme/index": "src/theme/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  target: "es2022",
  external: ["react", "react-dom"],
  esbuildPlugins: [crossLayerExternalPlugin],
  async onSuccess() {
    // Ship the compiled CSS alongside the JS bundles. The order below matters
    // only to humans — `styles.css` @imports the other three, so all four
    // must land in dist/ for `yappaflow-ui/styles.css" to resolve.
    await cp("src/styles/tokens.css", "dist/tokens.css");
    await cp("src/styles/reset.css", "dist/reset.css");
    await cp("src/styles/base.css", "dist/base.css");
    await cp("src/styles/index.css", "dist/styles.css");

    // Re-attach the "use client" directive stripped by esbuild. Only the
    // bundled JS entries need this (not the .d.ts files) — the Next.js RSC
    // compiler reads the first statement of the imported JS module.
    for (const layer of CLIENT_LAYERS) {
      await prependUseClient(`dist/${layer}/index.js`);
      await prependUseClient(`dist/${layer}/index.cjs`);
    }
  },
});
