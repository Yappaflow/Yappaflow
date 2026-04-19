import AdmZip from "adm-zip";
import { GeneratedArtifact } from "../models/GeneratedArtifact.model";

export interface ZipResult {
  buffer:   Buffer;
  fileName: string;
  fileCount: number;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "site";
}

export async function buildProjectZip(
  projectId: string,
  agencyId: string,
  opts: { baseName?: string } = {}
): Promise<ZipResult> {
  // Pull all latest-version artifacts for this project.
  const artifacts = await GeneratedArtifact.find({ projectId, agencyId })
    .sort({ filePath: 1 })
    .lean();

  if (artifacts.length === 0) {
    throw new Error("No generated files for this project — run build first");
  }

  const zip = new AdmZip();
  for (const a of artifacts) {
    zip.addFile(a.filePath, Buffer.from(a.content, "utf8"));
  }

  const buffer = zip.toBuffer();
  const base = slugify(opts.baseName || "site");
  return {
    buffer,
    fileName: `${base}.zip`,
    fileCount: artifacts.length,
  };
}
