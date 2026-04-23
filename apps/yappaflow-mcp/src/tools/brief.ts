/**
 * Brief — re-exported from `@yappaflow/types/brief`.
 *
 * The canonical declaration moved there as part of the Phase 7 builder-first
 * pivot so the builder app and the CMS adapters-v2 can read it without
 * depending on this MCP app. Keep this file as a re-export: every MCP consumer
 * still imports `from "./brief.js"` or `from "../tools/brief.js"` and nothing
 * changes. Delete this file only after all MCP imports have been repointed —
 * not worth the churn for Phase 7.
 */

export { BriefSchema, FIXTURE_BRIEF, briefToSentence } from "@yappaflow/types";
export type { Brief } from "@yappaflow/types";
