/**
 * Shopify "one-click import" bundle generator.
 *
 * Produces two artifacts that the agency can drop into a fresh Shopify store
 * with no manual editing:
 *
 *   1. A complete Liquid theme (uploaded at:
 *      Online Store → Themes → "Upload zip file"). The output of this generator
 *      is wrapped in a flat ZIP by the existing zip-export service, which is
 *      exactly what Shopify expects.
 *
 *   2. A `products.csv` matching Shopify's official import schema (uploaded at:
 *      Products → Import). The CSV is generated deterministically from
 *      `Project.identity.products` — the AI is not in the loop for this step,
 *      so we don't have to worry about the model breaking the column order.
 *
 * Both artifacts are persisted as `GeneratedArtifact` rows on the Project,
 * so the existing `/deploy/.../download` endpoint streams them in one ZIP.
 */

import { Project, IProjectIdentity, IProduct } from "../models/Project.model";
import { GeneratedArtifact } from "../models/GeneratedArtifact.model";
import { AISession } from "../models/AISession.model";
import { analyzeOnce, trackUsage } from "./ai-client.service";
import {
  getGenerateShopifyPrompt,
  type ShopifyProductForPrompt,
} from "../ai/prompts/generate-shopify.prompt";
import { parseArtifacts } from "./static-site-generator.service";
import {
  validateShopifyBundle,
  LiquidBundleValidationError,
  type LiquidValidationIssue,
} from "./liquid-validator.service";
import { log, logError } from "../utils/logger";

/**
 * Convert a list of validation issues into a terse prompt fragment we can
 * paste back at the model on the next retry. The model's best output mode
 * is when you point at concrete filenames + concrete problems, not when you
 * hand it a generic "try harder" instruction.
 */
function formatIssuesForPrompt(issues: LiquidValidationIssue[]): string {
  const lines = issues.map((i) => {
    const loc = i.line != null ? ` (line ${i.line})` : "";
    return `• ${i.filePath}${loc} [${i.kind}]: ${i.message}`;
  });
  return lines.join("\n");
}

const LANG_BY_EXT: Record<string, string> = {
  ".liquid": "liquid",
  ".json":   "json",
  ".css":    "css",
  ".js":     "javascript",
  ".csv":    "csv",
  ".svg":    "svg",
};

function languageForPath(p: string): string {
  const idx = p.lastIndexOf(".");
  if (idx === -1) return "text";
  return LANG_BY_EXT[p.slice(idx).toLowerCase()] ?? "text";
}

/** Lower-case, dash-separated, ASCII-only handle (the Shopify "handle" rule). */
function toHandle(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "product";
}

function csvEscape(value: string | number | undefined | null): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Shopify CSV import format. Column set chosen to be the minimal subset that
 * the Admin importer accepts cleanly while preserving variants and images.
 *
 * Reference: https://help.shopify.com/en/manual/products/import-export/using-csv
 */
const SHOPIFY_CSV_COLUMNS = [
  "Handle",
  "Title",
  "Body (HTML)",
  "Vendor",
  "Type",
  "Tags",
  "Published",
  "Option1 Name",
  "Option1 Value",
  "Variant SKU",
  "Variant Inventory Tracker",
  "Variant Inventory Qty",
  "Variant Inventory Policy",
  "Variant Fulfillment Service",
  "Variant Price",
  "Variant Requires Shipping",
  "Variant Taxable",
  "Image Src",
  "Image Position",
  "Image Alt Text",
  "Status",
] as const;

