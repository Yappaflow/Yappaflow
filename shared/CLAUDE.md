# shared — CLAUDE context

**Legacy** shared types. Predates the Builder-First Pivot. Kept alive for `web/`, `app/`,
and `server/`.

## Rule of thumb

- **New domain types → `packages/types`** (especially anything in the `Brief` / `Dna` /
  `SiteProject` family).
- **Legacy types that already live here** can keep being updated in place until a migration
  PR moves them.
- Never introduce *new* types here that `packages/types` should own.

## When you finish

- `npm run build:shared` succeeds
- If you moved something to `packages/types`, the old re-export stays for one release
  with a `@deprecated` JSDoc pointing at the new location
