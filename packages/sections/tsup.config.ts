/**
 * Unused. Kept as reference for the original tsup-based build.
 *
 * Phase 7 (2026-04-23) switched `packages/sections` to `tsc -p
 * tsconfig.build.json` plus a post-build node script at
 * `scripts/prepend-use-client.mjs` that re-attaches the "use client"
 * directive to each section's emitted JS. Same reason as
 * `packages/types/tsup.config.ts`: tsup's bundle-require cleanup requires
 * file unlinks that fail on sandboxed mounts.
 *
 * The cross-section externalization plugin and the "use client" re-banner
 * from the original tsup config now live inline in scripts/prepend-use-client.mjs.
 * Sections do not import one another at present, so the cross-layer plugin
 * isn't load-bearing yet; revisit if that ever changes.
 *
 * Delete this file any time; it's a breadcrumb, not a config.
 */
export {};
