# web — CLAUDE context

`@yappaflow/web`. The Next.js **agency dashboard** — where agency operators manage clients,
briefs, and projects. Distinct from `apps/yappaflow-ui-docs` (docs for the UI library) and
from `apps/builder` (the site builder itself).

## Stack

- Next.js App Router (matches the rest of the ecosystem)
- `next-intl` for i18n (TR/EN — Türkiye-first)
- Tailwind + `packages/yappaflow-ui`
- GraphQL (Apollo) → `server/`

## Scope

- Auth flows (delegated to `server/`)
- Client / brief / project CRUD
- Reference pipeline UI (calls `/reference/*` which proxy to `apps/yappaflow-mcp`)
- Deploys via Vercel or Netlify (see `netlify.toml`)

## Rules

1. **Never hardcode strings.** Use the i18n helper — bilingual is non-negotiable.
2. **Do not inline MCP logic.** Reference/AI calls go through the proxy routes; the MCP
   service is its own Railway app.
3. **Auth tokens stay server-side.** No secrets in client bundles.
4. Consume `packages/yappaflow-ui` — don't re-implement primitives in `web/src/components`.

## When you finish

- `npm run build:web` succeeds
- TR and EN both render the touched pages
