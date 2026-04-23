// Deactivated — the bare `preview/page.tsx` handles the full /preview
// subtree now, using URL hash (#/products/<handle>) for deep-link slug
// sync. Having both this file and the sibling page.tsx as routes caused
// Next.js's App Router to misbehave at runtime even when the build
// succeeded; consolidated to a single route to remove the ambiguity.
//
// Safe to delete this file — kept as a sandbox breadcrumb.
export {};
