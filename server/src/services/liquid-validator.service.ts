/**
 * Liquid theme validator.
 *
 * Uses Shopify's own `@shopify/liquid-html-parser` to statically verify the
 * syntactic validity of every `.liquid` file we emit in a Shopify bundle,
 * BEFORE we persist it as `GeneratedArtifact`. The idea is to fail the
 * build cleanly instead of handing the agency a broken ZIP that Shopify
 * will reject at upload time.
 *
 * We also do a best-effort JSON.parse on every `.json` theme file (templates,
 * locales, config) — those are also strict in Shopify's theme uploader.
 *
 * Beyond syntax, we also enforce CONTENT-DEPTH rules. Production hit a
 * class of failure (2026-04-21) where the model emitted 18 correctly-shaped
 * but essentially-empty files (avg 355 bytes/file, sections with no
 * content, templates/*.json with empty `sections: {}`). Shopify's uploader
 * accepted the ZIP but the rendered store was blank — the customizer told
 * merchants "This page doesn't have any sections". Syntax-only validation
 * can't catch that. The content-depth rules in this file do.
 *
 * What we check is deliberately minimal so we don't over-constrain the
 * model:
 *   - `layout/theme.liquid` must exist, include `{{ content_for_layout }}`
 *     (required by Shopify itself), and have real structural content.
 *   - `sections/*.liquid` must have non-trivial body — empty sections
 *     render as invisible regions in the theme editor.
 *   - `templates/*.json` must declare at least one section — otherwise
 *     the page is blank.
 *
 * The goal here is NOT to do semantic Liquid validation (that's Theme
 * Check's job, and it requires disk access + a whole theme context). It's
 * to catch the two common AI failure modes we've actually seen in prod:
 *   1. Malformed Liquid (unbalanced `{% if %}/{% endif %}`, mis-closed
 *      tags, malformed `{{ output }}` expressions).
 *   2. Hollow-stub output that parses fine but has no substance.
 */

import {
  toLiquidHtmlAST,
  LiquidHTMLASTParsingError,
  LiquidHTMLCSTParsingError,
} from "@shopify/liquid-html-parser";

export interface ParsedFile {
  filePath: string;
  content:  string;
  language: string;
}

export interface LiquidValidationIssue {
  filePath: string;
  /**
   * - `liquid-parse`: malformed Liquid / unclosed tag / mis-balanced block.
   * - `json-parse`: JSON.parse failed on a theme JSON file.
   * - `content-empty`: file parsed fine but has too little content to be
   *   meaningful — e.g. a 57-byte `sections/header.liquid` or a
   *   `templates/index.json` with `sections: {}`.
   * - `missing-required`: a file Shopify's uploader requires wasn't in
   *   the bundle at all (e.g. `layout/theme.liquid`).
   * - `missing-token`: a required Liquid token is absent from a file
   *   that must contain it (e.g. `{{ content_for_layout }}` in the
   *   root layout — without it, no page ever renders its body).
   */
  kind:     "liquid-parse" | "json-parse" | "content-empty" | "missing-required" | "missing-token";
  message:  string;
  line?:    number;
  column?:  number;
}

export class LiquidBundleValidationError extends Error {
  issues: LiquidValidationIssue[];
  constructor(issues: LiquidValidationIssue[]) {
    const summary = issues
      .slice(0, 5)
      .map((i) => {
        const loc = i.line != null ? ` (${i.line}:${i.column ?? 0})` : "";
        return `  • ${i.filePath}${loc}: ${i.message}`;
      })
      .join("\n");
    const more =
      issues.length > 5 ? `\n  …and ${issues.length - 5} more issue(s)` : "";
    super(
      `Generated Shopify bundle failed validation (${issues.length} issue${
        issues.length === 1 ? "" : "s"
      }):\n${summary}${more}`
    );
    this.name   = "LiquidBundleValidationError";
    this.issues = issues;
  }
}

function asIssue(
  filePath: string,
  err: unknown
): LiquidValidationIssue {
  if (
    err instanceof LiquidHTMLCSTParsingError ||
    err instanceof LiquidHTMLASTParsingError
  ) {
    return {
      filePath,
      kind:    "liquid-parse",
      message: err.message.split("\n")[0] ?? err.message,
      line:    err.loc?.start.line,
      column:  err.loc?.start.column,
    };
  }
  if (err instanceof SyntaxError) {
    return {
      filePath,
      kind:    "liquid-parse",
      message: err.message,
    };
  }
  return {
    filePath,
    kind:    "liquid-parse",
    message: (err as Error)?.message ?? String(err),
  };
}

// ── Content-depth thresholds ─────────────────────────────────────────

/**
 * Minimum non-whitespace byte count for a file to count as "real".
 * Numbers were picked empirically after reviewing the Dawn theme (Shopify's
 * reference theme) — every non-stub section in Dawn is comfortably above
 * these floors, and our own hollow-stub failure produced files well below.
 *
 * We key on path *patterns* rather than exact names because the generator
 * may emit e.g. `sections/hero.liquid` or `sections/featured-collection.
 * liquid` — both should meet the section floor.
 */
const MIN_CONTENT_BYTES: Array<{ test: (path: string) => boolean; min: number }> = [
  // Root layout carries the <html>, <head>, <body>, and the standard
  // Shopify pre-amble (content_for_header, content_for_layout). Even
  // a minimalist Dawn-style theme.liquid is >2 KB — 500 is a very loose
  // floor that still catches 57/131/185-byte stub output.
  { test: (p) => p === "layout/theme.liquid",          min: 500 },
  // Header and footer are always rendered; they carry nav, logo, cart,
  // newsletter, etc. A 57-byte header is a placeholder, not a header.
  { test: (p) => p === "sections/header.liquid",       min: 300 },
  { test: (p) => p === "sections/footer.liquid",       min: 300 },
  // Any other section must have some substance — empty sections render
  // as invisible regions in the theme editor.
  { test: (p) => p.startsWith("sections/") && p.endsWith(".liquid"), min: 200 },
];

