import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export type AuthProvider = "email" | "whatsapp" | "instagram";

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
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

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
