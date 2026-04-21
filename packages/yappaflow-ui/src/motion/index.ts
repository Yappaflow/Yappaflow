/**
 * Layer 2 — Motion (Breath).
 *
 * Public motion surface. Hooks and wrappers re-exported here. The engine is
 * NOT re-exported from this barrel — it's a side-effectful module and
 * consumers don't need direct access.
 */

export { MotionProvider, useMotion, type MotionContextValue, type MotionProviderProps } from "./provider.js";
export * from "./hooks/index.js";
export * from "./components/index.js";
