import type { Metadata } from "next";
import { Exhibit } from "yappaflow-ui/shell";
import { Frame, Stack, Display, Body, Eyebrow } from "yappaflow-ui/primitives";
import { Reveal } from "yappaflow-ui/motion";
import { RevealLab } from "@/components/lab/RevealLab";
import { EasingsInspector } from "@/components/lab/EasingsInspector";
import { TimingContract } from "@/components/lab/TimingContract";

export const metadata: Metadata = {
  title: "Motion Lab",
  description:
    "Interactive inspector for yappaflow-ui's motion system — beats, variants, staggers, easings, and the timing contract.",
};

export default function MotionLab() {
  return (
    <div className="docs-page">
      <Exhibit tone="breathing" edge="contained" rhythm="breath">
        <Frame span={12} offset="center">
          <Stack rhythm="breath">
            <Reveal beat="structure" variant="fade-translate">
              <Eyebrow>Motion Lab</Eyebrow>
            </Reveal>
            <Reveal beat="primary" variant="text-lines" stagger="text">
              <Display size="lg" tracking="tight" balance>
                {"Inspect every beat.\nReplay on demand."}
              </Display>
            </Reveal>
            <Reveal beat="secondary" variant="fade-translate">
              <Body size="lg" tone="secondary" style={{ maxWidth: "var(--ff-measure-reading)" }}>
                The motion tokens, variants, and staggers the library ships —
                rendered live, against the real components. Adjust, replay,
                copy the snippet into your site.
              </Body>
            </Reveal>
          </Stack>
        </Frame>
      </Exhibit>

      <Exhibit tone="dense" edge="contained" rhythm="room">
        <Frame span={12} offset="center">
          <Stack rhythm="breath">
            <Stack rhythm="gutter">
              <Eyebrow>Reveal</Eyebrow>
              <Display size="sm" tracking="tight">The workhorse entry.</Display>
              <Body tone="secondary" style={{ maxWidth: "var(--ff-measure-reading)" }}>
                Pick a beat to set delay/duration/ease from the choreography
                tokens. Pick a variant to change the shape of the entry. Text
                variants also accept a stagger token.
              </Body>
            </Stack>
            <RevealLab />
          </Stack>
        </Frame>
      </Exhibit>

      <Exhibit tone="dense" edge="contained" rhythm="room">
        <Frame span={12} offset="center">
          <EasingsInspector />
        </Frame>
      </Exhibit>

      <Exhibit tone="dense" edge="contained" rhythm="room">
        <Frame span={12} offset="center">
          <TimingContract />
        </Frame>
      </Exhibit>
    </div>
  );
}
