# app — CLAUDE context

React Native (Expo) agency app. Mobile counterpart to `web/`.

## Stack

- React Native + Expo
- Redux Toolkit (`src/store/slices/*`)
- Auth screens split across providers: Email, Phone OTP, WhatsApp, Instagram
- Shared types from `shared/` (legacy) and increasingly `packages/types`

## Rules

1. **Don't re-implement backend logic.** All auth and data flows go through `server/`.
2. **Reuse slices — don't fork state.** Auth + project state live in `src/store/slices/`.
3. **i18n first.** Never hardcode user-facing copy.
4. **No direct MCP calls from the app.** Go through `server/` proxy.

## When you finish

- `expo start` loads without crashes on iOS and Android simulators
- Any new screen has navigation wired in `src/navigation/`
