import { z } from "zod";

export const LogoCloudContentSchema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
  labels: z.array(z.string()).min(1),
});
export type LogoCloudContent = z.infer<typeof LogoCloudContentSchema>;
