export const TEAM_VARIANTS = ["default"] as const;
export type TeamVariant = (typeof TEAM_VARIANTS)[number];
export const DEFAULT_TEAM_VARIANT: TeamVariant = "default";
