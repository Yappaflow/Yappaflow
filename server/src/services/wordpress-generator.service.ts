/**
 * WordPress "one-click import" bundle generator.
 *
 * Produces three artifact groups that the agency can drop into a WordPress
 * install with no manual editing:
 *
 *   1. A complete CLASSIC-COMPATIBLE + BLOCK-THEME hybrid
 *      (style.css + functions.php + theme.json + page templates). The agency
 *      zips the `theme/` folder and uploads at
 *      Appearance → Themes → Add New → Upload Theme.
 *
 *   2. HTML bodies for the Home, About, Contact pages at `pages/*.html`.
 *      These are NOT theme files — Yappaflow POSTs them to /wp/v2/pages
 *      when the merchant connects their site to Yappaflow.
 *
 *   3. A `products.csv` matching the WooCommerce Product CSV Importer
 *      format (Products → Import on a Woo-enabled site). The CSV is
 *      generated deterministically from `Project.identity.products` — the
 *      AI is not in the loop for this step, so the column order is always
 *      correct.
 *
 * All artifacts are persisted as `GeneratedArtifact` rows with
 * `platform: "wordpress"`, so the existing `/deploy/wordpress/.../download`
 * endpoint streams them in one ZIP.
 */

import { Project, IProjectIdentity, IProduct } from "../models/Project.model";
import { GeneratedArtifact } from "../models/GeneratedArtifact.model";
import { AISession } from "../models/AISession.model";
import { analyzeOnce, trackUsage } from "./ai-client.service";
import {
  getGenerateWordPressPrompt,
  type WordPressProductForPrompt,
} from "../ai/prompts/generate-wordpress.prompt";
import { parseArtifacts } from "./static-site-generator.service";
import { log, logError } from "../utils/logger";

const LANG_BY_EXT: Record<string, string> = {
  ".php":   "php",
  ".json":  "json",
  ".css":   "css",
  ".js":    "javascript",
  ".html":  "html",
  ".csv":   "csv",
  ".svg":   "svg",
  ".txt":   "text",
};

function languageForPath(p: string): string {
  const idx = p.lastIndexOf(".");
  if (idx === -1) return "text";
  return LANG_BY_EXT[p.slice(idx).toLowerCase()] ?? "text";
}

/**
 * Lower-case, dash-separated, ASCII-only slug. WordPress's post-slug rules
 * plus WooCommerce's product slug conventions both collapse to this.
 */
function toSlug(s: string): string {
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
 * WooCommerce CSV column set. Chosen to match WooCommerce's official
 * Product CSV Importer template — omitting any column we don't need (SEO,
 * shipping class, tax, etc.) so the import is fast and unambiguous.
 *
 * Reference: https://woocommerce.com/document/product-csv-importer-exporter/
 */
const WOOCOMMERCE_CSV_COLUMNS = [
  "ID",
  "Type",
  "SKU",
  "Name",
  "Published",
  "Is featured?",
  "Visibility in catalog",
  "Short description",
  "Description",
  "Tax status",
  "In stock?",
  "Stock",
  "Backorders allowed?",
  "Sold individually?",
  "Regular price",
  "Categories",
  "Tags",
  "Images",
  "Parent",
  "Attribute 1 name",
  "Attribute 1 value(s)",
  "Attribute 1 visible",
  "Attribute 1 global",
  "Position",
] as const;

type WooCsvCol = typeof WOOCOMMERCE_CSV_COLUMNS[number];

function emptyRow(): Record<WooCsvCol, string | number> {
  const r = {} as Record<WooCsvCol, string | number>;
  for (const c of WOOCOMMERCE_CSV_COLUMNS) r[c] = "";
  return r;
}

/**
 * Build a WooCommerce-import-ready products.csv from the Project identity.
 *
 * Layout matches what Woo's importer expects:
 *   • For a simple (single-variant) product → one row, type="simple".
 *   • For a variable (multi-variant) product → one "variable" parent row
 *     followed by N "variation" rows that reference the parent via the
 *     "Parent" column and re-state the attribute on each variation.
 *
 * Pure (no DB), so unit tests can pass in fixtures.
 */