/**
 * Files Shopify's uploader treats as non-negotiable. Missing any of these
 * would let the upload succeed but the store would be broken. We enforce
 * them here so an upstream generation failure can't ship silently.
 *
 * Intentionally conservative — only files that Shopify itself insists on,
 * not our opinion of what a theme "should" have.
 */
const REQUIRED_FILES = [
  "layout/theme.liquid",
  "config/settings_schema.json",
] as const;

/**
 * Liquid tokens that MUST appear inside specific files. Missing these is
 * a silent render failure, not a syntax error — the parser will happily
 * accept `<html><body></body></html>` as a layout, but no template body
 * ever appears on the rendered page. The 404 fallback the customizer
 * showed in prod (2026-04-21) was a symptom of exactly this.
 */
const REQUIRED_TOKENS: Array<{ file: string; token: string; why: string }> = [
  {
    file:  "layout/theme.liquid",
    token: "{{ content_for_layout }}",
    why:   "Shopify injects the rendered template body here — without it no page renders content.",
  },
  {
    file:  "layout/theme.liquid",
    token: "{{ content_for_header }}",
    why:   "Shopify injects its app/pixel/theme header tags here — required by Shopify for theme upload.",
  },
];

/**
 * Count bytes of "meaningful" content — strips leading/trailing whitespace
 * and collapses comments. This stops "look, I'm 500 bytes!" stuffing via a
 * giant leading comment block from satisfying the floor check.
 */
function meaningfulByteCount(content: string): number {
  const trimmed = content.trim();
  if (!trimmed) return 0;
  // Strip Liquid comments ({% comment %}…{% endcomment %}), HTML comments
  // (<!-- … -->), and JS/CSS-style line/block comments — a stub padded
  // with comments is still a stub.
  const stripped = trimmed
    .replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/[^\n]*/g, "");
  return stripped.trim().length;
}

/**
 * Validate every `.liquid` / `.json` file in a generated Shopify bundle.
 * Does not mutate the files. Throws `LiquidBundleValidationError` if any
 * file fails to parse OR fails a content-depth / required-file / required-
 * token rule; otherwise resolves silently.
 */
export function validateShopifyBundle(files: ParsedFile[]): void {
  const issues: LiquidValidationIssue[] = [];
  const byPath = new Map(files.map((f) => [f.filePath, f] as const));

  // ── 1. Required files ──────────────────────────────────────────────
  for (const required of REQUIRED_FILES) {
    if (!byPath.has(required)) {
      issues.push({
        filePath: required,
        kind:     "missing-required",
        message:  `required file "${required}" is not present in the generated bundle`,
      });
    }
  }

  // ── 2. Syntax + structure per file ─────────────────────────────────
  for (const f of files) {
    const lower = f.filePath.toLowerCase();

    if (lower.endsWith(".liquid")) {
      try {
        // We don't need the AST — we just want to know whether it parses.
        toLiquidHtmlAST(f.content);
      } catch (err) {
        issues.push(asIssue(f.filePath, err));
        // Fall through: still run content-depth checks so the merchant
        // sees every problem at once, not one re-run at a time.
      }
    } else if (lower.endsWith(".json")) {
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(f.content);
      } catch (err) {
        issues.push({
          filePath: f.filePath,
          kind:     "json-parse",
          message:  (err as Error).message,
        });
        continue; // Can't do structure checks on unparsable JSON.
      }

      // templates/*.json must declare at least one section, otherwise the
      // rendered page is blank and the customizer shows the "This page
      // doesn't have any sections" banner — not a user-visible error, but
      // every store page is empty. This was the prod failure mode on
      // 2026-04-21.
      if (lower.startsWith("templates/") && lower.endsWith(".json")) {
        const sections = (parsed as { sections?: Record<string, unknown> } | null)?.sections;
        if (
          !sections ||
          typeof sections !== "object" ||
          Object.keys(sections as Record<string, unknown>).length === 0
        ) {
          issues.push({
            filePath: f.filePath,
            kind:     "content-empty",
            message:  `template declares no sections — rendered page would be blank`,
          });
        }
      }
    }

    // ── 3. Content-depth floor ───────────────────────────────────────
    const rule = MIN_CONTENT_BYTES.find((r) => r.test(f.filePath));
    if (rule) {
      const bytes = meaningfulByteCount(f.content);
      if (bytes < rule.min) {
        issues.push({
          filePath: f.filePath,
          kind:     "content-empty",
          message:  `only ${bytes} meaningful bytes — below the ${rule.min}-byte floor for this file (the model likely emitted a stub).`,
        });
      }
    }
  }

  // ── 4. Required Liquid tokens in specific files ────────────────────
  for (const rule of REQUIRED_TOKENS) {
    const f = byPath.get(rule.file);
    if (!f) continue; // already reported via missing-required
    if (!f.content.includes(rule.token)) {
      issues.push({
        filePath: rule.file,
        kind:     "missing-token",
        message:  `missing required token ${rule.token} — ${rule.why}`,
      });
    }
  }

  if (issues.length > 0) {
    throw new LiquidBundleValidationError(issues);
  }
}
