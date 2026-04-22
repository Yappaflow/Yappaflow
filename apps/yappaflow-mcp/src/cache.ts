/**
 * DNA cache backed by SQLite. Keyed by the normalized URL hash so re-runs are ms-fast.
 *
 * Phase 0 uses SQLite because it's zero-ops and runs from a single file on a Railway Volume.
 * Phase 2 may migrate to Postgres if cross-service queries become useful.
 */

import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import Database, { type Database as Db } from "better-sqlite3";
import type { DesignDna } from "./types.js";

export type CacheRow = {
  url: string;
  hash: string;
  capturedAt: string;
  sizeBytes: number;
  dna: DesignDna;
};

export class DnaCache {
  private db: Db;

  constructor(filePath: string) {
    mkdirSync(path.dirname(filePath), { recursive: true });
    this.db = new Database(filePath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dna (
        hash TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        captured_at TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_dna_captured_at ON dna(captured_at);
    `);
  }

  get(url: string): CacheRow | null {
    const hash = hashUrl(url);
    const row = this.db
      .prepare<[string], { url: string; captured_at: string; size_bytes: number; payload: string }>(
        "SELECT url, captured_at, size_bytes, payload FROM dna WHERE hash = ?",
      )
      .get(hash);
    if (!row) return null;
    try {
      return {
        hash,
        url: row.url,
        capturedAt: row.captured_at,
        sizeBytes: row.size_bytes,
        dna: JSON.parse(row.payload) as DesignDna,
      };
    } catch {
      return null;
    }
  }

  put(url: string, dna: DesignDna): CacheRow {
    const hash = hashUrl(url);
    const payload = JSON.stringify(dna);
    this.db
      .prepare(
        "INSERT OR REPLACE INTO dna(hash, url, captured_at, size_bytes, payload) VALUES(?, ?, ?, ?, ?)",
      )
      .run(hash, url, dna.meta.capturedAt, Buffer.byteLength(payload, "utf8"), payload);
    return { hash, url, capturedAt: dna.meta.capturedAt, sizeBytes: Buffer.byteLength(payload, "utf8"), dna };
  }

  close(): void {
    this.db.close();
  }
}

export function hashUrl(url: string): string {
  return createHash("sha256").update(normalizeUrl(url)).digest("hex").slice(0, 24);
}

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    // Drop utm_* tracking params so we don't cache-miss on them.
    for (const key of Array.from(u.searchParams.keys())) {
      if (key.toLowerCase().startsWith("utm_")) u.searchParams.delete(key);
    }
    // Canonical trailing slash behavior.
    if (u.pathname === "/") u.pathname = "";
    return u.toString();
  } catch {
    return url.trim();
  }
}
