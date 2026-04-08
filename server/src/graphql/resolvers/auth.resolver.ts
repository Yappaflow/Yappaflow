import bcrypt from "bcryptjs";
import { User } from "../../models/User.model";
import { signToken } from "../../services/jwt.service";
import {
  sendWhatsappOtp,
  sendPhoneVerifyOtp,
  verifyOtp,
} from "../../services/otp.service";
import { GraphQLError } from "graphql";

function formatUser(user: InstanceType<typeof User>) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    phoneVerified: user.phoneVerified,
    authProvider: user.authProvider,
    avatarUrl: user.avatarUrl,
    locale: user.locale,
    createdAt: user.createdAt.toISOString(),
  };
}

export const authResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, ctx: { userId?: string }) => {
      if (!ctx.userId) return null;
      const user = await User.findById(ctx.userId);
      return user ? formatUser(user) : null;
    },
  },

  Mutation: {
    registerWithEmail: async (
      _: unknown,
      { input }: { input: { email: string; password: string; name: string } }
    ) => {
      const existing = await User.findOne({ email: input.email.toLowerCase() });
      if (existing) {
        throw new GraphQLError("Email already in use", {
          extensions: { code: "EMAIL_TAKEN" },
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 12);
      const user = await User.create({
        email: input.email.toLowerCase(),
        passwordHash,
        name: input.name,
        authProvider: "email",
      });

      const token = signToken({ userId: user.id, email: user.email });
      return { token, user: formatUser(user) };
    },

    loginWithEmail: async (
      _: unknown,
      { input }: { input: { email: string; password: string } }
    ) => {
      const user = await User.findOne({ email: input.email.toLowerCase() });
      if (!user || !(await user.comparePassword(input.password))) {
        throw new GraphQLError("Invalid email or password", {
          extensions: { code: "INVALID_CREDENTIALS" },
        });
      }

      const token = signToken({ userId: user.id, email: user.email });
      return { token, user: formatUser(user) };
    },

    requestWhatsappOtp: async (
      _: unknown,
      { phone }: { phone: string }
    ) => {
      // Normalize phone (must start with +)
      const normalized = phone.startsWith("+") ? phone : `+${phone}`;
      await sendWhatsappOtp(normalized);
      return {
        success: true,
        message: `Verification code sent to WhatsApp ${normalized}`,
      };
    },

    verifyWhatsappOtp: async (
      _: unknown,
      { phone, code }: { phone: string; code: string }
    ) => {
      const normalized = phone.startsWith("+") ? phone : `+${phone}`;
      const valid = await verifyOtp(normalized, code, "whatsapp_login");

      if (!valid) {
        throw new GraphQLError("Invalid or expired OTP", {
          extensions: { code: "INVALID_OTP" },
        });
      }

      // Find or create user by phone
      let user = await User.findOne({ phone: normalized });
      if (!user) {
        user = await User.create({
          phone: normalized,
          name: `User ${normalized.slice(-4)}`,
          authProvider: "whatsapp",
          phoneVerified: true, // WhatsApp OTP = phone is verified
        });
      }

      const token = signToken({ userId: user.id, phone: user.phone });
      return { token, user: formatUser(user) };
    },

    requestPhoneVerification: async (
      _: unknown,
      { phone }: { phone: string },
      ctx: { userId?: string }
    ) => {
      if (!ctx.userId) {
        throw new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const normalized = phone.startsWith("+") ? phone : `+${phone}`;

      // Check not taken by another user
      const taken = await User.findOne({
        phone: normalized,
        _id: { $ne: ctx.userId },
      });
      if (taken) {
        throw new GraphQLError("Phone number already in use", {
          extensions: { code: "PHONE_TAKEN" },
        });
      }

      await sendPhoneVerifyOtp(normalized);
      return {
        success: true,
        message: `Verification code sent via SMS to ${normalized}`,
      };
    },

    verifyPhone: async (
      _: unknown,
      { phone, code }: { phone: string; code: string },
      ctx: { userId?: string }
    ) => {
      if (!ctx.userId) {
        throw new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const normalized = phone.startsWith("+") ? phone : `+${phone}`;
      const valid = await verifyOtp(normalized, code, "phone_verify");

      if (!valid) {
        throw new GraphQLError("Invalid or expired OTP", {
          extensions: { code: "INVALID_OTP" },
        });
      }

      const user = await User.findByIdAndUpdate(
        ctx.userId,
        { phone: normalized, phoneVerified: true },
        { new: true }
      );

      if (!user) throw new GraphQLError("User not found");
      return formatUser(user);
    },

    logout: () => true,
  },
};
