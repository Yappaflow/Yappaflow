import type { CSSProperties } from "react";
import { Exhibit } from "../shell/Exhibit.js";
import { Frame } from "../primitives/Frame.js";
import { Stack } from "../primitives/Stack.js";
import { Display } from "../primitives/Display.js";
import { Body } from "../primitives/Body.js";
import { Eyebrow } from "../primitives/Eyebrow.js";
import { Reveal } from "../motion/components/Reveal.js";
import { cn } from "../utils/cn.js";

export interface TeamMember {
  name: string;
  role: string;
  bio?: string;
}

export interface ExhibitTeamProps {
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  members: TeamMember[];
  /** Grid columns. Default 3. */
  columns?: 2 | 3 | 4;
  id?: string;
  className?: string;
}

/**
 * <ExhibitTeam> — people grid, monogram-only.
 *
 * Each member card shows a typographic monogram portrait (initials), then
 * name, role, and optional short bio. We avoid stock photography — the
 * brand feels more intentional when the faces are gallery typography
 * instead of unsplash headshots.
 */
export function ExhibitTeam({
  eyebrow,
  heading,
  subheading,
  members,
  columns = 3,
  id,
  className,
}: ExhibitTeamProps) {
  const minCol = columns === 2 ? 320 : columns === 3 ? 240 : 200;
  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(${minCol}px, 1fr))`,
    gap: "var(--ff-space-6)",
  };

  return (
    <Exhibit id={id} tone="breathing" edge="contained" className={cn("ff-exhibit-team", className)}>
      <Frame span={12} offset="center">
        <Stack rhythm="room">
          {(heading || eyebrow || subheading) && (
            <Reveal beat="structure" variant="fade-translate">
              <Stack rhythm="breath" align="start">
                {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
                {heading && (
                  <Display as="h2" size="md" tracking="tight">
                    {heading}
                  </Display>
                )}
                {subheading && (
                  <Body size="lg" tone="secondary" style={{ maxWidth: "var(--ff-measure-reading)" }}>
                    {subheading}
                  </Body>
                )}
              </Stack>
            </Reveal>
          )}

          <Reveal beat="primary" variant="stagger-children" trigger="in-view">
            <div style={gridStyle}>
              {members.map((m, i) => (
                <TeamCard key={i} member={m} />
              ))}
            </div>
          </Reveal>
        </Stack>
      </Frame>
    </Exhibit>
  );
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0] ?? "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? "";
  const a = first[0] ?? "";
  const b = last[0] ?? "";
  return (a + b).toUpperCase();
}

function TeamCard({ member }: { member: TeamMember }) {
  return (
    <Stack rhythm="gutter" align="start">
      <div
        aria-hidden="true"
        style={{
          aspectRatio: "1 / 1",
          width: "100%",
          background:
            "linear-gradient(135deg, var(--ff-text-tertiary, rgba(0,0,0,0.1)) 0%, var(--ff-text-tertiary, rgba(0,0,0,0.04)) 100%)",
          borderRadius: "var(--ff-radius-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--ff-font-display)",
          fontSize: "clamp(3rem, 8vw, 5rem)",
          fontWeight: "var(--ff-weight-medium)" as unknown as number,
          color: "var(--ff-text-primary)",
          letterSpacing: "-0.03em",
        }}
      >
        {initialsFor(member.name)}
      </div>
      <Display as="h3" size="sm" tracking="tight" balance={false}>
        {member.name}
      </Display>
      <Body size="sm" tone="tertiary" style={{ textTransform: "uppercase", letterSpacing: "var(--ff-tracking-eyebrow)" }}>
        {member.role}
      </Body>
      {member.bio && (
        <Body size="md" tone="secondary">
          {member.bio}
        </Body>
      )}
    </Stack>
  );
}
