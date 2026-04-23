/**
 * Small id generator for sections + pages inside the builder. Matches the
 * shape of the MCP assembler's id output (`sec_<base36>`) so SiteProjects
 * round-trip between the server-side assembler and the builder without the
 * ids looking like they came from two different systems.
 *
 * Not cryptographically strong. Fine for client-only ids; Phase 10.5's
 * server-side project store will ignore these and mint its own on create.
 */

let counter = Date.now() % 1_000_000;

export function nextSectionId(): string {
  counter = (counter + 1) & 0xfffffff;
  return `sec_${counter.toString(36)}`;
}

export function nextPageId(): string {
  counter = (counter + 1) & 0xfffffff;
  return `pg_${counter.toString(36)}`;
}
