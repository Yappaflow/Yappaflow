import { z } from "zod";

export const StatBlockSchema = z.object({
  value: z.string(),
  label: z.string(),
  context: z.string().optional(),
});
export type StatBlock = z.infer<typeof StatBlockSchema>;

export const StatsBandContentSchema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
  blocks: z.array(StatBlockSchema).min(1),
});
export type StatsBandContent = z.infer<typeof StatsBandContentSchema>;
