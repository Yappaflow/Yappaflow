import mongoose, { Schema, Document, Types } from "mongoose";

export type ProjectPlatform = "shopify" | "wordpress" | "webflow" | "ikas" | "custom";
export type ProjectPhase    = "listening" | "building" | "deploying" | "live";
export type BuildJobStatus  = "pending" | "running" | "done" | "failed";

export interface IProjectIdentity {
  businessName:      string;
  tagline?:          string;
  industry?:         string;
  tone?:             string;
  city?:             string;
  domainSuggestions: string[];
  extractedAt:       Date;
}

export interface IProject extends Document {
  agencyId:         Types.ObjectId;
  name:             string;
  clientName:       string;
  platform:         ProjectPlatform;
  phase:            ProjectPhase;
  progress:         number;          // 0–100
  signalId?:        Types.ObjectId;  // linked incoming signal
  dueDate?:         Date;
  liveUrl?:         string;
  notes?:           string;
  identity?:        IProjectIdentity;
  domainPurchased?: string;          // the domain the agency actually bought on Namecheap
  buildJobStatus?:  BuildJobStatus;
  buildFilesDone?:  number;
  buildFilesTotal?: number;
  buildError?:      string;
  downloadedAt?:    Date;
  createdAt:        Date;
  updatedAt:        Date;
}

const ProjectIdentitySchema = new Schema<IProjectIdentity>(
  {
    businessName:      { type: String, required: true },
    tagline:           { type: String },
    industry:          { type: String },
    tone:              { type: String },
    city:              { type: String },
    domainSuggestions: { type: [String], default: [] },
    extractedAt:       { type: Date, default: Date.now },
  },
  { _id: false }
);

const ProjectSchema = new Schema<IProject>(
  {
    agencyId:        { type: Schema.Types.ObjectId, ref: "User",   required: true, index: true },
    name:            { type: String, required: true },
    clientName:      { type: String, required: true },
    platform:        { type: String, enum: ["shopify", "wordpress", "webflow", "ikas", "custom"], required: true },
    phase:           { type: String, enum: ["listening", "building", "deploying", "live"], default: "listening" },
    progress:        { type: Number, default: 0, min: 0, max: 100 },
    signalId:        { type: Schema.Types.ObjectId, ref: "Signal" },
    dueDate:         { type: Date },
    liveUrl:         { type: String },
    notes:           { type: String },
    identity:        { type: ProjectIdentitySchema },
    domainPurchased: { type: String },
    buildJobStatus:  { type: String, enum: ["pending", "running", "done", "failed"] },
    buildFilesDone:  { type: Number, default: 0 },
    buildFilesTotal: { type: Number, default: 0 },
    buildError:      { type: String },
    downloadedAt:    { type: Date },
  },
  { timestamps: true }
);

export const Project = mongoose.models.Project ?? mongoose.model<IProject>("Project", ProjectSchema);
