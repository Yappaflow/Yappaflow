import { defineSection } from "../internal/define-section.js";
import { TeamContentSchema, type TeamContent } from "./schema.js";
import { DEFAULT_TEAM_CONTENT } from "./default.js";
import { TEAM_VARIANTS, DEFAULT_TEAM_VARIANT, type TeamVariant } from "./variants.js";
import { TeamSection } from "./render.js";

export const teamDefinition = defineSection<"team", TeamContent, TeamVariant>({
  type: "team",
  contentSchema: TeamContentSchema,
  variants: TEAM_VARIANTS,
  defaultVariant: DEFAULT_TEAM_VARIANT,
  defaultContent: DEFAULT_TEAM_CONTENT,
  Component: TeamSection,
});

export { TeamContentSchema, TeamSection, TEAM_VARIANTS, DEFAULT_TEAM_VARIANT };
export type { TeamContent, TeamVariant };
