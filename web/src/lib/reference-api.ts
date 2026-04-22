/**
 * Client for /reference/* on the main Yappaflow API.
 *
 * Wraps the four server routes (health, classify, search, build) with typed helpers
 * that throw on non-2xx. Keeps the UI code declarative. No retries — errors surface
 * so the UI can show them; the pipeline can take 60s+ and a silent retry would lie.
 */

function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("yappaflow_token");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.detail || body.error || message;
    } catch {
      /* no json */
    }
    throw new Error(message || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type Brief = {
  industry: string;
  subcategory: string;
  audience: string;
  content_model: string[];
  palette_character: string;
  motion_ambition: string;
  grid_archetype:
    | "asymmetric_editorial"
    | "centered_marketing"
    | "full_bleed_product"
    | "dense_dashboard"
    | "split_hero"
    | "any";
  named_comparables: string[];
  tone: string;
  preferred_platform?: "html" | "shopify" | "wordpress" | "ikas" | "webflow";
};

export type RankedReference = {
  url: string;
  dna: unknown;
  conceptScore: number;
  craftScore: number;
  paretoRank: number;
  signature?: { concept: string; craft: string };
};

export type BuildResponse = {
  platform: "html" | "shopify" | "wordpress" | "ikas" | "webflow";
  files: Array<{ path: string; content: string }>;
  summary: string;
  nextSteps: string[];
};

export function referenceHealth() {
  return request<{ ok: boolean; configured: boolean; mcp?: { ok: boolean; tools?: string[] } }>(
    "/reference/health",
  );
}

export function classify(transcript: string) {
  return request<{ brief: Brief }>("/reference/classify", {
    method: "POST",
    body: JSON.stringify({ transcript }),
  });
}

export function searchReferencesApi(brief: Brief, k = 8) {
  return request<{ references: RankedReference[] }>("/reference/search", {
    method: "POST",
    body: JSON.stringify({ brief, k }),
  });
}

export function buildSiteApi(input: {
  brief: Brief;
  platform: Brief["preferred_platform"];
  selection?: {
    structure: unknown;
    typography: unknown;
    motion: unknown;
    palette: unknown;
  };
  mergedDna?: unknown;
  content?: unknown;
}) {
  return request<BuildResponse>("/reference/build", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
