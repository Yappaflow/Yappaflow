# Yappaflow — Claude Code North Star

You are Claude running inside this monorepo via the Claude Code plugin (Cursor or terminal).
This file is the **root context**. Every sub-agent you spawn starts here, then picks up the
nearest workspace-level `CLAUDE.md` for local rules.

> Read order for any task: **this file → the workspace CLAUDE.md you are touching → the
> topical docs in `memory/` only if still unclear**.

---

## 1. Mission (current north star)

Yappaflow turns agency conversations into shippable websites.
**As of 2026-04-23 we are in the Builder-First Pivot** — see
[`BUILDER-PIVOT.md`](./BUILDER-PIVOT.md) for the full brief. One-line version:

```
signal → AI → SiteProject (canonical JSON) → in-house builder → deterministic CMS conversion → ZIP/push
```

The creative work stays in the AI. The CMS translation becomes a mechanical transform from
`SiteProject` to Shopify / Webflow / WordPress / IKAS via per-section mappers.

Active phase: **Phase 7 (done)** → **Phase 8 `apps/builder` MVP (in progress)**. Keep
[`PHASES.md`](./PHASES.md) as the live status board.

---

## 2. Monorepo map

Turbo + npm workspaces. Glob: `web`, `server`, `shared`, `tunnel`, `packages/*`, `apps/*`.

| Path | Role | Has CLAUDE.md |
|---|---|---|
| `apps/builder` | Next.js in-house site builder (the pivot) | yes |
| `apps/yappaflow-mcp` | MCP server: reference pipeline + `build_site_project` + CMS adapters | yes |
| `apps/yappaflow-ui-docs` | Docs site for `packages/yappaflow-ui` | yes |
| `packages/types` | `@yappaflow/types` — `DesignDna`, `Brief`, `SiteProject` (load-bearing) | yes |
| `packages/sections` | 10 MVP section schemas + default content + renderers | yes |
| `packages/yappaflow-ui` | Public component library (art-gallery aesthetic) | yes |
| `web/` | Next.js agency dashboard | yes |
| `server/` | Node/Express backend (auth, OTP, ingestion) | yes |
| `app/` | React Native agency app | yes |
| `shared/` | Legacy shared types — prefer `packages/types` for new work | yes |
| `tunnel/` | Local cloudflare/ngrok helper | — |
| `marketing/`, `sites/`, `yf-out/` | Static/generated artifacts — do not edit by hand | — |
| `memory/` | Pre-existing topical docs (init, data, model, LLM, UILibrary) | yes (legacy) |

---

## 3. Non-negotiable rules (every agent, every task)

These come from prior incidents — don't relitigate.

1. **Light theme is the default.** Every generated site must ship a dark-theme toggle.
2. **AI vendor:** DeepSeek primary, OpenRouter fallback. Both OpenAI-SDK-compatible. Streaming
   on. **No self-hosted GPUs. Do not add Anthropic as runtime dependency** for generation —
   Claude is the dev-time agent, not the generator.
3. **`DesignDna` / `SiteProject` schemas are load-bearing.** If you change the shape, bump
   `schemaVersion` and update every consumer (MCP tools, builder, adapters, types re-exports)
   in the **same commit**. No silent drifts.
4. **`packages/yappaflow-ui` tsup quirks:** when editing `tsup.config.ts`, cross-layer
   imports must be externalized **and** `"use client"` banners re-attached in `onSuccess`.
   Break either and Next.js RSC builds fail. Details in the package's CLAUDE.md.
5. **CMS adapters ship by demand.** Only the agency's chosen platform is production-grade.
   Other adapters stay canonical-structure skeletons with TODOs — don't fake completeness.
6. **Reference pipeline runs as its own Railway service** (`apps/yappaflow-mcp`). The main
   API proxies via `/reference/*` REST. Don't inline MCP work into `server/`.
7. **yappaflow-mcp calls an LLM in three stages** — *analysis*, *planning*, *generation*.
   Call sites ask for the **stage**, not the model. Models map via env overrides; see
   `apps/yappaflow-mcp/CLAUDE.md`.
8. **Builder-pivot scope discipline.** If a task isn't in the BUILDER-PIVOT.md Phase 7–13 list,
   flag it as "out-of-pivot" before doing the work. Ship the pivot first.

---

## 4. How to work multi-agent in this repo

One Claude session (in Cursor or terminal) orchestrates sub-agents via the Task tool.
Sub-agents are defined in [`.claude/agents/`](./.claude/agents/). Spawn them in parallel
when the work is independent; serially when one's output feeds the next.

**Rule of thumb:**

- **One specialist, one workspace.** `builder-agent` touches `apps/builder`;
  `mcp-adapter-agent` touches `apps/yappaflow-mcp/src/adapters-v2/`; etc.
- **Contract changes are the orchestrator's job.** If a task changes a shared schema
  (`packages/types`), don't delegate it to a specialist — do it yourself, then spawn
  specialists to update each consumer in parallel.
- **Give every sub-agent the success check.** Not "update X" but "update X and confirm
  `npm run build` succeeds in that workspace". Agents can't self-check unless told to.

See [`.claude/README.md`](./.claude/README.md) for the full playbook.

---

## 5. Useful root commands

```bash
npm run dev          # web + server (main agency stack)
npm run dev:all      # everything (turbo)
npm run build:ui     # packages/yappaflow-ui (remember the tsup quirk)
npm run start:mcp    # apps/yappaflow-mcp production start
```

Turbo pipelines live in `turbo.json`. Workspace names use `@yappaflow/*` for private
workspaces and bare `yappaflow-ui` for the publishable library.

---

## 6. Where to look when stuck

- Product direction: `BUILDER-PIVOT.md`, `PHASES.md`.
- Legacy / deep dives: `memory/{init,data,model,LLM,UILibrary}/CLAUDE.md`.
- Parallel project kickoffs (not daily context): `liman-plan.md`,
  `yappaflow-console-plan.md` — only open if the task mentions them.
- Runtime testing without a real Anthropic key: `TESTING-WITHOUT-ANTHROPIC-KEY.md`.