export function buildWooCommerceCsv(
  identity: IProjectIdentity,
  products: IProduct[]
): string {
  const rows: string[] = [WOOCOMMERCE_CSV_COLUMNS.join(",")];
  const categoryName = identity.industry
    ? identity.industry[0].toUpperCase() + identity.industry.slice(1)
    : "";

  for (const p of products) {
    const parentSku = p.sku ?? toSlug(p.name);
    const hasVariants = Array.isArray(p.variants) && p.variants.length > 1;
    const images = (p.images ?? []).join(", ");
    const attrName = p.variantKind
      ? p.variantKind[0].toUpperCase() + p.variantKind.slice(1)
      : "Variant";

    if (!hasVariants) {
      const row = emptyRow();
      row["Type"] = "simple";
      row["SKU"] = parentSku;
      row["Name"] = p.name;
      row["Published"] = 1;
      row["Is featured?"] = 0;
      row["Visibility in catalog"] = "visible";
      row["Short description"] = p.description?.slice(0, 140) ?? "";
      row["Description"] = p.description ?? "";
      row["Tax status"] = "taxable";
      row["In stock?"] = 1;
      row["Stock"] = 100;
      row["Backorders allowed?"] = 0;
      row["Sold individually?"] = 0;
      row["Regular price"] = p.price.toFixed(2);
      row["Categories"] = categoryName;
      row["Tags"] = categoryName;
      row["Images"] = images;
      rows.push(WOOCOMMERCE_CSV_COLUMNS.map((c) => csvEscape(row[c])).join(","));
      continue;
    }

    // Variable parent
    const parentRow = emptyRow();
    parentRow["Type"] = "variable";
    parentRow["SKU"] = parentSku;
    parentRow["Name"] = p.name;
    parentRow["Published"] = 1;
    parentRow["Is featured?"] = 0;
    parentRow["Visibility in catalog"] = "visible";
    parentRow["Short description"] = p.description?.slice(0, 140) ?? "";
    parentRow["Description"] = p.description ?? "";
    parentRow["Tax status"] = "taxable";
    parentRow["In stock?"] = 1;
    parentRow["Sold individually?"] = 0;
    parentRow["Categories"] = categoryName;
    parentRow["Tags"] = categoryName;
    parentRow["Images"] = images;
    parentRow["Attribute 1 name"] = attrName;
    parentRow["Attribute 1 value(s)"] =
      (p.variants ?? []).map((v) => v.label).join(" | ");
    parentRow["Attribute 1 visible"] = 1;
    parentRow["Attribute 1 global"] = 1;
    rows.push(WOOCOMMERCE_CSV_COLUMNS.map((c) => csvEscape(parentRow[c])).join(","));

    // Variations
    (p.variants ?? []).forEach((v, idx) => {
      const row = emptyRow();
      row["Type"] = "variation";
      row["SKU"] = v.sku ?? `${parentSku}-${toSlug(v.label)}`;
      row["Name"] = `${p.name} — ${v.label}`;
      row["Published"] = 1;
      row["Visibility in catalog"] = "visible";
      row["Tax status"] = "taxable";
      row["In stock?"] = 1;
      row["Regular price"] = (v.price ?? p.price).toFixed(2);
      row["Parent"] = parentSku;
      row["Attribute 1 name"] = attrName;
      row["Attribute 1 value(s)"] = v.label;
      row["Attribute 1 visible"] = 1;
      row["Attribute 1 global"] = 1;
      row["Position"] = idx;
      rows.push(WOOCOMMERCE_CSV_COLUMNS.map((c) => csvEscape(row[c])).join(","));
    });
  }

  return rows.join("\n") + "\n";
}

function productsForPrompt(identity: IProjectIdentity): WordPressProductForPrompt[] {
  if (!identity.products?.length) return [];
  return identity.products.map((p) => ({
    slug:        toSlug(p.name),
    name:        p.name,
    price:       p.price,
    currency:    p.currency,
    description: p.description,
    variantKind: p.variantKind,
    variants:    p.variants?.map((v) => ({ label: v.label, price: v.price })),
  }));
}

const BASE_EXPECTED_FILES   = 22; // see prompt's required layout (theme + pages/)
// Theme + PHP + pages/ HTML easily exceeds the Shopify bundle in raw tokens —
// 32k was the right ceiling there too; keep WordPress at the same setting so
// we don't truncate mid-file and get zero parsed blocks.
const WORDPRESS_MAX_TOKENS  = 32_000;

/**
 * Generate the WordPress-import bundle for a project.
 *
 * Side effects:
 *   • Creates a fresh AISession and GeneratedArtifact rows.
 *   • Wipes any prior artifacts for this project (idempotent re-build).
 *   • Updates `Project.buildJobStatus`, `buildFilesDone`, `buildFilesTotal`.
 */
