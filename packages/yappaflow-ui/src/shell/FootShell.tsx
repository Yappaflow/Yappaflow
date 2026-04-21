import { type ReactNode } from "react";
import { Frame } from "../primitives/Frame.js";
import { Stack } from "../primitives/Stack.js";
import { Eyebrow } from "../primitives/Eyebrow.js";
import { Body } from "../primitives/Body.js";
import { cn } from "../utils/cn.js";

export interface FootLink {
  label: string;
  href: string;
}

export interface FootShellProps {
  brand?: ReactNode;
  tagline?: string;
  columns?: Array<{
    title: string;
    links: FootLink[];
  }>;
  fineprint?: ReactNode;
  className?: string;
}

/**
 * <FootShell> — dense editorial footer.
 *
 * A proper gallery closing wall, not a link dumping ground. The single
 * brand tagline gets the prominence, column titles are eyebrows, and the
 * fineprint sits at the base.
 */
export function FootShell({
  brand,
  tagline,
  columns = [],
  fineprint,
  className,
}: FootShellProps) {
  return (
    <footer
      className={cn("ff-foot-shell", className)}
      style={{
        paddingTop: "var(--ff-rhythm-room)",
        paddingBottom: "var(--ff-rhythm-breath)",
        borderTop: "1px solid var(--ff-border)",
        background: "var(--ff-paper)",
      }}
    >
      <Frame span={12} offset="center">
        <Stack rhythm="room">
          {(brand || tagline) && (
            <Stack rhythm="gutter">
              {brand && (
                <div
                  style={{
                    fontFamily: "var(--ff-font-display)",
                    fontSize: "var(--ff-type-display-sm)",
                    letterSpacing: "var(--ff-tracking-display-tight)",
                    lineHeight: "var(--ff-leading-display-tight)" as unknown as number,
                  }}
                >
                  {brand}
                </div>
              )}
              {tagline && (
                <Body size="lg" tone="secondary" style={{ maxWidth: "var(--ff-measure-reading)" }}>
                  {tagline}
                </Body>
              )}
            </Stack>
          )}

          {columns.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(columns.length, 4)}, minmax(0, 1fr))`,
                gap: "var(--ff-space-6)",
              }}
            >
              {columns.map((col) => (
                <Stack key={col.title} rhythm="gutter">
                  <Eyebrow>{col.title}</Eyebrow>
                  <ul style={{ display: "flex", flexDirection: "column", gap: "var(--ff-space-2)" }}>
                    {col.links.map((l) => (
                      <li key={l.href}>
                        <a href={l.href} style={{ color: "var(--ff-text-primary)", fontSize: "var(--ff-type-body-md)" }}>
                          {l.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </Stack>
              ))}
            </div>
          )}

          {fineprint && (
            <div style={{ borderTop: "1px solid var(--ff-border)", paddingTop: "var(--ff-space-5)" }}>
              <Body size="sm" tone="tertiary">
                {fineprint}
              </Body>
            </div>
          )}
        </Stack>
      </Frame>
    </footer>
  );
}
