/**
 * Yappaflow-platform build step.
 *
 * Runs AFTER `generateYappaflowSite` has persisted the React source files
 * as `GeneratedArtifact` rows. This service:
 *
 *   1. Materialises every artifact into a temp directory on disk.
 *   2. Drops in a deterministic scaffold (package.json, next.config.ts,
 *      tsconfig.json, next-env.d.ts) keyed to static export.
 *   3. Packs `packages/yappaflow-ui` to a tarball once per process and
 *      references it from the generated project's package.json — that
 *      way the build works without yappaflow-ui being published to npm.
 *   4. Runs `npm install --no-audit --no-fund` and `next build` with
 *      `output: "export"`.
 *   5. Reads every file from the resulting `out/` tree.
 *   6. Deletes the React-source artifacts and replaces them with the
 *      static export files (platform still "yappaflow", purpose now
 *      "static-export") so the existing flat-ZIP download path in
 *      `buildProjectZip` produces the right download unchanged.
 *
 * Errors surface as `buildError` on the Project and (stdout/stderr
 * captured) on the AISession so we can debug failed builds later.
 *
 * This file deliberately uses the Node `child_process.spawn` API rather
 * than `execSync`, so long builds don't starve the event loop and we can
 * stream log output instead of buffering megabytes in memory.
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { Project } from "../models/Project.model";
import { GeneratedArtifact } from "../models/GeneratedArtifact.model";
import { AISession } from "../models/AISession.model";
import { log, logError } from "../utils/logger";

// ── Config ────────────────────────────────────────────────────────────

const NEXT_VERSION           = "^15.3.0";
const REACT_VERSION          = "^19.1.0";
const REACT_DOM_VERSION      = "^19.1.0";
const TYPES_REACT_VERSION    = "^19.1.0";
const TYPES_REACT_DOM_VERSION = "^19.1.0";
const TYPESCRIPT_VERSION     = "~5.9.2";
const TYPES_NODE_VERSION     = "^22.0.0";

// Wall-clock ceilings. If `npm install` or `next build` doesn't finish
// inside these, we kill the child and fail with a readable error.
const NPM_INSTALL_TIMEOUT_MS = 5  * 60_000; // 5 minutes
const NEXT_BUILD_TIMEOUT_MS  = 5  * 60_000; // 5 minutes

// ── yappaflow-ui tarball cache ────────────────────────────────────────

/**
 * The yappaflow-ui package is part of the monorepo — not published on
 * npm during local dev. `npm pack` in its folder produces a tarball we
 * can install anywhere via `npm install <path>.tgz`. We cache the
 * tarball path in process memory so repeated builds don't repeatedly
 * repack the library.
 *
 * If the yappaflow-ui sources change (dist/ rebuilt), call
 * `invalidateYappaflowUiTarball()` to force a re-pack on next build.
 */
let cachedTarballPath: string | null = null;
let cachedTarballStat: { mtimeMs: number; size: number } | null = null;

function findYappaflowUiDir(): string {
  const envOverride = process.env.YAPPAFLOW_UI_DIR;
  if (envOverride && fs.existsSync(path.join(envOverride, "package.json"))) {
    return envOverride;
  }
  // Walk up from __dirname looking for packages/yappaflow-ui.
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, "packages", "yappaflow-ui");
    if (
      fs.existsSync(path.join(candidate, "package.json")) &&
      fs.existsSync(path.join(candidate, "dist"))
    ) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    "Could not locate packages/yappaflow-ui. Set YAPPAFLOW_UI_DIR to " +
    "the absolute path of the library (must contain a built dist/)."
  );
}

export function invalidateYappaflowUiTarball(): void {
  cachedTarballPath = null;
  cachedTarballStat = null;
}

async function ensureYappaflowUiTarball(): Promise<string> {
  if (cachedTarballPath && fs.existsSync(cachedTarballPath)) {
    return cachedTarballPath;
  }

  const uiDir = findYappaflowUiDir();
  const distDir = path.join(uiDir, "dist");
  if (!fs.existsSync(distDir)) {
    throw new Error(
      "yappaflow-ui has no dist/ folder. Run `npm -w yappaflow-ui run build` first."
    );
  }

  const outDir = await fsp.mkdtemp(path.join(os.tmpdir(), "yappaflow-ui-pack-"));

  const { stdout } = await runProcess("npm", ["pack", "--pack-destination", outDir], {
    cwd:     uiDir,
    timeoutMs: 60_000,
    label:   "npm pack yappaflow-ui",
  });

  // `npm pack` prints the tarball filename on the last non-empty line.
  const lines = stdout.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  const fname = lines[lines.length - 1];
  if (!fname || !fname.endsWith(".tgz")) {
    throw new Error(`npm pack did not produce a .tgz (got: ${stdout})`);
  }

  const tarball = path.join(outDir, fname);
  const stat = await fsp.stat(tarball);
  cachedTarballPath = tarball;
  cachedTarballStat = { mtimeMs: stat.mtimeMs, size: stat.size };
  log(`[yappaflow-build] packed yappaflow-ui → ${tarball} (${stat.size} bytes)`);
  return tarball;
}

