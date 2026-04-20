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
 * The goal here is NOT to do semantic Liquid validation (that's Theme Check's
 * job, and it requires disk access + a whole theme context). It's just to
 * catch the common AI failure mode: unbalanced `{% if %}/{% endif %}`,
 * mis-closed tags, malformed `{{ output }}` expressions, etc.
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
  kind:     "liquid-parse" | "json-parse";
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

/**
 * Validate every `.liquid` / `.json` file in a generated Shopify bundle.
 * Does not mutate the files. Throws `LiquidBundleValidationError` if any
 * file fails to parse; otherwise resolves silently.
 */
export function validateShopifyBundle(files: ParsedFile[]): void {
  const issues: LiquidValidationIssue[] = [];

  for (const f of files) {
    const lower = f.filePath.toLowerCase();

    if (lower.endsWith(".liquid")) {
      try {
        // We don't need the AST — we just want to know whether it parses.
        toLiquidHtmlAST(f.content);
      } catch (err) {
        issues.push(asIssue(f.filePath, err));
      }
      continue;
    }

    if (lower.endsWith(".json")) {
      try {
        JSON.parse(f.content);
      } catch (err) {
        issues.push({
          filePath: f.filePath,
          kind:     "json-parse",
          message:  (err as Error).message,
        });
      }
      continue;
    }
  }

  if (issues.length > 0) {
    throw new LiquidBundleValidationError(issues);
  }
}
