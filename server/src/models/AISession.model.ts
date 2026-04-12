import mongoose, { Schema, Document, Types } from "mongoose";

export type AIPhase         = "analyzing" | "planning" | "generating" | "reviewing" | "ready" | "failed";
export type AISessionStatus = "active" | "completed" | "failed" | "cancelled";

export interface IAISession extends Document {
  agencyId:       Types.ObjectId;
  signalId?:      Types.ObjectId;
  projectId?:     Types.ObjectId;
  requirementId?: Types.ObjectId;
  phase:          AIPhase;
  status:         AISessionStatus;
  usage: {
    inputTokens:  number;
    outputTokens: number;
    totalCost:    number;
    model:        string;
  };
  error?:    string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const UsageSchema = new Schema(
  {
    inputTokens:  { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    totalCost:    { type: Number, default: 0 },
    model:        { type: String, default: "" },
  },
  { _id: false }
);

const AISessionSchema = new Schema<IAISession>(
  {
    agencyId:       { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    signalId:       { type: Schema.Types.ObjectId, ref: "Signal" },
    projectId:      { type: Schema.Types.ObjectId, ref: "Project" },
    requirementId:  { type: Schema.Types.ObjectId, ref: "ProjectRequirement" },
    phase:          { type: String, enum: ["analyzing", "planning", "generating", "reviewing", "ready", "failed"], default: "analyzing" },
    status:         { type: String, enum: ["active", "completed", "failed", "cancelled"], default: "active" },
    usage:          { type: UsageSchema, default: () => ({}) },
    error:          { type: String },
    metadata:       { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const AISession =
  mongoose.models.AISession ?? mongoose.model<IAISession>("AISession", AISessionSchema);
