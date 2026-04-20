import mongoose, { Schema, Document, Types } from "mongoose";

export type ProjectPlatform = "shopify" | "wordpress" | "webflow" | "ikas" | "custom";
export type ProjectPhase    = "listening" | "building" | "deploying" | "live";
export type BuildJobStatus  = "pending" | "running" | "done" | "failed";

/**
 * One option of a product variant axis.
 *
 * Examples:
 *   { label: "S" }                 (apparel size with no price delta)
 *   { label: "XL", price: 32.00 }  (apparel size that costs more)
 *   { label: "Sage Green" }        (color)
 */
export interface IProductVariant {
  label:  string;
  price?: number;        // optional override; falls back to product.price
  sku?:   string;
}

/**
 * A single product in the e-commerce catalog of a Project's identity.
 * Persisted on `Project.identity.products`. Used by both the custom
 * static-site generator and the Shopify exporter.
 */
export interface IProduct {
  name:        string;
  price:       number;
  currency?:   string;          // ISO 4217, defaults to "USD" downstream
  description?: string;
  images?:     string[];        // absolute URLs preferred; data: URIs allowed
  variantKind?: string;         // e.g. "size", "color"; informs UI label
  variants?:   IProductVariant[];
  sku?:        string;
}

export interface IProjectIdentity {
  businessName:      string;
  tagline?:          string;
  industry?:         string;
  tone?:             string;
  city?:             string;
  domainSuggestions: string[];
  /**
   * E-commerce catalog. Populated when the conversation makes the business
   * look like a shop (industry === "ecommerce" or "fashion" with explicit
   * product mentions). Empty/absent for service businesses.
   */
  products?:         IProduct[];
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

const ProductVariantSchema = new Schema<IProductVariant>(
  {
    label: { type: String, required: true },
    price: { type: Number },
    sku:   { type: String },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    name:        { type: String, required: true },
    price:       { type: Number, required: true },
    currency:    { type: String },
    description: { type: String },
    images:      { type: [String], default: [] },
    variantKind: { type: String },
    variants:    { type: [ProductVariantSchema], default: [] },
    sku:         { type: String },
  },
  { _id: false }
);

const ProjectIdentitySchema = new Schema<IProjectIdentity>(
  {
    businessName:      { type: String, required: true },
    tagline:           { type: String },
    industry:          { type: String },
    tone:              { type: String },
    city:              { type: String },
    domainSuggestions: { type: [String], default: [] },
    products:          { type: [ProductSchema], default: [] },
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
