/**
 * Unused. Kept as reference for the original tsup-based build.
 *
 * Phase 7 (2026-04-23) switched `packages/types` to a plain `tsc -p
 * tsconfig.build.json` build. The tsup path worked fine on developer
 * machines but hit EPERM on sandboxed build environments that disallow
 * file unlinks — tsup uses `bundle-require` which creates a temp config
 * file and then unlinks it after loading, and that unlink fails on
 * read-only-delete mounts.
 *
 * Pure types package, no React, no "use client" concerns — plain tsc is
 * simpler than tsup here and produces the same dist/*.js + dist/*.d.ts.
 * Delete this file any time; it's a breadcrumb, not a config.
 */
export {};
