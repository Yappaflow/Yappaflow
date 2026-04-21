/**
 * yappaflow-ui — the art gallery component library.
 *
 * The root barrel exports every layer for consumers who prefer one import.
 * Tree-shakers will still drop unused code. Subpath imports
 * (`yappaflow-ui/exhibits`, `yappaflow-ui/motion`, ...) remain available
 * for fine-grained bundling in AI-generated static sites.
 */

// Layer 1 — Tokens (DNA)
export * as tokens from "./tokens/index.js";

// Layer 2 — Motion (Breath)
export {
  MotionProvider,
  useMotion,
  Reveal,
  ScrollSection,
  AmbientLayer,
  Magnetic,
  Cursor,
  ScrambleText,
  useReveal,
  useScrollTrigger,
  useMagnetic,
  useAmbient,
  type MotionProviderProps,
  type RevealProps,
  type ScrollSectionProps,
  type AmbientLayerProps,
  type MagneticProps,
  type CursorProps,
  type ScrambleTextProps,
} from "./motion/index.js";

// Layer 3 — Primitives (composition grammar)
export {
  Frame,
  Column,
  Spread,
  Stack,
  Display,
  Body,
  Mark,
  Eyebrow,
  type FrameProps,
  type ColumnProps,
  type SpreadProps,
  type StackProps,
  type DisplayProps,
  type BodyProps,
  type MarkProps,
  type EyebrowProps,
} from "./primitives/index.js";

// Layer 4 — Shell (frame)
export {
  GalleryShell,
  Exhibit,
  NavShell,
  FootShell,
  type GalleryShellProps,
  type ExhibitProps,
  type NavShellProps,
  type FootShellProps,
} from "./shell/index.js";

// Layer 5 — Exhibits (art)
export {
  ExhibitHero,
  type ExhibitHeroProps,
  type ExhibitHeroCTA,
  ExhibitFeatureGrid,
  type ExhibitFeatureGridProps,
  type FeatureGridBlock,
  type FeatureIconName,
  ExhibitTestimonials,
  type ExhibitTestimonialsProps,
  type TestimonialBlock,
  ExhibitFAQ,
  type ExhibitFAQProps,
  type FAQBlock,
  ExhibitStats,
  type ExhibitStatsProps,
  type StatBlock,
  ExhibitTimeline,
  type ExhibitTimelineProps,
  type TimelineEntry,
  ExhibitLogoCloud,
  type ExhibitLogoCloudProps,
  ExhibitPricing,
  type ExhibitPricingProps,
  type PricingTier,
  ExhibitTeam,
  type ExhibitTeamProps,
  type TeamMember,
  ExhibitSplit,
  type ExhibitSplitProps,
  type SplitCTA,
  ExhibitCTA,
  type ExhibitCTAProps,
  type CTAButton,
  ExhibitNewsletter,
  type ExhibitNewsletterProps,
  ExhibitContact,
  type ExhibitContactProps,
  type ContactDetailRow,
} from "./exhibits/index.js";

// Theme (cross-cutting)
export {
  ThemeProvider,
  ThemeToggle,
  useTheme,
  themeScript,
  type ThemeMode,
  type ResolvedTheme,
  type ThemeToggleProps,
} from "./theme/index.js";
