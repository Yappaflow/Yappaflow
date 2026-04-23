import { defineSection } from "../internal/define-section.js";
import {
  AnnouncementBarContentSchema,
  type AnnouncementBarContent,
} from "./schema.js";
import { DEFAULT_ANNOUNCEMENT_BAR_CONTENT } from "./default.js";
import {
  ANNOUNCEMENT_BAR_VARIANTS,
  DEFAULT_ANNOUNCEMENT_BAR_VARIANT,
  type AnnouncementBarVariant,
} from "./variants.js";
import { AnnouncementBarSection } from "./render.js";

export const announcementBarDefinition = defineSection<
  "announcement-bar",
  AnnouncementBarContent,
  AnnouncementBarVariant
>({
  type: "announcement-bar",
  contentSchema: AnnouncementBarContentSchema,
  variants: ANNOUNCEMENT_BAR_VARIANTS,
  defaultVariant: DEFAULT_ANNOUNCEMENT_BAR_VARIANT,
  defaultContent: DEFAULT_ANNOUNCEMENT_BAR_CONTENT,
  Component: AnnouncementBarSection,
});

export {
  AnnouncementBarContentSchema,
  AnnouncementBarSection,
  ANNOUNCEMENT_BAR_VARIANTS,
  DEFAULT_ANNOUNCEMENT_BAR_VARIANT,
};
export type { AnnouncementBarContent, AnnouncementBarVariant };
