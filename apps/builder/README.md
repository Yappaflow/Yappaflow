# @yappaflow/builder

The Yappaflow in-house site builder. Phase 7 ships this as a **placeholder** —
a minimal Next.js 15 app whose only job is to let us:

1. Import the project into Vercel.
2. Wire `builder.yappaflow.com` DNS + SSL.
3. Verify the auth cookie from `yappaflow.com` is readable here.

Phase 8 replaces the page with the real builder — iframe canvas, section list,
right-rail property editor, Tiptap inline text editing, Zustand scene state.

## Local dev

From the repo root:

```bash
npm install
npm run dev --workspace=@yappaflow/builder
```

Opens on http://localhost:3040. (The `web` app takes 3000, `yappaflow-ui-docs`
takes 3030; picking 3040 keeps them all coexisting during dev.)

## Deploy to Vercel (step-by-step)

**1. Create the project.** In Vercel dashboard → *Add New → Project* → import
the `Yappaflow` repo. When it asks for *Root Directory*, pick **`apps/builder`**.
Vercel detects Next.js automatically. Framework preset: Next.js. Build command
and output directory: leave on the defaults.

**2. Set install command (monorepo quirk).** Vercel's default Install Command
runs `npm install` inside the selected root directory, which would skip the
workspace symlinks. Override it in *Project Settings → Build & Development
Settings*:

- Install Command: `cd ../.. && npm install`
- Build Command: `cd ../.. && npm run build --workspace=@yappaflow/builder`

This makes Vercel install the whole workspace from the repo root (which
generates the `@yappaflow/*` symlinks in `node_modules`), then builds the
builder workspace. When Phase 8 adds dependencies on `@yappaflow/sections` and
`@yappaflow/types`, change the build command to
`cd ../.. && npx turbo build --filter=@yappaflow/builder` so turbo builds the
dependencies first in the correct order.

**3. Deploy.** Hit *Deploy*. You'll get a `your-project.vercel.app` URL. Load
it — the placeholder page should render with light/dark toggle working.

**4. Wire `builder.yappaflow.com`.** In the project's *Settings → Domains*:

- Click *Add Domain* → type `builder.yappaflow.com` → Add.
- Vercel shows the DNS record to add at your registrar. Usually:
  - **CNAME** record, name `builder`, value `cname.vercel-dns.com`
  - TTL: automatic/default
- Add it at wherever `yappaflow.com`'s DNS is hosted (Cloudflare, Namecheap,
  Vercel, etc.). Propagation is usually under 5 min.
- Vercel auto-issues a free Let's Encrypt SSL certificate once DNS resolves.

**5. Verify cookie scope (important for Phase 10.5).** When `web/` sets the
auth JWT cookie, the Set-Cookie header must include `Domain=.yappaflow.com`
(leading dot). Without that, `builder.yappaflow.com` can't read the session
and the handoff breaks.

Check your `server/` auth route — wherever `res.cookie(...)` or
`res.setHeader("Set-Cookie", ...)` is called. Make sure the cookie options
include `domain: ".yappaflow.com"` in production (and localhost-scoped in dev).
Test by logging into `yappaflow.com`, then visiting
`builder.yappaflow.com` — open DevTools → Application → Cookies and confirm
the session cookie is present under `.yappaflow.com`.

## Known sandbox quirk (dev only)

If you build this project inside a sandboxed environment that blocks file
unlinks (e.g. certain AI coding sandboxes), `next build` will fail on its
final cleanup step with `EPERM: operation not permitted, unlink`. The
compilation itself succeeds — the error is in Next's post-build file
shuffling. On macOS, Linux, and Vercel this never happens.
