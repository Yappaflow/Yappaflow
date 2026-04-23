import { defineSection } from "../internal/define-section.js";
import { LogoCloudContentSchema, type LogoCloudContent } from "./schema.js";
import { DEFAULT_LOGO_CLOUD_CONTENT } from "./default.js";
import {
  LOGO_CLOUD_VARIANTS,
  DEFAULT_LOGO_CLOUD_VARIANT,
  type LogoCloudVariant,
} from "./variants.js";
import { LogoCloudSection } from "./render.js";

export const logoCloudDefinition = defineSection<
  "logo-cloud",
  LogoCloudContent,
  LogoCloudVariant
>({
  type: "logo-cloud",
  contentSchema: LogoCloudContentSchema,
  variants: LOGO_CLOUD_VARIANTS,
  defaultVariant: DEFAULT_LOGO_CLOUD_VARIANT,
  defaultContent: DEFAULT_LOGO_CLOUD_CONTENT,
  Component: LogoCloudSection,
});

export {
  LogoCloudContentSchema,
  LogoCloudSection,
  LOGO_CLOUD_VARIANTS,
  DEFAULT_LOGO_CLOUD_VARIANT,
};
export type { LogoCloudContent, LogoCloudVariant };
