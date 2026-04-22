# Yappaflow MCP — curl cheatsheet

Every `/rpc/:tool` endpoint, end-to-end, with pipeline chaining.
Copy the env setup, then run the numbered curls in order for a full pipeline test.

## 0. Setup (run once per shell)

```bash
export MCP_URL='https://yappaflow-production.up.railway.app'
export MCP_TOKEN='<paste your MCP_AUTH_TOKEN here>'
```

`jq` makes the chained commands readable. Install with `brew install jq` if you don't have it.

## 1. Health — no auth required

```bash
curl -s "$MCP_URL/health" | jq
```

Expected: `ok: true`, `offlineMode: false`, `tools: [6 tools]`, `cacheSizeBytes: <number>`.

## 2. Auth sanity — should 401

```bash
curl -i -X POST "$MCP_URL/rpc/classify_brief" \
  -H "Content-Type: application/json" \
  -d '{"transcript":"test"}'
```

Expected: HTTP 401 with `unauthorized`. Confirms the bearer gate works.

## 3. classify_brief — LLM analysis stage

```bash
curl -s -X POST "$MCP_URL/rpc/classify_brief" \
  -H "Authorization: Bearer $MCP_TOKEN" \
  -H "Content-Type: application/json" \
  --max-time 60 \
  -d '{
    "transcript": "Boutique coffee roaster in Samsun. Wants a warm minimal site with a story page, online shop, and subscription tier. Audience is 25-40 specialty coffee drinkers. Turkish + English."
  }' | tee /tmp/yf-brief.json | jq
```

Writes the brief to `/tmp/yf-brief.json` so later steps can reuse it.

## 4. extract_design_dna — single URL

```bash
curl -s -X POST "$MCP_URL/rpc/extract_design_dna" \
  -H "Authorization: Bearer $MCP_TOKEN" \
  -H "Content-Type: application/json" \
  --max-time 90 \
  -d '{ "url": "https://stripe.com" }' | tee /tmp/yf-dna-stripe.json | jq '.result | {typography: .typography.families, colors: .colors.summary.accents, motion: .motion.keyframes | length, framework: .stack.framework}'
```

First hit goes to Playwright (30–60s). Re-run it — second hit is instant (SQLite cache).

Force a cache miss:

```bash
curl -s -X POST "$MCP_URL/rpc/extract_design_dna" \
  -H "Authorization: Bearer $MCP_TOKEN" \
  -H "Content-Type: application/json" \
  --max-time 90 \
  -d '{ "url": "https://stripe.com", "forceRefresh": true }' | jq
```

## 5. search_references — heaviest path (Exa + 8× Playwright)

```bash
BRIEF=$(jq -c '.result' /tmp/yf-brief.json)

curl -s -X POST "$MCP_URL/rpc/search_references" \
  -H "Authorization: Bearer $MCP_TOKEN" \
  -H "Content-Type: application/json" \
  --max-time 150 \
  -d "{ \"brief\": $BRIEF, \"k\": 8 }" | tee /tmp/yf-refs.json | jq '.result.references[] | {url, paretoRank, conceptScore, craftScore}'
```

Response shape is `{ queries, references, offlineMode }` — the array lives at `.result.references`, not `.result` directly.
Expected: 6–8 refs under `.references`, `offlineMode: false`, at least one `paretoRank: 0` item.
The Pareto frontier is the rank-0 subset — that's what you'd show first in the UI.

## 6. rank_references — re-rank an arbitrary candidate set

Skip this if you ran `search_references` (which ranks internally). Use when you want to rank a set of URLs you already extracted manually.

```bash
curl -s -X POST "$MCP_URL/rpc/rank_references" \
  -H "Authorization: Bearer $MCP_TOKEN" \
  -H "Content-Type: application/json" \
  --max-time 60 \
  -d "$(jq -c '{
    brief: (input | .result),
    references: [.result.references[] | {url, dna}]
  }' /tmp/yf-brief.json /tmp/yf-refs.json)" | jq '.result[] | {url, paretoRank, conceptScore, craftScore}'
```

