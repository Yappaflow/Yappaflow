# Initial prompt for the next session

Paste the block below into a fresh Claude session. It orients Claude on the pivot without relying on the previous conversation's context.

---

We're pivoting Yappaflow from "AI generates CMS code directly" to "AI generates a canonical SiteProject → agency tweaks in an in-house builder → deterministic CMS conversion at export."

**First things to read, in order:**

1. `/sessions/keen-ecstatic-babbage/mnt/Yappaflow/BUILDER-PIVOT.md` — full architecture brief. This is the source of truth for every decision we've locked. Read it before proposing anything.
2. `/sessions/keen-ecstatic-babbage/mnt/.auto-memory/MEMORY.md` and whichever memory files it links that look relevant — project context, AI vendor strategy, DNA schema load-bearing, adapters ship by demand.
3. `/sessions/keen-ecstatic-babbage/mnt/Yappaflow/PHASES.md` — existing phase ledger (we're continuing from Phase 7).

**What we're starting with in this session: Phase 7 — canonical format + section library foundation.**

Specifically:
- Define the `SiteProject`, `Page`, `Section` types in a new `packages/types/` workspace package.
- Scaffold `packages/sections/` with the 10 MVP section types (hero, header, footer, announcement-bar, feature-grid, feature-row, product-grid, cta-band, testimonial, rich-text). For each: `schema.ts`, `default.ts`, `variants.ts`, `render.tsx` stub, `index.ts`.
- Update `apps/yappaflow-mcp/src/tools/build-site.ts` so its output shape becomes a `SiteProject` JSON (not platform-specific files). The existing `adapters/*` paths can stay as-is for now — we'll replace them with `adapters-v2/` in Phase 10.
- Don't touch the builder yet — that's Phase 8. Don't touch adapter-v2 — that's Phase 10. Don't regress the Shopify adapter we just shipped — it needs to keep working against production while we build the parallel v2 path.

**Things to check before writing code:**

- `packages/yappaflow-ui/` has tsup quirks (cross-layer externalization + "use client" re-banner in onSuccess — see memory). `packages/types/` and `packages/sections/` will hit the same build system. Mirror its tsup config.
- `DesignDna` schema is load-bearing. `SiteProject` consumes it. If the new types conflict with the current DNA shape, surface it — don't silently diverge.

**Workflow:**
- Present a task list before writing files.
- Use Plan / Explore agents for any open-ended questions before diving in.
- Always end with a verification step (typecheck the new packages, smoke-test that `build-site` still returns valid JSON).

Start by reading `BUILDER-PIVOT.md` end-to-end, then give me a task breakdown for Phase 7 that I can approve before you touch code.

---

**(end of paste-in)**
