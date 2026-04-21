import { Exhibit } from "yappaflow-ui/shell";
import { Frame, Stack, Display, Body, Eyebrow } from "yappaflow-ui/primitives";
import { Reveal } from "yappaflow-ui/motion";

const PILLARS = [
  {
    number: "01",
    title: "Tokens",
    description:
      "A single layer of CSS custom properties drives every visual choice. Swap the accent hue, restyle every site.",
    href: "/docs/theming",
  },
  {
    number: "02",
    title: "Motion",
    description:
      "GSAP + Lenis + reduced-motion gating, wrapped in declarative components. You pass a beat, not a tween.",
    href: "/docs/motion-system",
  },
  {
    number: "03",
    title: "Exhibits",
    description:
      "The composed patterns — hero, gallery, manifesto — that let an AI generator ship a real site in seconds.",
    href: "/gallery",
  },
];

export function PillarStrip() {
  return (
    <Exhibit tone="dense" edge="contained" rhythm="room">
      <Frame span={12} offset="center">
        <Stack rhythm="breath">
          <Reveal beat="structure" variant="fade-translate">
            <Eyebrow>Three pillars</Eyebrow>
          </Reveal>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "var(--ff-space-6)",
            }}
          >
            {PILLARS.map((p, idx) => (
              <Reveal
                key={p.title}
                beat={idx === 0 ? "primary" : idx === 1 ? "secondary" : "cta"}
                variant="fade-translate"
              >
                <a href={p.href} className="pillar-card gallery-card">
                  <span className="pillar-card__number">{p.number}</span>
                  <Display as="h3" size="sm" tracking="tight">
                    {p.title}
                  </Display>
                  <Body size="md" tone="secondary">
                    {p.description}
                  </Body>
                  <span className="pillar-card__arrow" aria-hidden="true">
                    →
                  </span>
                </a>
              </Reveal>
            ))}
          </div>

          <style>{PILLAR_CSS}</style>
        </Stack>
      </Frame>
    </Exhibit>
  );
}

const PILLAR_CSS = /* css */ `
.pillar-card {
  display: flex;
  flex-direction: column;
  gap: var(--ff-space-3);
  padding: var(--ff-space-6);
  min-height: 260px;
}
.pillar-card__number {
  font-family: var(--ff-font-mono, ui-monospace, monospace);
  font-size: var(--ff-type-body-sm);
  color: var(--ff-text-tertiary);
  letter-spacing: 0.12em;
}
.pillar-card__arrow {
  margin-top: auto;
  font-size: 1.5rem;
  color: var(--ff-accent);
  transition: transform 300ms cubic-bezier(0.25, 1, 0.5, 1);
}
.pillar-card:hover .pillar-card__arrow {
  transform: translateX(6px);
}
`;
