# server — CLAUDE context

`@yappaflow/server`. Node/Express backend. Owns auth, persistence, and the proxy layer
that fronts the MCP service.

## Responsibilities

- Auth (email, phone/OTP, WhatsApp, Instagram) — see `src/models/OtpCode.model.ts` and
  the auth screens in `app/`.
- Brief / project persistence (MongoDB + Mongoose).
- GraphQL schema + resolvers.
- `/reference/*` REST proxy → `apps/yappaflow-mcp`.
- Third-party integrations behind service modules (Twilio, Iyzico, Namecheap).

## Rules

1. **One file per third-party service.** `src/services/<vendor>.service.ts`. Never sprinkle
   vendor SDK calls across handlers.
2. **i18n strings live in Mongo**, not in code. Use the i18n helper when returning
   user-facing messages.
3. **No MCP business logic here.** The server proxies; it doesn't generate.
4. **No Anthropic SDK here.** Generation uses DeepSeek / OpenRouter via the MCP service.

## Common config

- `src/config/db.ts` — Mongo connect
- `src/utils/logger.ts` — use this, not `console`

## When you finish

- `npm run build:server` succeeds
- Any new endpoint has one happy-path test and one auth-denied test
