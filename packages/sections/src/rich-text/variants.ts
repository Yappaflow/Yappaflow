export const RICH_TEXT_VARIANTS = ["default"] as const;
export type RichTextVariant = (typeof RICH_TEXT_VARIANTS)[number];
export const DEFAULT_RICH_TEXT_VARIANT: RichTextVariant = "default";
