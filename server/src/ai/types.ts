// ── AI Phase & Status ─────────────────────────────────────────────────

export type AIPhase =
  | "analyzing"
  | "planning"
  | "generating"
  | "reviewing"
  | "ready"
  | "failed";

export type AISessionStatus = "active" | "completed" | "failed" | "cancelled";

// ── Platform Targets ──────────────────────────────────────────────────

export type PlatformTarget = "shopify" | "wordpress" | "ikas" | "custom";

// ── Agency Animation Aesthetics ───────────────────────────────────────

export type AnimationStyle =
  | "locomotive"      // refined, editorial, smooth scroll
  | "studio-freight"  // bold, typographic, tech-forward
  | "area17"          // restrained, systematic, institutional
  | "hello-monday";   // playful, inventive, experimental

// ── Design System (extracted from conversation analysis) ──────────────

export interface DesignSystemColor {
  primary:    string;  // warm black (e.g. #0a0a0a)
  secondary:  string;  // near-white (e.g. #fafaf9)
  accent:     string;  // single bold accent (e.g. #ff4d00)
  background: string;
  text:       string;
}

export interface DesignSystemTypography {
  displayFont: string;   // premium/quality font (e.g. "Space Grotesk")
  bodyFont:    string;   // readable body font (e.g. "DM Sans")
  heroScale:   string;   // clamp() value (e.g. "clamp(4rem, 2rem + 8vw, 12rem)")
  bodyScale:   string;   // body size (e.g. "1.125rem")
  tracking:    string;   // display tracking (e.g. "-0.03em")
}

export interface DesignSystemEasing {
  primary:   string;  // e.g. "cubic-bezier(0.16, 1, 0.3, 1)"  - expo out
  dramatic:  string;  // e.g. "cubic-bezier(0.87, 0, 0.13, 1)"  - expo in-out
  symmetric: string;  // e.g. "cubic-bezier(0.25, 1, 0.5, 1)"  - quart out
}

export interface DesignSystemSpacing {
  sectionPadding: string;  // e.g. "clamp(4rem, 10vh, 8rem)"
  gridGutter:     string;  // e.g. "clamp(1rem, 2vw, 2rem)"
  gridMargin:     string;  // e.g. "clamp(1rem, 5vw, 6rem)"
}

export interface DesignSystem {
  colorPalette:    DesignSystemColor;
  typography:      DesignSystemTypography;
  easing:          DesignSystemEasing;
  spacing:         DesignSystemSpacing;
  animationStyle:  AnimationStyle;
  scrollBehavior:  "smooth-lenis" | "native" | "locomotive-scroll";
  signatureMoment: string;  // description of the "screenshot-worthy" moment
  mood:            string;  // single word (e.g. "bold", "refined", "playful")
}

// ── Conversation Analysis Result ──────────────────────────────────────

export interface DesignRequirements {
  style:      string;       // e.g. "dark mode, bento-grid, asymmetric"
  references: string[];     // competitor/inspiration URLs
  responsive: boolean;
  darkMode:   boolean;
}

export interface ContentRequirements {
  pages:        string[];   // e.g. ["Home", "About", "Products", "Contact"]
  features:     string[];   // e.g. ["product gallery", "contact form", "blog"]
  integrations: string[];   // e.g. ["payment gateway", "email signup", "analytics"]
  languages:    string[];   // e.g. ["en", "tr"]
}

export interface BusinessContext {
  industry:       string;   // e.g. "fashion", "tech", "restaurant"
  targetAudience: string;   // e.g. "young professionals", "enterprise"
  competitors:    string[];
  timeline:       string;   // e.g. "2 weeks", "urgent", "flexible"
  budgetSignal:   string;   // e.g. "premium", "budget-conscious", "undefined"
}

export interface ConversationAnalysisResult {
  projectType:        string;          // e.g. "e-commerce", "portfolio", "landing-page"
  platformPreference: PlatformTarget;
  confidence:         number;          // 0-1
  designSystem:       DesignSystem;
  designRequirements: DesignRequirements;
  contentRequirements: ContentRequirements;
  businessContext:    BusinessContext;
  brandEssence:       string;          // single word capturing the soul
  visualTension:      string;          // opposing forces (e.g. "minimal vs bold")
  signatureMoment:    string;          // what people will screenshot
}

// ── Architecture Plan ─────────────────────────────────────────────────

export interface ArchitecturePlan {
  platform:           PlatformTarget;
  fileTree:           string[];     // list of file paths to generate
  componentBreakdown: ComponentSpec[];
  pages:              PageSpec[];
  designTokens:       Record<string, string>;  // CSS custom properties
  animationPlan:      AnimationPlanItem[];
  performanceBudget:  PerformanceBudget;
}

export interface ComponentSpec {
  name:     string;   // e.g. "Hero", "FeatureGrid", "ProductCard"
  filePath: string;
  purpose:  string;
  props:    string[];
  animations: string[];  // animation descriptions
}

export interface PageSpec {
  name:       string;
  route:      string;
  components: string[];  // component names used
  layout:     string;    // layout description
}

export interface AnimationPlanItem {
  element:     string;
  trigger:     string;  // "load" | "scroll" | "hover" | "click"
  animation:   string;  // description
  easing:      string;
  duration:    string;
  stagger?:    string;
}

export interface PerformanceBudget {
  lcpTarget:    string;  // e.g. "<2.5s"
  clsTarget:    string;  // e.g. "~0"
  fpsTarget:    number;  // 60
  bundleTarget: string;  // e.g. "<200KB JS"
}

// ── Generated Code Artifact ───────────────────────────────────────────

export interface CodeArtifact {
  filePath: string;    // e.g. "sections/hero.liquid" or "src/components/Hero.tsx"
  content:  string;
  language: string;    // e.g. "liquid", "php", "typescript", "css"
  purpose:  string;    // e.g. "hero-section", "theme-config", "component"
}

// ── SSE Stream Events ─────────────────────────────────────────────────

export type AIStreamEvent =
  | { type: "ai:phase-change";    sessionId: string; phase: AIPhase; timestamp: string }
  | { type: "ai:analysis-chunk";  sessionId: string; chunk: string }
  | { type: "ai:code-chunk";      sessionId: string; chunk: string }
  | { type: "ai:complete";        sessionId: string; phase: AIPhase }
  | { type: "ai:error";           sessionId: string; error: string };

// ── Usage Metrics ─────────────────────────────────────────────────────

export interface AIUsageMetrics {
  inputTokens:  number;
  outputTokens: number;
  totalCost:    number;   // estimated USD
  model:        string;
  latencyMs:    number;
}
