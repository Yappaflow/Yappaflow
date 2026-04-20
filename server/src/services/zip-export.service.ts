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
   * When unset, we keep the flat layout (every artifact at its
   * `filePath`) — that's still what the non-Shopify flows want.
   */
  repack?: "shopify";
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

  // ── Default flat path ──────────────────────────────────────────────────
  const zip = new AdmZip();
  for (const a of artifacts) {
    zip.addFile(a.filePath, Buffer.from(a.content, "utf8"));
  }

  return {
    buffer:    zip.toBuffer(),
    fileName:  `${base}.zip`,
    fileCount: artifacts.length,
  };
}
