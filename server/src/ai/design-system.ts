/**
 * Design System Loader
 *
 * Loads the `memory/design/top-design/` folder — our curated design
 * bible — and turns it into a single markdown block suitable for
 * injecting into AI system prompts.
 *
 * What's in there:
 *   - SKILL.md                     → the master design philosophy
 *   - references/*.md              → typography, animation patterns,
 *                                    layout systems, tech stack,
 *                                    case studies
 *   - insprations/*.png            → 14 inspiration thumbnails.
 *                                    Filenames are included as
 *                                    references; the raw bytes are NOT
 *                                    sent (we'd need a vision-capable
 *                                    model; DeepSeek V3 chat is text-only).
 *
 * The whole block is loaded once per process and cached. It's big (~20k
 * chars) and static, so re-reading on every request is pure waste.
 */

import fs from "node:fs";
import path from "node:path";
import { log } from "../utils/logger";

// ── Config ────────────────────────────────────────────────────────────

/**
 * Walk up from __dirname to find the repo root (the folder that holds
 * `memory/design/top-design`). This keeps us robust to running from
 * `src/` in dev (tsx) vs. `dist/` in prod (tsc build), and to changes
 * in the monorepo layout as long as `memory/design/top-design` stays
 * in the workspace root.
 */
function findDesignRoot(): string | null {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, "memory", "design", "top-design");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: allow override via env for odd deployments.
  if (process.env.YAPPAFLOW_DESIGN_DIR && fs.existsSync(process.env.YAPPAFLOW_DESIGN_DIR)) {
    return process.env.YAPPAFLOW_DESIGN_DIR;
  }
  return null;
}

// ── Loader ────────────────────────────────────────────────────────────

interface DesignSystemBundle {
  /** Concatenated markdown block, ready to drop into a system prompt. */
  markdown:         string;
  /** Absolute paths to each markdown file we loaded. */
  markdownFiles:    string[];
  /** Filenames (not paths) of inspiration images. */
  inspirationImages: string[];
  /** Resolved root directory, or null if the folder couldn't be found. */
  rootDir:          string | null;
}

let cached: DesignSystemBundle | null = null;

export function loadDesignSystem(): DesignSystemBundle {
  if (cached) return cached;

  const rootDir = findDesignRoot();
  if (!rootDir) {
    log("[design-system] top-design folder not found — shipping empty design block");
    cached = { markdown: "", markdownFiles: [], inspirationImages: [], rootDir: null };
    return cached;
  }

  // Collect markdown files: SKILL.md at root, plus anything in references/.
  const markdownFiles: string[] = [];
  const skillPath = path.join(rootDir, "SKILL.md");
  if (fs.existsSync(skillPath)) markdownFiles.push(skillPath);

  const refDir = path.join(rootDir, "references");
  if (fs.existsSync(refDir)) {
    const refs = fs
      .readdirSync(refDir)
      .filter((f) => f.toLowerCase().endsWith(".md"))
      .sort()
      .map((f) => path.join(refDir, f));
    markdownFiles.push(...refs);
  }

  // Collect inspiration image filenames. Folder is literally "insprations"
  // (typo preserved — don't silently rename user files). We fall back to
  // "inspirations" in case someone fixes it later.
  const inspirationImages: string[] = [];
  for (const folder of ["insprations", "inspirations"]) {
    const dir = path.join(rootDir, folder);
    if (!fs.existsSync(dir)) continue;
    const imgs = fs
      .readdirSync(dir)
      .filter((f) => /\.(png|jpe?g|webp|avif)$/i.test(f))
      .sort();
    inspirationImages.push(...imgs);
    break;
  }

  // Build the markdown block the model actually sees.
  const sections: string[] = [];
  sections.push("# Yappaflow Design System");
  sections.push(
    "You MUST follow the design philosophy, typography rules, animation " +
    "patterns, and layout conventions defined below. They are not " +
    "suggestions — they are the quality bar for every component you emit."
  );

  for (const file of markdownFiles) {
    const relative = path.relative(rootDir, file);
    let body = "";
    try {
      body = fs.readFileSync(file, "utf8");
    } catch (err) {
      log(`[design-system] failed to read ${relative}: ${(err as Error).message}`);
      continue;
    }
    // Strip YAML front-matter if present — it's metadata for skill
    // tooling, not useful to the model.
    body = body.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
    sections.push(`## SOURCE: ${relative}\n\n${body}`);
  }

  if (inspirationImages.length > 0) {
    sections.push(
      `## Inspiration Library\n\n` +
      `${inspirationImages.length} reference images live alongside this ` +
      `guide under \`insprations/\`. Treat filenames as mood cues; they ` +
      `cover the aesthetic range we consider "10/10": ` +
      inspirationImages.map((n) => `\`${n}\``).join(", ")
    );
  }

  const markdown = sections.join("\n\n---\n\n");

  log(
    `[design-system] loaded ${markdownFiles.length} md file(s) ` +
    `+ ${inspirationImages.length} inspiration image(s) from ${rootDir} ` +
    `(${markdown.length} chars)`
  );

  cached = { markdown, markdownFiles, inspirationImages, rootDir };
  return cached;
}

/** Force a re-read from disk on next call. Useful in tests + hot reload. */
export function invalidateDesignSystemCache(): void {
  cached = null;
}
