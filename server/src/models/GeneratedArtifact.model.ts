import mongoose, { Schema, Document, Types } from "mongoose";

export interface IGeneratedArtifact extends Document {
  agencyId:      Types.ObjectId;
  sessionId:     Types.ObjectId;
  requirementId: Types.ObjectId;
  projectId?:    Types.ObjectId;

  filePath: string;   // e.g. "sections/hero.liquid" or "src/components/Hero.tsx"
  content:  string;   // the generated code
  language: string;   // e.g. "liquid", "php", "typescript", "css", "json"
  purpose:  string;   // e.g. "hero-section", "theme-config", "component"
  platform: string;   // "shopify" | "wordpress" | "ikas" | "custom"
  version:  number;   // increments on re-generation

  createdAt: Date;
  updatedAt: Date;
}

const GeneratedArtifactSchema = new Schema<IGeneratedArtifact>(
  {
    agencyId:      { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sessionId:     { type: Schema.Types.ObjectId, ref: "AISession", required: true, index: true },
    requirementId: { type: Schema.Types.ObjectId, ref: "ProjectRequirement", required: true },
    projectId:     { type: Schema.Types.ObjectId, ref: "Project" },

    filePath: { type: String, required: true },
    content:  { type: String, required: true },
    language: { type: String, required: true },
    purpose:  { type: String, default: "" },
    platform: { type: String, enum: ["shopify", "wordpress", "ikas", "custom"], required: true },
    version:  { type: Number, default: 1 },
  },
  { timestamps: true }
);

export const GeneratedArtifact =
  mongoose.models.GeneratedArtifact ??
  mongoose.model<IGeneratedArtifact>("GeneratedArtifact", GeneratedArtifactSchema);