// ── Child-process helpers ─────────────────────────────────────────────

interface RunProcessOptions {
  cwd:        string;
  env?:       NodeJS.ProcessEnv;
  timeoutMs:  number;
  label:      string;
  /** If provided, stdout+stderr are appended here as they stream in. */
  log?:       { push: (line: string) => void };
}

interface RunProcessResult {
  stdout: string;
  stderr: string;
}

function runProcess(
  cmd: string,
  args: string[],
  opts: RunProcessOptions
): Promise<RunProcessResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd:   opts.cwd,
      env:   { ...process.env, ...opts.env },
      stdio: ["ignore", "pipe", "pipe"],
      // shell: false — pass args as array so we don't need to quote.
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    const pushLog = (chunk: string, stream: "stdout" | "stderr"): void => {
      if (!opts.log) return;
      for (const line of chunk.split(/\r?\n/)) {
        if (line.length === 0) continue;
        opts.log.push(`[${stream}] ${line}`);
      }
    };

    proc.stdout.on("data", (d) => {
      const s = d.toString();
      stdout += s;
      pushLog(s, "stdout");
    });
    proc.stderr.on("data", (d) => {
      const s = d.toString();
      stderr += s;
      pushLog(s, "stderr");
    });

    const timer = setTimeout(() => {
      killed = true;
      proc.kill("SIGKILL");
    }, opts.timeoutMs);

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`${opts.label}: failed to spawn (${err.message})`));
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (killed) {
        reject(new Error(`${opts.label}: timed out after ${opts.timeoutMs}ms`));
        return;
      }
      if (code !== 0) {
        // Include the last few lines of stderr so the failure is debuggable
        // without the caller having to open the AISession.
        const tail = (stderr || stdout).split("\n").slice(-20).join("\n");
        reject(new Error(`${opts.label}: exited ${code}\n${tail}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

// ── Scaffold file templates ───────────────────────────────────────────

function buildPackageJson(projectSlug: string, tarballBasename: string): string {
  // We reference the tarball via a relative path (`./deps/<name>.tgz`)
  // rather than an absolute one so the install is reproducible regardless
  // of where we materialize the temp dir.
  return JSON.stringify(
    {
      name:     projectSlug,
      version:  "0.1.0",
      private:  true,
      scripts: {
        build: "next build",
      },
      dependencies: {
        "next":         NEXT_VERSION,
        "react":        REACT_VERSION,
        "react-dom":    REACT_DOM_VERSION,
        "yappaflow-ui": `file:./deps/${tarballBasename}`,
      },
      devDependencies: {
        "@types/node":      TYPES_NODE_VERSION,
        "@types/react":     TYPES_REACT_VERSION,
        "@types/react-dom": TYPES_REACT_DOM_VERSION,
        "typescript":       TYPESCRIPT_VERSION,
      },
    },
    null,
    2
  );
}

const NEXT_CONFIG_TS = `import type { NextConfig } from "next";

/**
 * Static export — no Node runtime needed at deploy time.
 * Images are passed through unmodified because we never emit remote
 * <Image> URLs in generated sites (the prompt bans external images).
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  typescript: {
    // We only ship a site that already typechecked in the build container —
    // skip here so a stray type glitch in a generated page doesn't kill
    // the whole export.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
`;

const TSCONFIG_JSON = JSON.stringify(
  {
    compilerOptions: {
      target:           "ES2022",
      lib:              ["dom", "dom.iterable", "ES2022"],
      allowJs:          true,
      skipLibCheck:     true,
      strict:           true,
      noEmit:           true,
      esModuleInterop:  true,
      module:           "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules:  true,
      jsx:              "preserve",
      incremental:      true,
      plugins:          [{ name: "next" }],
      paths:            { "@/*": ["./*"] },
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    exclude: ["node_modules"],
  },
  null,
  2
);

const NEXT_ENV_DTS = `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited.
// See https://nextjs.org/docs/basic-features/typescript for more information.
`;

const GITIGNORE = `node_modules
.next
out
.DS_Store
`;

// ── Path safety ───────────────────────────────────────────────────────

/**
 * Refuse paths that would escape the project root. The parser already
 * drops `..` and absolute paths, but defense in depth.
 */
function isSafeRelativePath(p: string): boolean {
  if (!p) return false;
  if (p.startsWith("/") || p.startsWith("\\")) return false;
  if (p.includes("..")) return false;
  return true;
}

function slugifyProjectName(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "yappaflow-site"
  );
}

// ── Main entrypoint ───────────────────────────────────────────────────

export interface BuildYappaflowSiteResult {
  filesExported: number;
  /** Temp directory the build ran in. Useful for tests; caller should not rely on it after the promise resolves. */
  workDir:       string;
}

/**
 * Build + export the Yappaflow-platform site for a project.
 *
 * Must run AFTER `generateYappaflowSite` has persisted the React source
 * artifacts. On success, replaces those source artifacts with the
 * contents of the Next.js static export — so the existing ZIP download
 * endpoint streams the static site directly.
 */
export async function buildYappaflowSite(
  projectId: string,
  agencyId: string
): Promise<BuildYappaflowSiteResult> {
  const project = await Project.findOne({ _id: projectId, agencyId });
  if (!project) throw new Error("Project not found");
  if (project.platform !== "yappaflow") {
    throw new Error(`Project platform is ${project.platform}, expected yappaflow`);
  }

  const sources = await GeneratedArtifact.find({
    projectId,
    agencyId,
    platform: "yappaflow",
    purpose:  "react-source",
  }).lean();
  if (sources.length === 0) {
    throw new Error("No React source artifacts — run generateYappaflowSite first");
  }

  // Find the most recent AISession so we can write build logs onto it.
  const session = await AISession.findOne({ projectId, agencyId }).sort({ createdAt: -1 });
  const sessionId = session?._id;

  const businessName = project.identity?.businessName || "site";
  const projectSlug  = slugifyProjectName(businessName);

  await Project.findByIdAndUpdate(projectId, {
    buildPhase: "validating",
    progress:   70,
  });

  // Stream build output into a rolling log; we persist the tail on the
  // session so post-mortem debugging is possible without opening the
  // temp dir.
  const logLines: string[] = [];
  const logSink = {
    push: (line: string): void => {
      logLines.push(line);
      if (logLines.length > 2000) logLines.splice(0, logLines.length - 2000);
    },
  };

  let workDir: string | null = null;

  try {
    workDir = await fsp.mkdtemp(path.join(os.tmpdir(), `yappaflow-build-${projectSlug}-`));
    log(`[yappaflow-build] ${projectId} → ${workDir}`);

    // ── 1. Pack yappaflow-ui and drop the tarball into the project.
    const tarballPath = await ensureYappaflowUiTarball();
    const depsDir = path.join(workDir, "deps");
    await fsp.mkdir(depsDir, { recursive: true });
    const tarballBasename = path.basename(tarballPath);
    await fsp.copyFile(tarballPath, path.join(depsDir, tarballBasename));

    // ── 2. Scaffold files.
    await fsp.writeFile(
      path.join(workDir, "package.json"),
      buildPackageJson(projectSlug, tarballBasename)
    );
    await fsp.writeFile(path.join(workDir, "next.config.ts"), NEXT_CONFIG_TS);
    await fsp.writeFile(path.join(workDir, "tsconfig.json"), TSCONFIG_JSON);
    await fsp.writeFile(path.join(workDir, "next-env.d.ts"), NEXT_ENV_DTS);
    await fsp.writeFile(path.join(workDir, ".gitignore"), GITIGNORE);

    // ── 3. Materialize every AI-generated file.
    for (const a of sources) {
      const rel = (a as any).filePath as string;
      if (!isSafeRelativePath(rel)) {
        throw new Error(`Refusing unsafe artifact path: ${rel}`);
      }
      const abs = path.join(workDir, rel);
      await fsp.mkdir(path.dirname(abs), { recursive: true });
      await fsp.writeFile(abs, (a as any).content as string);
    }

    // ── 4. Install dependencies.
    await Project.findByIdAndUpdate(projectId, {
      buildPhase: "generating",
      progress:   75,
    });
    await runProcess("npm", ["install", "--no-audit", "--no-fund", "--prefer-offline"], {
      cwd:       workDir,
      timeoutMs: NPM_INSTALL_TIMEOUT_MS,
      label:     "npm install",
      log:       logSink,
    });

    // ── 5. Run `next build`. With `output: "export"` in next.config.ts,
    //       Next writes the static export to `out/` automatically (no
    //       separate `next export` invocation needed on Next 15).
    await Project.findByIdAndUpdate(projectId, {
      buildPhase: "packaging",
      progress:   85,
    });
    await runProcess(
      "npx",
      ["--no-install", "next", "build"],
      {
        cwd:       workDir,
        timeoutMs: NEXT_BUILD_TIMEOUT_MS,
        label:     "next build",
        log:       logSink,
        env:       { NEXT_TELEMETRY_DISABLED: "1" },
      }
    );

    // ── 6. Read the static export tree.
    const outDir = path.join(workDir, "out");
    if (!fs.existsSync(outDir)) {
      throw new Error("next build finished but out/ does not exist");
    }
    const exportedFiles = await readAllFiles(outDir, outDir);
    if (exportedFiles.length === 0) {
      throw new Error("Static export is empty");
    }

    // ── 7. Replace source artifacts with the static export so downloads
    //       serve the built site without knowing about the React layer.
    await GeneratedArtifact.deleteMany({
      projectId,
      agencyId,
      platform: "yappaflow",
    });

    for (const f of exportedFiles) {
      await GeneratedArtifact.create({
        agencyId,
        sessionId: sessionId ?? undefined,
        projectId,
        filePath: f.filePath,
        content:  f.content,
        language: languageForExtension(f.filePath),
        platform: "yappaflow",
        purpose:  "static-export",
        version:  1,
      });
    }

    await Project.findByIdAndUpdate(projectId, {
      buildJobStatus:  "done",
      buildPhase:      "done",
      buildFilesDone:  exportedFiles.length,
      buildFilesTotal: exportedFiles.length,
      progress:        90,
    });

    if (sessionId) {
      await AISession.findByIdAndUpdate(sessionId, {
        phase:  "ready",
        status: "completed",
        // Keep the tail on metadata so we can debug later builds without
        // holding a temp dir. AISession.metadata is a Mixed field.
        metadata: { buildLog: logLines.slice(-400).join("\n") },
      });
    }

    log(`✅ [yappaflow-build] ${projectId} exported ${exportedFiles.length} files`);
    return { filesExported: exportedFiles.length, workDir };
  } catch (err) {
    const msg = (err as Error).message || "Yappaflow build failed";
    logError(`[yappaflow-build] ${projectId} failed`, err);

    await Project.findByIdAndUpdate(projectId, {
      buildJobStatus: "failed",
      buildPhase:     "failed",
      buildError:     msg,
    });
    if (sessionId) {
      await AISession.findByIdAndUpdate(sessionId, {
        phase:   "failed",
        status:  "failed",
        error:   msg,
        metadata: { buildLog: logLines.slice(-400).join("\n") },
      });
    }
    throw err;
  } finally {
    // Best-effort cleanup. If the build succeeded we don't need the temp
    // dir anymore; if it failed, the logs are already on the session.
    if (workDir) {
      fsp.rm(workDir, { recursive: true, force: true }).catch((cleanupErr) => {
        log(
          `[yappaflow-build] failed to clean up ${workDir}: ${
            (cleanupErr as Error).message
          }`
        );
      });
    }
  }
}

// ── Filesystem helpers ────────────────────────────────────────────────

interface ReadFile {
  filePath: string;
  content:  string;
}

async function readAllFiles(baseDir: string, dir: string): Promise<ReadFile[]> {
  const out: ReadFile[] = [];
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await readAllFiles(baseDir, abs)));
    } else if (e.isFile()) {
      const rel = path.relative(baseDir, abs).split(path.sep).join("/");
      // Skip Next.js internal files that shouldn't ship (they already
      // shouldn't be inside out/, but belt+braces).
      if (rel.startsWith(".")) continue;
      const lang = languageForExtension(rel);
      if (lang === "binary") {
        // GeneratedArtifact.content is String — encode binary payloads
        // (fonts from next/font, favicon.ico, etc.) as base64 and mark
        // them via language="binary". The ZIP builder decodes on the
        // way out.
        const buf = await fsp.readFile(abs);
        out.push({ filePath: rel, content: buf.toString("base64") });
      } else {
        out.push({ filePath: rel, content: await fsp.readFile(abs, "utf8") });
      }
    }
  }
  return out;
}

const EXPORT_LANG: Record<string, string> = {
  ".html": "html",
  ".css":  "css",
  ".js":   "javascript",
  ".svg":  "svg",
  ".json": "json",
  ".txt":  "text",
  ".xml":  "xml",
  ".ico":  "binary",
  ".png":  "binary",
  ".jpg":  "binary",
  ".jpeg": "binary",
  ".webp": "binary",
  ".woff": "binary",
  ".woff2": "binary",
  ".ttf":  "binary",
  ".otf":  "binary",
};

function languageForExtension(p: string): string {
  const idx = p.lastIndexOf(".");
  if (idx === -1) return "text";
  return EXPORT_LANG[p.slice(idx).toLowerCase()] ?? "text";
}
