import mongoose, { Schema, Document, Types } from "mongoose";

export type ProjectPlatform = "shopify" | "wordpress" | "webflow" | "ikas" | "custom" | "yappaflow";
export type ProjectPhase    = "listening" | "building" | "deploying" | "live";
export type BuildJobStatus  = "pending" | "running" | "done" | "failed";

/**
 * Fine-grained build phase surfaced to the UI so the progress bar can show
 * something more useful than "0/18 files" during the long AI-generation
 * phase. These transitions are deliberately coarse — the UI animates
 * within each band using wall-clock elapsed time, so we don't need to
 * churn the DB with every internal tick.
 *
 *   queued      → request accepted, not yet picked up
 *   analyzing   → optional identity-extraction / planning step
 *   generating  → AI is producing the theme/site files (the long phase)
 *   patching    → re-running the AI on a small subset of files the
 *                 validator flagged (much faster than a full regen —
 *                 ~30 s vs ~3-4 min for Shopify bundles)
 *   validating  → parser + content-depth checks on the AI output
 *   packaging   → persisting artifacts, building the ZIP
 *   done / failed — terminal
 */
export type BuildPhase =
  | "queued"
  | "analyzing"
  | "generating"
  | "patching"
  | "validating"
  | "packaging"
  | "done"
  | "failed";

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

/**
 * State of the hero-chooser step, which runs BEFORE the full-site build.
 *
 *   generating   → the 3 Promise.all AI calls are in flight
 *   ready        → 3 variants persisted, waiting for the user to pick
 *   refining     → user picked one and asked for tweaks; AI call in flight
 *   refined      → refinement applied, ready for the full build
 *   picked       → user picked one and skipped refinement; ready for build
 *   failed       → at least one of the 3 AI calls failed outright — the
 *                  UI offers a "retry" button instead of showing partial
 *                  variants
 */
export type HeroChooserStatus =
  | "generating"
  | "ready"
  | "refining"
  | "refined"
  | "picked"
  | "failed";

/**
 * A single hero + first-fold variant the model proposed. We persist them
 * embedded on the Project because they're ephemeral — the moment the
 * user picks one and the full-site build kicks off, the other two can
 * be discarded. Storing them in a separate collection would be pure
 * overhead.
 *
 * The `html` field is a stand-alone HTML document fragment (srcdoc-
 * ready) that the web UI drops into an `<iframe srcdoc=…>`. It is NOT
 * a piece of the eventual Shopify/Yappaflow bundle — think of it as a
 * thumbnail + pitch for "here's one visual lane we could take". The
 * LOCKED variant is later threaded into the full-build prompt as
 * "match this hero's copy + layout".
 */
export interface IHeroVariant {
  id:        string;          // "variant-a" | "variant-b" | "variant-c"
  flavor:    string;          // short human-readable angle, e.g. "Typographic"
  html:      string;          // srcdoc-ready HTML for the web iframe
  direction: string;          // design-direction key (usually all 3 share one)
}

export interface IHeroChooser {
  status:           HeroChooserStatus;
  variants:         IHeroVariant[];
  /** The variant the user clicked on. Unset until they pick. */
  pickedVariantId?: string;
  /**
   * Free-text tweaks the user typed after picking. Persisted separately
   * from the refined `html` so we can show it back to them and (later)
   * let them iterate further. Empty/unset means they skipped refinement.
   */
  refinementText?:  string;
  /**
   * Server-assigned build key that the /build route uses to guarantee
   * the lockedHero carried into the generator matches the variant the
   * user actually picked (protects against race conditions where a
   * second /hero/variants call regenerates between pick and build).
   */
  lockedAt?:        Date;
  generatedAt?:     Date;
  error?:           string;
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
  /**
   * Transient hero-chooser state. Populated after the user opts into the
   * "pick a hero" flow; cleared (or ignored) if they go straight to a
   * one-shot build. Downstream generators read
   * `project.heroChooser.pickedVariantId` + the matching variant HTML
   * as the `lockedHero` input to keep the full-build visually consistent
   * with the thumbnail the user chose.
   */
  heroChooser?:     IHeroChooser;
  domainPurchased?: string;          // the domain the agency actually bought on Namecheap
  buildJobStatus?:  BuildJobStatus;
  buildPhase?:      BuildPhase;
  buildFilesDone?:  number;
  buildFilesTotal?: number;
  buildError?:      string;
  buildStartedAt?:  Date;
  buildAttempt?:    number;   // which retry attempt we're on (1..N)
  buildAttemptMax?: number;   // how many attempts the generator will try in total
  downloadedAt?:             Date;
  siteProject?:              unknown;
  siteProjectVersion?:       number;
  siteProjectUpdatedAt?:     Date;
  siteProjectGeneratedAt?:   Date;
  createdAt:                 Date;
  updatedAt:                 Date;
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

const HeroVariantSchema = new Schema<IHeroVariant>(
  {
    id:        { type: String, required: true },
    flavor:    { type: String, required: true },
    html:      { type: String, required: true },
    direction: { type: String, required: true },
  },
  { _id: false }
);

const HeroChooserSchema = new Schema<IHeroChooser>(
  {
    status: {
      type:    String,
      enum:    ["generating", "ready", "refining", "refined", "picked", "failed"],
      required: true,
    },
    variants:         { type: [HeroVariantSchema], default: [] },
    pickedVariantId:  { type: String },
    refinementText:   { type: String },
    lockedAt:         { type: Date },
    generatedAt:      { type: Date },
    error:            { type: String },
  },
  { _id: false }
);

const ProjectSchema = new Schema<IProject>(
  {
    agencyId:        { type: Schema.Types.ObjectId, ref: "User",   required: true, index: true },
    name:            { type: String, required: true },
    clientName:      { type: String, required: true },
    platform:        { type: String, enum: ["shopify", "wordpress", "webflow", "ikas", "custom", "yappaflow"], required: true },
    phase:           { type: String, enum: ["listening", "building", "deploying", "live"], default: "listening" },
    progress:        { type: Number, default: 0, min: 0, max: 100 },
    signalId:        { type: Schema.Types.ObjectId, ref: "Signal" },
    dueDate:         { type: Date },
    liveUrl:         { type: String },
    notes:           { type: String },
    identity:        { type: ProjectIdentitySchema },
    heroChooser:     { type: HeroChooserSchema },
    domainPurchased: { type: String },
    buildJobStatus:  { type: String, enum: ["pending", "running", "done", "failed"] },
    buildPhase:      { type: String, enum: ["queued", "analyzing", "generating", "patching", "validating", "packaging", "done", "failed"] },
    buildFilesDone:  { type: Number, default: 0 },
    buildFilesTotal: { type: Number, default: 0 },
    buildError:      { type: String },
    buildStartedAt:  { type: Date },
    buildAttempt:    { type: Number },
    buildAttemptMax: { type: Number },
    downloadedAt:             { type: Date },
    siteProject:              { type: Schema.Types.Mixed },
    siteProjectVersion:       { type: Number, default: 0 },
    siteProjectUpdatedAt:     { type: Date },
    siteProjectGeneratedAt:   { type: Date },
  },
  { timestamps: true }
);

export const Project = mongoose.models.Project ?? mongoose.model<IProject>("Project", ProjectSchema);
