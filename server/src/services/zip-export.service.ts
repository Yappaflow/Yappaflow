import AdmZip from "adm-zip";
import { GeneratedArtifact, type IGeneratedArtifact } from "../models/GeneratedArtifact.model";

export interface ZipResult {
  buffer:   Buffer;
  fileName: string;
  fileCount: number;
}

export interface BuildZipOptions {
  baseName?: string;
  /**
   * When "shopify", the download is repacked so the merchant can upload
   * the theme to Shopify in a single click, without re-zipping:
   *
   *   download.zip/
   *     README.txt
   *     shopify-theme.zip   ← exactly what "Upload zip file" in Shopify
   *                           theme admin expects (liquid files at root)
   *     products.csv        ← if the project has products
   *
   * When "wordpress", the download wraps the theme/* files into an inner
   * wordpress-theme.zip that matches WordPress's "Upload Theme" expectations
   * (the ZIP must contain a single top-level folder whose name becomes the
   * theme slug):
   *
   *   download.zip/
   *     README.txt
   *     wordpress-theme.zip ← inner ZIP with a single  yappaflow-site/  folder
   *                           at the root — uploadable at Appearance → Themes
   *                           → Add New → Upload Theme
   *     pages/*.html        ← editor-safe bodies for Home / About / Contact
   *                           (also REST-pushable via /publish)
   *     products.csv        ← WooCommerce Product CSV Importer template
   *                           (when products exist)
   *
   * When unset, we keep the flat layout (every artifact at its
   * `filePath`) — that's still what the non-Shopify flows want.
   */
  repack?: "shopify" | "wordpress";
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "site";
}

/** A minimal file record — the only shape the zip packers need. */
export interface ZipFile {
  filePath: string;
  content:  string;
}

/**
 * Build the inner theme-only ZIP that Shopify's theme uploader expects:
 * every file at the root, no wrapping folder.
 */
export function buildInnerShopifyThemeZip(themeFiles: ZipFile[]): Buffer {
  const inner = new AdmZip();
  for (const f of themeFiles) {
    // Strip the leading "theme/" prefix so the files sit at the ZIP root.
    const key = f.filePath.startsWith("theme/")
      ? f.filePath.slice("theme/".length)
      : f.filePath;
    inner.addFile(key, Buffer.from(f.content, "utf8"));
  }
  return inner.toBuffer();
}

/**
 * Repack an arbitrary file list into the "Shopify download" layout:
 *   {outer.zip}
 *     ├── shopify-theme.zip  (every theme/* file, at the root)
 *     ├── README.txt         (from the input)
 *     └── products.csv       (from the input, if present)
 *
 * Pure (no DB) so it can be unit-tested on fixtures.
 */
export function repackShopifyBundle(files: ZipFile[]): Buffer {
  const themeFiles = files.filter((f) => f.filePath.startsWith("theme/"));
  const extras     = files.filter((f) => !f.filePath.startsWith("theme/"));
  if (themeFiles.length === 0) {
    throw new Error("Shopify repack requested but no theme/* files exist");
  }

  const outer = new AdmZip();
  outer.addFile("shopify-theme.zip", buildInnerShopifyThemeZip(themeFiles));
  for (const f of extras) {
    outer.addFile(f.filePath, Buffer.from(f.content, "utf8"));
  }
  return outer.toBuffer();
}

/**
 * Build the inner theme ZIP that WordPress's "Upload Theme" expects.
 *
 * WordPress derives the theme slug from the NAME OF THE TOP-LEVEL FOLDER
 * inside the uploaded ZIP (not from style.css). So the shape is:
 *
 *   wordpress-theme.zip/
 *     {themeSlug}/
 *       style.css
 *       functions.php
 *       theme.json
 *       ...
 *
 * If two themes with the same folder name get uploaded, WordPress silently
 * overwrites — so we use a unique, slugified base name per project.
 */
