import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export type AuthProvider = "email" | "whatsapp" | "instagram";

/**
 * A single-use recovery (backup) code, stored as a bcrypt hash.
 * Marked `used: true` after the user redeems it during an MFA challenge.
 */
export interface IBackupCode {
  hash: string;
  used: boolean;
  usedAt?: Date;
}

export interface IUser extends Document {
  email?: string;
  passwordHash?: string;
  name: string;
  locale: "en" | "tr";
  phone?: string;
  phoneVerified: boolean;
  authProvider: AuthProvider;
  instagramId?: string;
  instagramAccessToken?: string;
  avatarUrl?: string;

  // ── MFA (TOTP) ────────────────────────────────────────────────
  /** True once the user has verified a TOTP code against their secret. */
  mfaEnabled: boolean;
  /** Encrypted base32 TOTP secret (AES-256-GCM via encryption.service). */
  mfaSecret?: string;
  mfaSecretIv?: string;
  mfaSecretKeyId?: string;
  /** Encrypted pending secret — set during enrollment, promoted to
   *  `mfaSecret` once the user confirms their first code. */
  mfaPendingSecret?: string;
  mfaPendingSecretIv?: string;
  mfaPendingSecretKeyId?: string;
  /** Hashed single-use backup codes. Generated at enablement. */
  mfaBackupCodes: IBackupCode[];
  /** When MFA was turned on. */
  mfaEnabledAt?: Date;

  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const BackupCodeSchema = new Schema<IBackupCode>(
  {
    hash:   { type: String, required: true },
    used:   { type: Boolean, default: false },
    usedAt: { type: Date },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, unique: true, sparse: true, lowercase: true },
    passwordHash: { type: String },
    name: { type: String, required: true },
    locale: { type: String, enum: ["en", "tr"], default: "en" },
    phone: { type: String, unique: true, sparse: true },
    phoneVerified: { type: Boolean, default: false },
    authProvider: {
      type: String,
      enum: ["email", "whatsapp", "instagram"],
      required: true,
    },
    instagramId: { type: String, unique: true, sparse: true },
    instagramAccessToken: { type: String },
    avatarUrl: { type: String },

    // ── MFA ───────────────────────────────────────────────────
    //
    // Secrets are stored encrypted-at-rest. Backup codes are stored
    // as bcrypt hashes — the plaintext is shown to the user exactly
    // once at enrollment (and regeneration). `select: false` so they
    // never leak into a generic `findById()` response.
    mfaEnabled:           { type: Boolean, default: false },
    mfaSecret:            { type: String, select: false },
    mfaSecretIv:          { type: String, select: false },
    mfaSecretKeyId:       { type: String, select: false },
    mfaPendingSecret:     { type: String, select: false },
    mfaPendingSecretIv:   { type: String, select: false },
    mfaPendingSecretKeyId:{ type: String, select: false },
    mfaBackupCodes:       { type: [BackupCodeSchema], default: [], select: false },
    mfaEnabledAt:         { type: Date },
  },
  { timestamps: true }
);

UserSchema.methods.comparePassword = async function (
  password: string
): Promise<boolean> {
  if (!this.passwordHash) return false;
  return bcrypt.compare(password, this.passwordHash);
};

export const User = mongoose.model<IUser>("User", UserSchema);
