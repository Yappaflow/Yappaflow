import { z } from "zod";

export const TimelineEntrySchema = z.object({
  marker: z.string(),
  title: z.string(),
  body: z.string(),
});
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;

export const TimelineContentSchema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
  subheading: z.string().optional(),
  entries: z.array(TimelineEntrySchema).min(1),
});
export type TimelineContent = z.infer<typeof TimelineContentSchema>;