export function buildInnerWordPressThemeZip(
  themeFiles: ZipFile[],
  themeSlug: string
): Buffer {
  const inner = new AdmZip();
  for (const f of themeFiles) {
    // Strip "theme/" and put under "{themeSlug}/".
    const stripped = f.filePath.startsWith("theme/")
      ? f.filePath.slice("theme/".length)
      : f.filePath;
    inner.addFile(`${themeSlug}/${stripped}`, Buffer.from(f.content, "utf8"));
  }
  return inner.toBuffer();
}

/**
 * Repack into the "WordPress download" layout. Mirrors repackShopifyBundle
 * but the inner ZIP has a single named folder at the root (WordPress
 * requires it) and non-theme artifacts (pages/*.html, products.csv, README)
 * stay at the outer ZIP root so the merchant can grab them individually.
 *
 * Pure (no DB) so it can be unit-tested on fixtures.
 */
export function repackWordPressBundle(
  files: ZipFile[],
  themeSlug: string
): Buffer {
  const themeFiles = files.filter((f) => f.filePath.startsWith("theme/"));
  const extras     = files.filter((f) => !f.filePath.startsWith("theme/"));
  if (themeFiles.length === 0) {
    throw new Error("WordPress repack requested but no theme/* files exist");
  }

  const outer = new AdmZip();
  outer.addFile(
    "wordpress-theme.zip",
    buildInnerWordPressThemeZip(themeFiles, themeSlug)
  );
  for (const f of extras) {
    outer.addFile(f.filePath, Buffer.from(f.content, "utf8"));
  }
  return outer.toBuffer();
}

export async function buildProjectZip(
  projectId: string,
  agencyId: string,
  opts: BuildZipOptions = {}
): Promise<ZipResult> {
  // Pull all latest-version artifacts for this project.
  const artifacts = (await GeneratedArtifact.find({ projectId, agencyId })
    .sort({ filePath: 1 })
    .lean()) as unknown as IGeneratedArtifact[];

  if (artifacts.length === 0) {
    throw new Error("No generated files for this project — run build first");
  }

  const base = slugify(opts.baseName || "site");

  // ── Shopify-repack path ────────────────────────────────────────────────
  if (opts.repack === "shopify") {
    const buffer = repackShopifyBundle(
      artifacts.map((a) => ({ filePath: a.filePath, content: a.content }))
    );
    const extras = artifacts.filter((a) => !a.filePath.startsWith("theme/"));
    return {
      buffer,
      fileName:  `${base}.zip`,
      fileCount: 1 + extras.length, // inner theme ZIP counts as one file
    };
  }

  // ── WordPress-repack path ──────────────────────────────────────────────
  if (opts.repack === "wordpress") {
    // WordPress uses the top-level folder name inside the uploaded ZIP as
    // the theme slug. Use the same slugified baseName for stability.
    const themeSlug = base;
    const buffer = repackWordPressBundle(
      artifacts.map((a) => ({ filePath: a.filePath, content: a.content })),
      themeSlug
    );
    const extras = artifacts.filter((a) => !a.filePath.startsWith("theme/"));
    return {
      buffer,
      fileName:  `${base}.zip`,
      fileCount: 1 + extras.length, // inner theme ZIP counts as one file
    };
  }

  // ── Default flat path ──────────────────────────────────────────────────
  //
  // Some platforms (e.g. yappaflow — Next.js static export) persist binary
  // artifacts like fonts and favicons. We detect them via `language="binary"`
  // and base64-decode before writing into the ZIP. Everything else stays
  // UTF-8 so the existing platforms (custom static HTML, Shopify liquid,
  // WordPress PHP) are untouched.
  const zip = new AdmZip();
  for (const a of artifacts) {
    const buf =
      a.language === "binary"
        ? Buffer.from(a.content, "base64")
        : Buffer.from(a.content, "utf8");
    zip.addFile(a.filePath, buf);
  }

  return {
    buffer:    zip.toBuffer(),
    fileName:  `${base}.zip`,
    fileCount: artifacts.length,
  };
}
