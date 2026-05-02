# Yappaflow AI Engine

## Overview

The AI Engine is the intelligence layer that powers Yappaflow's core pipeline: client conversations → structured requirements → architecture planning → production code generation.

## Architecture

```
server/src/ai/          → Claude API client + type definitions + system prompts
server/src/services/    → AI business logic (analyzer, planner, generator, orchestrator)
server/src/models/      → AISession, ProjectRequirement, GeneratedArtifact
server/src/graphql/     → AI queries/mutations + resolver
server/src/routes/      → Session-scoped SSE streaming endpoint
```

## Pipeline Phases

1. **Analyzing** — Conversation thread → structured requirements + design system
2. **Planning** — Requirements → platform-specific architecture plan
3. **Generating** — Architecture plan → production-ready code files
4. **Reviewing** — Code generated, ready for user review
5. **Ready** — Pipeline complete, project created

## Supported Platforms

- **Shopify** — Liquid themes (sections, snippets, settings_schema.json)
- **WordPress** — PHP themes (template hierarchy, functions.php)
- **IKAS** — IKAS theme templates and configurations
- **Custom** — React/Next.js + Tailwind CSS + Framer Motion

## Design Methodology

Embeds the **top-design** framework — award-winning design principles from elite agencies (Locomotive, Studio Freight, AREA 17, Hello Monday). Includes:

- 10-point scoring rubric (Typography 25%, Composition 25%, Motion 20%, Color 15%, Details 15%)
- Seven Pillars: Typography as Architecture, Layout & Composition, Motion & Animation, Color & Contrast, Scroll-Based Design, Performance, Micro-Interactions
- Banned patterns: default easing, system fonts, pure black/white, generic layouts

## API

### GraphQL Mutations
- `analyzeConversation(signalId)` — Analyze a signal's messages
- `planProject(requirementId)` — Generate architecture plan
- `generateCode(sessionId)` — Generate code from plan
- `runAIPipeline(signalId)` — Full pipeline (async)

### SSE Streaming
- `GET /ai/stream/:sessionId` — Real-time AI processing events

## Configuration

```env
ANTHROPIC_API_KEY=     # Required: https://console.anthropic.com/settings/keys
ANTHROPIC_MODEL=claude-sonnet-4-20250514
ANTHROPIC_MAX_TOKENS=4096
```
