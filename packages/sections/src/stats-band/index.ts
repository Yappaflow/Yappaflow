import { defineSection } from "../internal/define-section.js";
import { StatsBandContentSchema, type StatsBandContent } from "./schema.js";
import { DEFAULT_STATS_BAND_CONTENT } from "./default.js";
import {
  STATS_BAND_VARIANTS,
  DEFAULT_STATS_BAND_VARIANT,
  type StatsBandVariant,
} from "./variants.js";
import { StatsBandSection } from "./render.js";

export const statsBandDefinition = defineSection<
  "stats-band",
  StatsBandContent,
  StatsBandVariant
>({
  type: "stats-band",
  contentSchema: StatsBandContentSchema,
  variants: STATS_BAND_VARIANTS,
  defaultVariant: DEFAULT_STATS_BAND_VARIANT,
  defaultContent: DEFAULT_STATS_BAND_CONTENT,
  Component: StatsBandSection,
});

export {
  StatsBandContentSchema,
  StatsBandSection,
  STATS_BAND_VARIANTS,
  DEFAULT_STATS_BAND_VARIANT,
};
export type { StatsBandContent, StatsBandVariant };
