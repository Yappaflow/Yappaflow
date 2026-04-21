# yappaflow-ui

An opinionated React + GSAP component library for building art-gallery–grade websites.

> A website should feel like an art gallery, where every component is an exhibit and every empty space is part of the composition.

This is the design vocabulary used by [Yappaflow](https://yappaflow.com)'s AI site generator. It's also published standalone for developers who want bold-minimal, motion-authored websites out of the box.

**Docs:** https://ui.yappaflow.com

## Install

```bash
npm install yappaflow-ui
```

Peer dependencies: `react >= 18`, `react-dom >= 18`. GSAP and Lenis ship as direct deps — no extra install needed.

## Quick start

```tsx
import { GalleryShell, NavShell, FootShell } from "yappaflow-ui/shell";
import { ExhibitHero } from "yappaflow-ui/exhibits";
import "yappaflow-ui/styles.css";

export default function Page() {
  return (
    <GalleryShell theme="light">
      <NavShell brand="Studio" links={[{ label: "Work", href: "/work" }]} />
      <ExhibitHero
        eyebrow="Studio"
        headline={"Work you can\nlive inside."}
        subtext="A small practice for large ideas."
        cta={{ label: "See work", href: "/work" }}
        ambient="drift"
      />
      <FootShell brand="Studio" tagline="Small practice, large ideas." />
    </GalleryShell>
  );
}
```

`GalleryShell` is the single root wrapper — it mounts the theme provider, the GSAP + Lenis motion engine, and (optionally) the custom cursor. Everything else is a named component away.

## Layers

1. **Tokens** — design DNA exposed as `--ff-*` CSS custom properties (color, type, space, radius, motion).
2. **Motion** — GSAP engine + Lenis smooth-scroll + declarative wrappers (`Reveal`, `ScrollSection`, `Magnetic`, `Cursor`, `ScrambleText`, `AmbientLayer`).
3. **Primitives** — composition grammar (`Frame`, `Column`, `Spread`, `Stack`, `Display`, `Body`, `Eyebrow`, `Mark`).
4. **Shell** — site chrome (`GalleryShell`, `Exhibit`, `NavShell`, `FootShell`).
5. **Exhibits** — composed ready-to-ship patterns (`ExhibitHero`, and more).
6. **Theme** — `ThemeProvider` + `ThemeToggle`. Light default, dark toggle on every site.

Every layer imports only from layers below it. Tree-shakable subpath imports are published for every layer (`yappaflow-ui/motion`, `yappaflow-ui/primitives`, and so on) so AI-generated static sites stay lean.

## Motion

Motion is authored as a rhythm score, not per-component tweens:

- `structure` at 0ms → page shells in place
- `primary` at 200ms → headline enters
- `secondary` at 400ms → supporting copy
- `cta` at 600ms → action

Pass a `beat` to `<Reveal>` and the animation lands on the right downbeat. Reduced-motion is honored everywhere.

## Theming

Theme is controlled by a data attribute on the root (`data-theme="light" | "dark"`). Swap tokens once and restyle every site. `<ThemeToggle />` flips the attribute with a single call.

## License

MIT © Yappaflow.