export async function generateWordPressBundle(
  projectId: string,
  agencyId:  string
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

  const systemPrompt = getGenerateWordPressPrompt({ products: promptProducts });
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
    `📝 Generating WordPress bundle for project ${projectId} ` +
    `(${identity.businessName}${promptProducts.length ? `, ${promptProducts.length} products` : ""})`
  );

  let raw = "";
  let themeFiles: ReturnType<typeof parseArtifacts> = [];

  for (let attempt = 1; attempt <= 2; attempt++) {
    const attemptUserContent = attempt === 1
      ? userContent
      : userContent +
        "\n\nREMINDER: emit EVERY file as a separate fenced block of the form " +
        "```filepath:<path>\\n<content>\\n```  — no prose outside the fences, " +
        "and make sure the FINAL file's closing fence is present before you stop.";

    try {
      const { text, usage } = await analyzeOnce(systemPrompt, attemptUserContent, {
        maxTokens: WORDPRESS_MAX_TOKENS,
      });
      raw = text;
      await trackUsage(sessionId.toString(), usage);
    } catch (err) {
      logError(`WordPress bundle generation AI call failed (attempt ${attempt})`, err);
      await Project.findByIdAndUpdate(projectId, {
        buildJobStatus: "failed",
        buildError:     (err as Error).message,
      });
      await AISession.findByIdAndUpdate(sessionId, {
        phase:  "failed",
        status: "failed",
        error:  (err as Error).message,
      });
      throw err;
    }

    themeFiles = parseArtifacts(raw);
    if (themeFiles.length > 0) break;

    log(
      `⚠️  WordPress gen attempt ${attempt}: parseArtifacts found 0 blocks in ${raw.length} chars. ` +
      `Output head: ${JSON.stringify(raw.slice(0, 400))} … ` +
      `tail: ${JSON.stringify(raw.slice(-400))}`
    );
  }

  if (themeFiles.length === 0) {
    const msg = "WordPress model output contained no filepath-fenced blocks";
    await Project.findByIdAndUpdate(projectId, {
      buildJobStatus: "failed",
      buildError:     msg,
    });
    await AISession.findByIdAndUpdate(sessionId, {
      phase:  "failed",
      status: "failed",
      error:  msg,
    });
    throw new Error(msg);
  }

  // Wipe previous artifacts so we don't mix two platform outputs in the ZIP.
  await GeneratedArtifact.deleteMany({ agencyId, projectId });

  // Files whose path starts with "pages/" are REST-pushable HTML page bodies,
  // everything else belongs inside the theme directory.
  const allFiles: Array<{ filePath: string; content: string; language: string }> = [];
  for (const f of themeFiles) {
    if (f.filePath.startsWith("pages/")) {
      allFiles.push({ ...f });
    } else {
      allFiles.push({ ...f, filePath: `theme/${f.filePath}` });
    }
  }

  // README at the top of the ZIP.
  allFiles.unshift({
    filePath: "README.txt",
    content:
      `Yappaflow → WordPress one-click bundle\n` +
      `======================================\n\n` +
      `1) Theme install (no re-zipping required)\n` +
      `   • WordPress Admin → Appearance → Themes → Add New → "Upload Theme".\n` +
      `   • Select: wordpress-theme.zip  (already packaged the way WordPress expects).\n` +
      `   • Click "Activate" once the install finishes.\n\n` +
      `2) Pages (Home / About / Contact)\n` +
      `   • Easiest: connect your site in Yappaflow (Deploy Hub → WordPress → Connect)\n` +
      `     and click "Publish". Yappaflow pushes the three pages directly via REST.\n` +
      `   • Manual: open each file in  pages/*.html  and paste its contents into\n` +
      `     a new WordPress Page  (Pages → Add New).\n\n` +
      (identity.products?.length
        ? `3) Products (WooCommerce)\n` +
          `   • Requires the WooCommerce plugin (free — Plugins → Add New).\n` +
          `   • Woo Admin → Products → Import.\n` +
          `   • Select: products.csv\n` +
          `   • Confirm — WooCommerce will create products with variants and images.\n\n` +
          `   (Or use the direct-push flow in Yappaflow and the products are created\n` +
          `   via the WooCommerce REST API.)\n\n`
        : `3) Products\n` +
          `   • The theme ships product-aware but empty. Install WooCommerce\n` +
          `     and add products via  Products → Add New  whenever you're ready.\n\n`) +
      `Tip: Want us to do all this automatically? Connect your WordPress site in\n` +
      `Yappaflow — we push the theme ZIP link, pages, and products in one click.\n\n` +
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
      content:  buildWooCommerceCsv(identity, identity.products),
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
      platform: "wordpress",
      purpose:  f.filePath === "products.csv"
        ? "wordpress-products-csv"
        : f.filePath === "README.txt"
          ? "wordpress-readme"
          : f.filePath.startsWith("pages/")
            ? "wordpress-page"
            : "wordpress-theme",
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

  log(`   → Generated ${allFiles.length} WordPress files for project ${projectId}`);
  return { filesCreated: allFiles.length };
}
