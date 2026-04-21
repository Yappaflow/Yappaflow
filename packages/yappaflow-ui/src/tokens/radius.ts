/**
 * Radius tokens.
 *
 * Intentionally sparse — bold modern minimalism trends sharp. No pills.
 * Anything rounder than `framed` is out of the design vocabulary.
 */

export const radius = {
  /** Default — sharp corners. The gallery standard. */
  sharp: "0",
  /** Micro-softening for tags, chips. */
  soft: "4px",
  /** Framed — image containers, cards. */
  framed: "12px",
  /** Full — only for circular media (avatars). */
  circle: "9999px",
} as const;

export type RadiusKey = keyof typeof radius;
