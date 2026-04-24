# Onboarding — Claude Code in Cursor for Yappaflow

Short guide to get the multi-agent setup running inside Cursor.

## 1. Install the Claude Code extension in Cursor

1. Open Cursor.
2. Extensions panel (`Cmd+Shift+X`) → search **"Claude Code"** → install the Anthropic
   extension.
3. Sign in via the extension (same Claude account you use elsewhere).
4. Open the Yappaflow folder in Cursor. The extension auto-detects the repo root.

Alternative: run Claude Code in a terminal inside Cursor — `cd` to the repo root and run
`claude`. Same config is picked up.

## 2. What gets auto-loaded

When you start a Claude Code session in this repo, Claude reads:

- `/CLAUDE.md` — the north star.
- The nearest `CLAUDE.md` up the tree from the file you're editing — e.g. editing
  `apps/builder/src/app/page.tsx` pulls in `apps/builder/CLAUDE.md` + root.
- `.claude/agents/*.md` — available sub-agents.
- `.claude/commands/*.md` — available slash commands.
- `.claude/settings.local.json` — tool permissions (already present).

You do not need to paste context. Just prompt.

## 3. How to run the multi-agent flow

One Claude session = one orchestrator. Prompt it in plain language; it picks the right
sub-agents.

### Example 1 — builder-only work

> *"In apps/builder, wire the section insert picker to use the 10 section types from
> @yappaflow/sections. Add a search input at the top of the picker."*

Orchestrator spawns `builder-agent`. Sub-agent reads `apps/builder/CLAUDE.md`, implements,
builds, reports.

### Example 2 — cross-layer change (parallel sub-agents)

> *"Add a pricing-table section type. Wire it into Shopify adapter. Add its property
> panel in the builder."*

Orchestrator uses `/new-section pricing-table "monthly/annual pricing comparison"`:
- spawns `sections-agent` to build the section
- when that returns, spawns `mcp-adapter-agent` + `builder-agent` **in parallel**
- merges the three agents' reports

### Example 3 — schema change (coordinated, careful)

> *"Add a `metadata.clientId` field to SiteProject so we can round-trip through our
> server storage."*

Use `/dna-change "add metadata.clientId to SiteProject"`. The command forces:
1. Plan + user confirmation before any edit.
2. `types-agent` first (serially).
3. Then `sections-agent` + `builder-agent` + `mcp-adapter-agent` in parallel.
4. Final typecheck across the repo.

## 4. Slash commands

Type `/` in the Claude Code prompt to see them. The ones scaffolded for you:

- `/pivot-status` — where are we in the pivot?
- `/new-section <name> "<purpose>"` — scaffold a new section end-to-end.
- `/new-adapter-section <section> <cms>` — add one mapper to one CMS adapter.
- `/dna-change "<description>"` — walk a schema change safely across all consumers.
- `/ui-build-check` — smoke test the yappaflow-ui RSC build chain.

## 5. When to hand-code vs. when to delegate

Delegate to a sub-agent when:
- The work is clearly inside one workspace and has a well-defined DoD.
- You want parallel work across independent workspaces.

Hand-code (or keep it in the orchestrator) when:
- It touches shared schemas (`packages/types`).
- It needs cross-workspace judgement (deciding if something is additive vs. breaking).
- It is research / "read and tell me" (use the Explore / general-purpose agent instead,
  not a specialist).

## 6. If you hit friction

- Sub-agent missing context → add it to the workspace `CLAUDE.md`, not to the agent prompt.
- Same correction twice → likely belongs in the root `CLAUDE.md` rules section.
- Slash command that keeps being useful → add it to `.claude/commands/`.

## 7. One reminder

The light-default-with-dark-toggle rule and the tsup `"use client"` trap are the two
things agents have historically forgotten. Both are spelled out in:
- root `CLAUDE.md` §3
- `packages/yappaflow-ui/CLAUDE.md` (tsup quirk)
- `apps/yappaflow-ui-docs/CLAUDE.md` (theme consumer)

If you see an agent about to ignore either, interrupt early.
