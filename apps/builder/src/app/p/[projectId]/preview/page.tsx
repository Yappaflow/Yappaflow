// Superseded by `./[[...slug]]/page.tsx` — the optional catch-all route
// handles both the bare `/preview` URL and deep links like
// `/preview/about` or `/preview/products/classic-tee`. Next.js App Router
// requires route files to export a default component; redirecting here
// would conflict with the catch-all. This file is kept empty of route
// exports so the catch-all is the sole owner of the /preview subtree.
//
// Safe to delete this file — it's a sandbox-imposed breadcrumb (the
// environment wouldn't let us remove it at the time of the refactor).

export {};