export function buildProductsCsv(
  identity: IProjectIdentity,
  products: IProduct[]
): string {
  const vendor = identity.businessName;
  const rows: string[] = [SHOPIFY_CSV_COLUMNS.join(",")];

  for (const p of products) {
    const handle = toHandle(p.name);
    const variants = p.variants?.length ? p.variants : [{ label: "Default Title" }];
    const optionName = p.variantKind
      ? p.variantKind[0].toUpperCase() + p.variantKind.slice(1)
      : "Title";
    const images = p.images?.length ? p.images : [];

    // Shopify's pattern: the FIRST row of a multi-variant product carries the
    // product-level fields (title, body, vendor, etc.). Subsequent rows for the
    // same handle leave those columns blank but still set Variant + (optionally)
    // an Image row.
    variants.forEach((variant, vIdx) => {
      const isFirst = vIdx === 0;
      const row: Record<typeof SHOPIFY_CSV_COLUMNS[number], string | number> = {
        "Handle":                       handle,
        "Title":                        isFirst ? p.name : "",
        "Body (HTML)":                  isFirst && p.description ? `<p>${p.description}</p>` : "",
        "Vendor":                       isFirst ? vendor : "",
        "Type":                         isFirst ? (identity.industry ?? "") : "",
        "Tags":                         isFirst ? (identity.industry ?? "") : "",
        "Published":                    isFirst ? "TRUE" : "",
        "Option1 Name":                 isFirst ? optionName : "",
        "Option1 Value":                variant.label,
        "Variant SKU":                  variant.sku ?? `${handle}-${toHandle(variant.label)}`,
        "Variant Inventory Tracker":    "shopify",
        "Variant Inventory Qty":        100,
        "Variant Inventory Policy":     "deny",
        "Variant Fulfillment Service":  "manual",
        "Variant Price":                Number((variant.price ?? p.price).toFixed(2)),
        "Variant Requires Shipping":    "TRUE",
        "Variant Taxable":              "TRUE",
        "Image Src":                    isFirst && images[0] ? images[0] : "",
        "Image Position":               isFirst && images[0] ? 1 : "",
        "Image Alt Text":               isFirst && images[0] ? p.name : "",
        "Status":                       isFirst ? "active" : "",
      };
      rows.push(SHOPIFY_CSV_COLUMNS.map((col) => csvEscape(row[col])).join(","));
    });

    // Extra image rows for products with more than one image (positions 2..n).
    if (images.length > 1) {
      for (let i = 1; i < images.length; i++) {
        const row: Record<typeof SHOPIFY_CSV_COLUMNS[number], string | number> = {
          "Handle":                       handle,
          "Title":                        "",
          "Body (HTML)":                  "",
          "Vendor":                       "",
          "Type":                         "",
          "Tags":                         "",
          "Published":                    "",
          "Option1 Name":                 "",
          "Option1 Value":                "",
          "Variant SKU":                  "",
          "Variant Inventory Tracker":    "",
          "Variant Inventory Qty":        "",
          "Variant Inventory Policy":     "",
          "Variant Fulfillment Service":  "",
          "Variant Price":                "",
          "Variant Requires Shipping":    "",
          "Variant Taxable":              "",
          "Image Src":                    images[i],
          "Image Position":               i + 1,
          "Image Alt Text":               p.name,
          "Status":                       "",
        };
        rows.push(SHOPIFY_CSV_COLUMNS.map((col) => csvEscape(row[col])).join(","));
      }
    }
  }

  return rows.join("\n") + "\n";
}

function productsForPrompt(identity: IProjectIdentity): ShopifyProductForPrompt[] {
  if (!identity.products?.length) return [];
  return identity.products.map((p) => ({
    handle:      toHandle(p.name),
    name:        p.name,
    price:       p.price,
    currency:    p.currency,
    description: p.description,
    variantKind: p.variantKind,
    variants:    p.variants?.map((v) => ({ label: v.label, price: v.price })),
  }));
}

const BASE_EXPECTED_FILES = 17; // see prompt's required layout
// 17 full theme files (Liquid + JSON + CSS + JS) easily exceeds 16 k tokens.
// 32 k sits safely inside Claude Sonnet 4's per-response cap and gives the
// model headroom to finish the last file's closing fence — previously we were
// truncating mid-output and parseArtifacts returned 0 blocks.
const SHOPIFY_MAX_TOKENS  = 32_000;

/**
 * Generate the Shopify-import bundle for a project.
 *
 * Side effects:
 *   • Creates a fresh AISession and GeneratedArtifact rows.
 *   • Wipes any prior shopify-platform artifacts for this project (idempotent
 *     re-build).
 *   • Updates `Project.buildJobStatus`, `buildFilesDone`, `buildFilesTotal`.
 */
