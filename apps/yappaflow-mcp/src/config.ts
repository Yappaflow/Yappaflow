/**
 * Central env-var parsing. Every phase reads from here so Railway config has a single shape.
 *
 * Model split (per yappaflow-ai-vendor memory):
 *   AI_ANALYSIS_MODEL  → cheap structured tasks (brief classification, DNA reading, ranking)
 *   AI_PLANNING_MODEL  → site planning and DNA merging reasoning
 *   AI_GENERATION_MODEL → HTML / theme code generation
 */

export type Config = {
  port: number;
  host: string;
  mcpAuthToken: string | null;
  cachePath: string;
  /** When true, tools that need external keys fall back to deterministic fixtures. */
  offlineMode: boolean;
  openrouter: {
    apiKey: string | null;
    baseUrl: string;
    analysisModel: string;
    planningModel: string;
    generationModel: string;
  };
  exa: {
    apiKey: string | null;
    baseUrl: string;
  };
  voyage: {
    apiKey: string | null;
    baseUrl: string;
    model: string;
  };
};

function env(name: string, fallback?: string): string | null {
  const v = process.env[name];
  if (v !== undefined && v !== "") return v;
  return fallback ?? null;
}

export function loadConfig(): Config {
  const offlineMode =
    (env("YAPPAFLOW_OFFLINE") ?? "").toLowerCase() === "1" ||
    (env("YAPPAFLOW_OFFLINE") ?? "").toLowerCase() === "true";
  return {
    port: Number.parseInt(env("PORT", "3000") ?? "3000", 10),
    host: env("HOST", "0.0.0.0") ?? "0.0.0.0",
    mcpAuthToken: env("MCP_AUTH_TOKEN"),
    cachePath: env("SQLITE_PATH", "data/dna-cache.db") ?? "data/dna-cache.db",
    offlineMode,
    openrouter: {
      apiKey: env("OPENROUTER_API_KEY"),
      baseUrl: env("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")!,
      analysisModel: env("AI_ANALYSIS_MODEL", "google/gemini-2.5-flash-lite")!,
      planningModel: env("AI_PLANNING_MODEL", "anthropic/claude-sonnet-4-6")!,
      generationModel: env("AI_GENERATION_MODEL", "anthropic/claude-sonnet-4-6")!,
    },
    exa: {
      apiKey: env("EXA_API_KEY"),
      baseUrl: env("EXA_BASE_URL", "https://api.exa.ai")!,
    },
    voyage: {
      apiKey: env("VOYAGE_API_KEY"),
      baseUrl: env("VOYAGE_BASE_URL", "https://api.voyageai.com/v1")!,
      model: env("VOYAGE_MODEL", "voyage-3-lite")!,
    },
  };
}

export function assertAuth(config: Config, header: string | undefined): void {
  if (!config.mcpAuthToken) return; // auth disabled in dev
  const expected = `Bearer ${config.mcpAuthToken}`;
  if (header !== expected) {
    const err = new Error("unauthorized");
    (err as Error & { statusCode?: number }).statusCode = 401;
    throw err;
  }
}