## 7. merge_dna — pick 4 refs, blend by field ownership

Builds the blend payload from the top 4 refs in the search result. Structure from #1, typography from #2, motion from #3, palette from #4. Change the indices to try other combinations.

```bash
curl -s -X POST "$MCP_URL/rpc/merge_dna" \
  -H "Authorization: Bearer $MCP_TOKEN" \
  -H "Content-Type: application/json" \
  --max-time 30 \
  -d "$(jq -c '{
    blend: {
      structure_from: .result.references[0].dna,
      typography_from: .result.references[1].dna,
      motion_from:    .result.references[2].dna,
      palette_from:   .result.references[3].dna
    }
  }' /tmp/yf-refs.json)" | tee /tmp/yf-merged.json | jq '.result | {schema: .schemaVersion, fonts: .typography.families, palette: .colors.summary.accents, grid: .grid.rhythm.maxWidth}'
```

## 8. build_site — per-platform generation

### 8a. HTML — fully wired, quickest to verify

```bash
curl -s -X POST "$MCP_URL/rpc/build_site" \
  -H "Authorization: Bearer $MCP_TOKEN" \
  -H "Content-Type: application/json" \
  --max-time 180 \
  -d "$(jq -c -n \
    --slurpfile b /tmp/yf-brief.json \
    --slurpfile m /tmp/yf-merged.json \
    '{brief: $b[0].result, mergedDna: $m[0].result, platform: "html"}')" \
  | tee /tmp/yf-build-html.json | jq '.result | {platform, fileCount: (.files | length), files: [.files[].path], nextSteps}'
```

Dump the files:

```bash
mkdir -p ./yf-out-html && \
  jq -r '.result.files[] | @base64' /tmp/yf-build-html.json | \
  while read -r row; do
    path=$(echo "$row" | base64 -d | jq -r '.path')
    mkdir -p "./yf-out-html/$(dirname "$path")"
    echo "$row" | base64 -d | jq -r '.content' > "./yf-out-html/$path"
  done
ls -la ./yf-out-html
```

### 8b. Shopify — OS 2.0 Liquid skeleton

Swap `"html"` for `"shopify"` in the payload above. Outputs `layout/theme.liquid`, `sections/*.liquid`, `templates/index.json`, `config/settings_schema.json`, `assets/base.css`, `locales/en.default.json`.

```bash
curl -s -X POST "$MCP_URL/rpc/build_site" \
  -H "Authorization: Bearer $MCP_TOKEN" \
  -H "Content-Type: application/json" \
  --max-time 180 \
  -d "$(jq -c -n \
    --slurpfile b /tmp/yf-brief.json \
    --slurpfile m /tmp/yf-merged.json \
    '{brief: $b[0].result, mergedDna: $m[0].result, platform: "shopify"}')" \
  | jq '.result | {platform, files: [.files[].path], nextSteps}'
```

### 8c. WordPress — FSE block theme

```bash
curl -s -X POST "$MCP_URL/rpc/build_site" \
  -H "Authorization: Bearer $MCP_TOKEN" -H "Content-Type: application/json" --max-time 180 \
  -d "$(jq -c -n --slurpfile b /tmp/yf-brief.json --slurpfile m /tmp/yf-merged.json \
    '{brief:$b[0].result, mergedDna:$m[0].result, platform:"wordpress"}')" \
  | jq '.result | {platform, files: [.files[].path]}'
```

### 8d. IKAS — TSX storefront

```bash
curl -s -X POST "$MCP_URL/rpc/build_site" \
  -H "Authorization: Bearer $MCP_TOKEN" -H "Content-Type: application/json" --max-time 180 \
  -d "$(jq -c -n --slurpfile b /tmp/yf-brief.json --slurpfile m /tmp/yf-merged.json \
    '{brief:$b[0].result, mergedDna:$m[0].result, platform:"ikas"}')" \
  | jq '.result | {platform, files: [.files[].path]}'
```

