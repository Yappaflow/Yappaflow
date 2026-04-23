import type { TimelineContent } from "./schema.js";

export const DEFAULT_TIMELINE_CONTENT: TimelineContent = {
  eyebrow: "How we ship",
  heading: "From brief to launch in three moves.",
  entries: [
    {
      marker: "01",
      title: "Kickoff",
      body: "We capture the brief, the constraints, and the outcome you need.",
    },
    {
      marker: "02",
      title: "Build",
      body: "Two sprints, visible progress at day 5, day 10, day 14.",
    },
    {
      marker: "03",
      title: "Launch",
      body: "Clean handoff, live site, post-launch review at day 30.",
    },
  ],
};
