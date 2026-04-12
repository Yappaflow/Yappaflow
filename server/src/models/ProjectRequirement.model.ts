import mongoose, { Schema, Document, Types } from "mongoose";

export type PlatformTarget = "shopify" | "wordpress" | "ikas" | "custom";
export type AnimationStyle = "locomotive" | "studio-freight" | "area17" | "hello-monday";

export interface IProjectRequirement extends Document {
  agencyId:   Types.ObjectId;
  signalId?:  Types.ObjectId;
  sessionId:  Types.ObjectId;
  projectId?: Types.ObjectId;

  projectType:        string;
  platformPreference: PlatformTarget;
  confidence:         number;

  designSystem: {
    colorPalette: { primary: string; secondary: string; accent: string; background: string; text: string };
    typography:   { displayFont: string; bodyFont: string; heroScale: string; bodyScale: string; tracking: string };
    easing:       { primary: string; dramatic: string; symmetric: string };
    spacing:      { sectionPadding: string; gridGutter: string; gridMargin: string };
    animationStyle:  AnimationStyle;
    scrollBehavior:  string;
    signatureMoment: string;
    mood:            string;
  };

  designRequirements: {
    style:      string;
    references: string[];
    responsive: boolean;
    darkMode:   boolean;
  };

  contentRequirements: {
    pages:        string[];
    features:     string[];
    integrations: string[];
    languages:    string[];
  };

  businessContext: {
    industry:       string;
    targetAudience: string;
    competitors:    string[];
    timeline:       string;
    budgetSignal:   string;
  };

  brandEssence:    string;
  visualTension:   string;
  signatureMoment: string;
  rawAnalysis:     string;

  createdAt: Date;
  updatedAt: Date;
}

const ColorPaletteSchema = new Schema(
  { primary: String, secondary: String, accent: String, background: String, text: String },
  { _id: false }
);

const TypographySchema = new Schema(
  { displayFont: String, bodyFont: String, heroScale: String, bodyScale: String, tracking: String },
  { _id: false }
);

const EasingSchema = new Schema(
  { primary: String, dramatic: String, symmetric: String },
  { _id: false }
);

const SpacingSchema = new Schema(
  { sectionPadding: String, gridGutter: String, gridMargin: String },
  { _id: false }
);

const DesignSystemSchema = new Schema(
  {
    colorPalette:    { type: ColorPaletteSchema },
    typography:      { type: TypographySchema },
    easing:          { type: EasingSchema },
    spacing:         { type: SpacingSchema },
    animationStyle:  { type: String, enum: ["locomotive", "studio-freight", "area17", "hello-monday"], default: "locomotive" },
    scrollBehavior:  { type: String, default: "smooth-lenis" },
    signatureMoment: { type: String, default: "" },
    mood:            { type: String, default: "" },
  },
  { _id: false }
);

const DesignReqSchema = new Schema(
  {
    style:      { type: String, default: "" },
    references: [{ type: String }],
    responsive: { type: Boolean, default: true },
    darkMode:   { type: Boolean, default: false },
  },
  { _id: false }
);

const ContentReqSchema = new Schema(
  {
    pages:        [{ type: String }],
    features:     [{ type: String }],
    integrations: [{ type: String }],
    languages:    [{ type: String }],
  },
  { _id: false }
);

const BusinessCtxSchema = new Schema(
  {
    industry:       { type: String, default: "" },
    targetAudience: { type: String, default: "" },
    competitors:    [{ type: String }],
    timeline:       { type: String, default: "" },
    budgetSignal:   { type: String, default: "" },
  },
  { _id: false }
);

const ProjectRequirementSchema = new Schema<IProjectRequirement>(
  {
    agencyId:   { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    signalId:   { type: Schema.Types.ObjectId, ref: "Signal" },
    sessionId:  { type: Schema.Types.ObjectId, ref: "AISession", required: true },
    projectId:  { type: Schema.Types.ObjectId, ref: "Project" },

    projectType:        { type: String, required: true },
    platformPreference: { type: String, enum: ["shopify", "wordpress", "ikas", "custom"], required: true },
    confidence:         { type: Number, default: 0.5 },

    designSystem:       { type: DesignSystemSchema },
    designRequirements: { type: DesignReqSchema },
    contentRequirements: { type: ContentReqSchema },
    businessContext:    { type: BusinessCtxSchema },

    brandEssence:    { type: String, default: "" },
    visualTension:   { type: String, default: "" },
    signatureMoment: { type: String, default: "" },
    rawAnalysis:     { type: String, default: "" },
  },
  { timestamps: true }
);

export const ProjectRequirement =
  mongoose.models.ProjectRequirement ??
  mongoose.model<IProjectRequirement>("ProjectRequirement", ProjectRequirementSchema);
