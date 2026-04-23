import { defineSection } from "../internal/define-section.js";
import { TimelineContentSchema, type TimelineContent } from "./schema.js";
import { DEFAULT_TIMELINE_CONTENT } from "./default.js";
import {
  TIMELINE_VARIANTS,
  DEFAULT_TIMELINE_VARIANT,
  type TimelineVariant,
} from "./variants.js";
import { TimelineSection } from "./render.js";

export const timelineDefinition = defineSection<
  "timeline",
  TimelineContent,
  TimelineVariant
>({
  type: "timeline",
  contentSchema: TimelineContentSchema,
  variants: TIMELINE_VARIANTS,
  defaultVariant: DEFAULT_TIMELINE_VARIANT,
  defaultContent: DEFAULT_TIMELINE_CONTENT,
  Component: TimelineSection,
});

export {
  TimelineContentSchema,
  TimelineSection,
  TIMELINE_VARIANTS,
  DEFAULT_TIMELINE_VARIANT,
};
export type { TimelineContent, TimelineVariant };
