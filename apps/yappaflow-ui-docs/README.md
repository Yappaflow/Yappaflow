# @yappaflow/ui-docs

Documentation, component gallery, and choreography lab for [yappaflow-ui](../../packages/yappaflow-ui). Deployed to **ui.yappaflow.com**.

## What's here

- **`/`** — Landing page. Built entirely from `yappaflow-ui` primitives + exhibits — it IS the flagship demo.
- **`/gallery`** — Component gallery, grouped by layer (Primitives / Motion / Shell / Exhibits / Theme) with live previews, props tables, and copy-pasteable code.
- **`/motion-lab`** — Interactive choreography lab: pick a beat + variant + stagger, replay the entry, inspect the three custom easings and the timing contract.
- **`/docs`** — Written guides (MDX): getting-started, theming, motion-system, composition-patterns, changelog.

## Local development

From the monorepo root:

```bash
# one-time — make sure yappaflow-ui is built so the docs app can import it
npm run build:ui

# docs site on port 3030, with HMR
npm run dev:ui-docs

# to get HMR for library edits too, run both in parallel:
npm run dev:ui         # tsup --watch in packages/yappaflow-ui
npm run dev:ui-docs    # next dev in apps/yappaflow-ui-docs
```

Open [http://localhost:3030](http://localhost:3030).

## Build

```bash
npm run build:ui-docs
```

Turbo will build `yappaflow-ui` first (via `dependsOn: ["^build"]` in `turbo.json`) and then the Next.js app.

## Deploy to ui.yappaflow.com

1. Create a new Vercel project pointing at this repo.
2. Set **Root Directory** to `apps/yappaflow-ui-docs`.
3. Vercel will pick up `vercel.json`, which runs `npm install` + `turbo build --filter=@yappaflow/ui-docs` from the monorepo root.
4. Add `ui.yappaflow.com` as a custom domain in the Vercel project settings and point the DNS CNAME at `cname.vercel-dns.com`.

`ignoreCommand` uses `turbo-ignore` so Vercel only rebuilds when this app or `yappaflow-ui` changes.

## Adding a component to the gallery

Edit [`src/lib/gallery-registry.tsx`](src/lib/gallery-registry.tsx) and add one entry with:

- `slug`, `title`, `layer`
- `summary` — one-liner used on the index card
- `example` — copy-pasteable code
- `Preview` — live render function
- `props` — (optional) props table rows

Both `/gallery` and `/gallery/[slug]` pick it up automatically.

## Adding a guide

1. Create `src/content/docs/<slug>.mdx`.
2. Add a matching entry to `src/lib/docs-manifest.ts` with a section (Start / System / Patterns / Reference).

The sidebar and `/docs` index render from the manifest, so the ordering is intentional — not alphabetical.