### 8e. Webflow — design-tokens + site-map + embeds

```bash
curl -s -X POST "$MCP_URL/rpc/build_site" \
  -H "Authorization: Bearer $MCP_TOKEN" -H "Content-Type: application/json" --max-time 180 \
  -d "$(jq -c -n --slurpfile b /tmp/yf-brief.json --slurpfile m /tmp/yf-merged.json \
    '{brief:$b[0].result, mergedDna:$m[0].result, platform:"webflow"}')" \
  | jq '.result | {platform, files: [.files[].path]}'
```

## 9. Pipeline one-liner (goes classify → search → merge → build)

Run after `search_references` has hit once so refs are cached. Takes ~2–3 min cold, ~30s warm.

```bash
curl -s -X POST "$MCP_URL/rpc/classify_brief" \
  -H "Authorization: Bearer $MCP_TOKEN" -H "Content-Type: application/json" --max-time 60 \
  -d '{"transcript":"Modern architecture studio in Istanbul. Minimal grid, serif display, lots of whitespace. No animation beyond fades. Needs project portfolio + journal."}' \
  > /tmp/step1.json && \
BRIEF=$(jq -c '.result' /tmp/step1.json) && \
curl -s -X POST "$MCP_URL/rpc/search_references" \
  -H "Authorization: Bearer $MCP_TOKEN" -H "Content-Type: application/json" --max-time 180 \
  -d "{\"brief\":$BRIEF,\"k\":6}" > /tmp/step2.json && \
curl -s -X POST "$MCP_URL/rpc/merge_dna" \
  -H "Authorization: Bearer $MCP_TOKEN" -H "Content-Type: application/json" --max-time 30 \
  -d "$(jq -c '{blend:{structure_from:.result.references[0].dna, typography_from:.result.references[1].dna, motion_from:.result.references[2].dna, palette_from:.result.references[3].dna}}' /tmp/step2.json)" \
  > /tmp/step3.json && \
curl -s -X POST "$MCP_URL/rpc/build_site" \
  -H "Authorization: Bearer $MCP_TOKEN" -H "Content-Type: application/json" --max-time 240 \
  -d "$(jq -c -n --slurpfile b /tmp/step1.json --slurpfile m /tmp/step3.json \
    '{brief:$b[0].result, mergedDna:$m[0].result, platform:"html"}')" \
  | jq '.result | {platform, fileCount: (.files|length), summary, nextSteps}'
```

## Debug recipes

### See what the server logged

```bash
# From Railway dashboard → yappaflow-production → Deployments → View Logs
# Or use the Railway CLI:
railway logs --service yappaflow-production --follow
```

### Check cache growth

```bash
curl -s "$MCP_URL/health" | jq .cacheSizeBytes
```

### Force offline mode for a test run

No curl does this — set `YAPPAFLOW_OFFLINE=1` in Railway Variables and redeploy. Classify/search/merge/build all use deterministic fixtures.

### Raw output for build_site (all files inline)

```bash
curl -s -X POST "$MCP_URL/rpc/build_site" \
  -H "Authorization: Bearer $MCP_TOKEN" -H "Content-Type: application/json" --max-time 180 \
  -d @/tmp/yf-build-payload.json | jq '.result.files[] | "=== " + .path + " ===\n" + .content' -r
```

## Error shapes

- `401 unauthorized` — `MCP_TOKEN` wrong or missing Bearer prefix.
- `404 unknown tool: …` — typo in the tool name.
- `500` with Playwright error — see the Dockerfile fix in the deployment notes.
- `500` with `OPENROUTER_API_KEY` hint — online LLM path ran without a key. Either set the key or `YAPPAFLOW_OFFLINE=1`.
- `timeout` (on client) — increase `--max-time`. `search_references` can take 90s cold; `build_site` with LLM can take 2–3 min.
