import { z } from "zod";

export const TeamMemberSchema = z.object({
  name: z.string(),
  role: z.string(),
  bio: z.string().optional(),
});
export type TeamMember = z.infer<typeof TeamMemberSchema>;

export const TeamContentSchema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
  subheading: z.string().optional(),
  members: z.array(TeamMemberSchema).min(1),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
});
export type TeamContent = z.infer<typeof TeamContentSchema>;
