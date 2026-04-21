import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Conditional classname helper with Tailwind merge semantics.
 * Used everywhere in the library. Tailwind is a styling option only —
 * the library itself styles via CSS custom properties, but tailwind-merge
 * protects consumers who mix our classes with their Tailwind.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