export async function generateShopifyBundle(
  projectId: string,
  agencyId: string
): Promise<{ filesCreated: number }> {
  const project = await Project.findOne({ _id: projectId, agencyId });
  if (!project) throw new Error("Project not found");
  if (!project.identity) throw new Error("Project has no identity — run extraction first");

  const identity = project.identity as IProjectIdentity;
  const promptProducts = productsForPrompt(identity);

  await Project.findByIdAndUpdate(projectId, {
    buildJobStatus:  "running",
    buildFilesDone:  0,
    buildFilesTotal: BASE_EXPECTED_FILES + (identity.products?.length ? 1 : 0),
    buildError:      null,
  });

  const session = await AISession.create({
    agencyId,
    projectId,
    phase:  "generating",
    status: "active",
  });
  const sessionId = session._id;

  const systemPrompt = getGenerateShopifyPrompt({ products: promptProducts });
  const userContent =
    "## Business Identity\n\n" +
    "```json\n" +
    JSON.stringify(
      {
        businessName: identity.businessName,
        tagline:      identity.tagline,
        industry:     identity.industry,
        tone:         identity.tone,
        city:         identity.city,
      },
      null,
      2
    ) +
    "\n```\n\n" +
    (promptProducts.length
      ? "## Catalog summary (full CSV is generated separately)\n\n" +
        "```json\n" +
        JSON.stringify(promptProducts, null, 2) +
        "\n```\n\n"
      : "") +
    "Generate every file in the required layout, in order. No prose outside the fenced blocks.";

  log(
    `🛍  Generating Shopify bundle for project ${projectId} ` +
    `(${identity.businessName}${promptProducts.length ? `, ${promptProducts.length} products` : ""})`
  );

  // Self-critique retry loop. Generating 17 full theme files is long and
  // stochastic; a single stumble can sink the whole build, so we try up to
  // MAX_ATTEMPTS times and feed the validator's structured errors from each
  // failed attempt BACK into the next retry's user message. That last part
  // is the important one: "you said hero.liquid is 57 bytes, regenerate it
  // with real content" works far better than a generic "try harder" nudge.
  //
  // Cost budget: each attempt is ~$0.02 on OpenRouter/DeepSeek for the full
  // theme. Three attempts = ~$0.06 worst-case, which is a trivial price to
  // pay to avoid shipping a hollow-stub theme to a paying merchant (the
  // 2026-04-21 prod failure mode). The loop short-circuits the moment we
  // get a clean pass.
  const MAX_ATTEMPTS = 3;

  let raw = "";
  let themeFiles: ReturnType<typeof parseArtifacts> = [];
  let lastIssues: LiquidValidationIssue[] | null = null;
  let validated = false;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // Build the per-attempt user message:
    //   attempt 1 → original userContent.
    //   attempt 2+ → userContent + targeted critique of the LAST attempt's
    //                specific failures (parse or validation).
    let attemptUserContent = userContent;
    if (attempt > 1) {
      if (themeFiles.length === 0) {
        attemptUserContent +=
          "\n\n### REMINDER: output format\n\n" +
          "Your previous response did not parse — no fenced filepath blocks " +
          "were found. Emit EVERY file as a separate fenced block of the form " +
          "```filepath:<path>\\n<content>\\n```  — no prose outside the fences, " +
          "and make sure the FINAL file's closing fence is present before you stop.";
      } else if (lastIssues && lastIssues.length > 0) {
        attemptUserContent +=
          "\n\n### FIX THESE SPECIFIC PROBLEMS FROM YOUR PREVIOUS ATTEMPT\n\n" +
          formatIssuesForPrompt(lastIssues) +
          "\n\nRegenerate the ENTIRE bundle (every file, in order) with these " +
          "problems fixed. Do not emit placeholder stubs — every section, " +
          "template, and snippet must contain real production-grade content.";
      }
    }

    try {
      const { text, usage } = await analyzeOnce(systemPrompt, attemptUserContent, {
        phase: "generating",
        maxTokens: SHOPIFY_MAX_TOKENS,
      });
      raw = text;
      await trackUsage(sessionId.toString(), usage);
    } catch (err) {
      logError(`Shopify bundle generation AI call failed (attempt ${attempt})`, err);
      await Project.findByIdAndUpdate(projectId, {
        buildJobStatus: "failed",
        buildError:     (err as Error).message,
      });
      await AISession.findByIdAndUpdate(sessionId, { phase: "failed", status: "failed", error: (err as Error).message });
      throw err;
    }

    themeFiles = parseArtifacts(raw);
    if (themeFiles.length === 0) {
      // Diagnostic snapshot BEFORE we retry/fail — without this we're flying
      // blind on future parse failures. Head+tail so the log doesn't balloon.
      log(
        `⚠️  Shopify gen attempt ${attempt}/${MAX_ATTEMPTS}: parseArtifacts found 0 blocks in ${raw.length} chars. ` +
        `Output head: ${JSON.stringify(raw.slice(0, 400))} … ` +
        `tail: ${JSON.stringify(raw.slice(-400))}`
      );
      lastIssues = null; // parse-level failure, not a validator issues list
      continue;
    }

    // Pre-send testing: parse-check + content-depth-check every .liquid /
    // .json file before we persist anything. If the model produced broken
    // Liquid, malformed JSON, or hollow stubs, we loop and feed the issues
    // back into the next attempt's user message. Shipping a bundle Shopify
    // refuses at upload — or worse, accepts but renders as a blank store —
    // is unacceptable for a production SaaS.
    try {
      validateShopifyBundle(themeFiles);
      validated = true;
      if (attempt > 1) {
        log(`✅ Shopify gen attempt ${attempt}/${MAX_ATTEMPTS}: validation passed on retry (${themeFiles.length} files)`);
      }
      break;
    } catch (err) {
      if (err instanceof LiquidBundleValidationError) {
        lastIssues = err.issues;
        log(
          `⚠️  Shopify gen attempt ${attempt}/${MAX_ATTEMPTS}: validator rejected ${err.issues.length} issue(s) — ` +
          err.issues.slice(0, 3).map((i) => `${i.filePath}:${i.kind}`).join(", ") +
          (err.issues.length > 3 ? `, …+${err.issues.length - 3}` : "")
        );
        continue;
      }
      // Non-LiquidBundleValidationError: something unexpected — don't retry.
      throw err;
    }
  }

  if (themeFiles.length === 0) {
    const msg = "Shopify model output contained no filepath-fenced blocks after " + MAX_ATTEMPTS + " attempts";
    await Project.findByIdAndUpdate(projectId, {
      buildJobStatus: "failed",
      buildError:     msg,
    });
    await AISession.findByIdAndUpdate(sessionId, { phase: "failed", status: "failed", error: msg });
    throw new Error(msg);
  }

  if (!validated) {
    // All attempts returned parseable output but none passed validation —
    // surface the LAST attempt's issues to the user so they can see what
    // the model kept getting wrong.
    const err = new LiquidBundleValidationError(lastIssues ?? []);
    const msg = err.message + `\n(exhausted ${MAX_ATTEMPTS} attempts with validator feedback)`;
    logError("Shopify bundle failed validation after retries", err);
    await Project.findByIdAndUpdate(projectId, {
      buildJobStatus: "failed",
      buildError:     msg,
    });
    await AISession.findByIdAndUpdate(sessionId, {
      phase:  "failed",
      status: "failed",
      error:  msg,
    });
    throw err;
  }

  // Wipe previous artifacts (custom or shopify) for this project so we don't
  // mix two platform outputs in the download ZIP.
  await GeneratedArtifact.deleteMany({ agencyId, projectId });

  const allFiles: Array<{ filePath: string; content: string; language: string }> =
    themeFiles.map((f) => ({ ...f, filePath: `theme/${f.filePath}` }));

  // Always include a one-click README at the top of the ZIP so the agency
  // knows how to upload both halves of the bundle.
  allFiles.unshift({
    filePath: "README.txt",
    content:
      `Yappaflow → Shopify one-click bundle\n` +
      `====================================\n\n` +
      `1) Theme upload (one click, no re-zipping needed)\n` +
      `   • Shopify Admin → Online Store → Themes → "Upload zip file".\n` +
      `   • Select: shopify-theme.zip  (already packaged the way Shopify expects).\n` +
      `   • Click "Publish" once the upload finishes.\n\n` +
      (identity.products?.length
        ? `2) Product import\n` +
          `   • In Shopify Admin: Products → Import.\n` +
          `   • Select: products.csv\n` +
          `   • Confirm — Shopify will create products with variants and images.\n\n`
        : `2) Products\n` +
          `   • The theme ships empty. Add products in Shopify Admin → Products → Add product.\n\n`) +
      `Tip: Want us to do this automatically instead? Connect your Shopify store in\n` +
      `Yappaflow — we'll push the theme + products straight into your admin.\n\n` +
      `Generated by Yappaflow on ${new Date().toISOString()}.\n`,
    language: "text",
  });

  // Re-classify language for the prefixed paths (extension didn't change but
  // be defensive).
  for (const f of allFiles) {
    f.language = languageForPath(f.filePath);
  }

  if (identity.products?.length) {
    allFiles.push({
      filePath: "products.csv",
      content:  buildProductsCsv(identity, identity.products),
      language: "csv",
    });
  }

  for (const f of allFiles) {
    await GeneratedArtifact.create({
      agencyId,
      sessionId,
      projectId,
      filePath: f.filePath,
      content:  f.content,
      language: f.language,
      platform: "shopify",
      purpose:  f.filePath === "products.csv"
        ? "shopify-products-csv"
        : f.filePath === "README.txt"
          ? "shopify-readme"
          : "shopify-theme",
      version:  1,
    });
    await Project.findByIdAndUpdate(projectId, { $inc: { buildFilesDone: 1 } });
  }

  await Project.findByIdAndUpdate(projectId, {
    buildJobStatus:  "done",
    buildFilesTotal: allFiles.length,
    progress:        80,
  });
  await AISession.findByIdAndUpdate(sessionId, { phase: "ready", status: "completed" });

  log(`   → Generated ${allFiles.length} Shopify files for project ${projectId}`);
  return { filesCreated: allFiles.length };
}
