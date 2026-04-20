import bcrypt from "bcryptjs";
import { User } from "../../models/User.model";
import { PlatformConnection } from "../../models/PlatformConnection.model";
import {
  signToken,
  signMfaChallengeToken,
  verifyMfaChallengeToken,
} from "../../services/jwt.service";
import {
  sendWhatsappOtp,
  sendPhoneVerifyOtp,
  verifyOtp,
} from "../../services/otp.service";
import * as mfa from "../../services/mfa.service";
import { GraphQLError } from "graphql";

/**
 * Fields needed to read a user's MFA state on login / management flows.
 * Must be explicitly selected — they're `select: false` on the schema so
 * they never leak through a casual `findById()`.
 */
const MFA_SELECT =
  "+mfaSecret +mfaSecretIv +mfaSecretKeyId " +
  "+mfaPendingSecret +mfaPendingSecretIv +mfaPendingSecretKeyId " +
  "+mfaBackupCodes";

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
    mfaEnabled: user.mfaEnabled === true,
    // If backupCodes weren't selected, default remaining to 0.
    mfaBackupCodesRemaining: user.mfaBackupCodes
      ? mfa.remainingBackupCodes(user)
      : 0,
    createdAt: user.createdAt.toISOString(),
  };
}

function requireAuth(ctx: { userId?: string }): string {
  if (!ctx.userId) {
    throw new GraphQLError("Not authenticated", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
  return ctx.userId;
}

export const authResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, ctx: { userId?: string }) => {
      if (!ctx.userId) return null;
      // select backup codes too so the UI can render "n codes left".
      const user = await User.findById(ctx.userId).select("+mfaBackupCodes");
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
      return {
        token,
        user: formatUser(user),
        mfaRequired: false,
        mfaChallengeToken: null,
      };
    },

    loginWithEmail: async (
      _: unknown,
      { input }: { input: { email: string; password: string } }
    ) => {
      // Load with MFA fields so we can branch on mfaEnabled.
      const user = await User.findOne({ email: input.email.toLowerCase() }).select(
        MFA_SELECT
      );
      if (!user || !(await user.comparePassword(input.password))) {
        throw new GraphQLError("Invalid email or password", {
          extensions: { code: "INVALID_CREDENTIALS" },
        });
      }

      // If MFA is on, we don't hand out a session JWT yet — we issue a
      // short-lived challenge token that loginWithMfa will exchange for
      // a real token once the second factor is proven.
      if (user.mfaEnabled) {
        const challengeToken = signMfaChallengeToken(user.id);
        return {
          token: null,
          user: null,
          mfaRequired: true,
          mfaChallengeToken: challengeToken,
        };
      }

      const token = signToken({ userId: user.id, email: user.email });
      return {
        token,
        user: formatUser(user),
        mfaRequired: false,
        mfaChallengeToken: null,
      };
    },

    loginWithMfa: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          challengeToken: string;
          code: string;
          useBackupCode?: boolean;
        };
      }
    ) => {
      let decoded;
      try {
        decoded = verifyMfaChallengeToken(input.challengeToken);
      } catch {
        throw new GraphQLError("Invalid or expired MFA session", {
          extensions: { code: "MFA_CHALLENGE_INVALID" },
        });
      }

      const user = await User.findById(decoded.userId).select(MFA_SELECT);
      if (!user || !user.mfaEnabled) {
        throw new GraphQLError("MFA not enabled for this account", {
          extensions: { code: "MFA_NOT_ENABLED" },
        });
      }

      const ok = input.useBackupCode
        ? await mfa.verifyBackupCode(user, input.code)
        : await mfa.verifyTotp(user, input.code);

      if (!ok) {
        throw new GraphQLError("Invalid verification code", {
          extensions: { code: "MFA_INVALID_CODE" },
        });
      }

      const token = signToken({ userId: user.id, email: user.email });
      return {
        token,
        user: formatUser(user),
        mfaRequired: false,
        mfaChallengeToken: null,
      };
    },

    mfaInit: async (_: unknown, __: unknown, ctx: { userId?: string }) => {
      const userId = requireAuth(ctx);
      const user = await User.findById(userId).select(MFA_SELECT);
      if (!user) throw new GraphQLError("User not found");

      if (user.mfaEnabled) {
        throw new GraphQLError(
          "MFA is already enabled. Disable it first to re-enroll.",
          { extensions: { code: "MFA_ALREADY_ENABLED" } }
        );
      }

      const setup = await mfa.startEnrollment(user);
      return setup;
    },

    mfaEnable: async (
      _: unknown,
      { code }: { code: string },
      ctx: { userId?: string }
    ) => {
      const userId = requireAuth(ctx);
      const user = await User.findById(userId).select(MFA_SELECT);
      if (!user) throw new GraphQLError("User not found");

      try {
        const { backupCodes } = await mfa.confirmAndEnable(user, code);
        return { success: true, backupCodes };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "MFA_NO_PENDING_ENROLLMENT") {
          throw new GraphQLError(
            "No enrollment in progress. Call mfaInit first.",
            { extensions: { code: "MFA_NO_PENDING_ENROLLMENT" } }
          );
        }
        if (msg === "MFA_TOO_MANY_ATTEMPTS") {
          throw new GraphQLError(
            "Too many invalid attempts. Try again in 15 minutes.",
            { extensions: { code: "MFA_RATE_LIMITED" } }
          );
        }
        throw new GraphQLError("Invalid verification code", {
          extensions: { code: "MFA_INVALID_CODE" },
        });
      }
    },

    mfaDisable: async (
      _: unknown,
      { code }: { code: string },
      ctx: { userId?: string }
    ) => {
      const userId = requireAuth(ctx);
      const user = await User.findById(userId).select(MFA_SELECT);
      if (!user) throw new GraphQLError("User not found");
      if (!user.mfaEnabled) {
        throw new GraphQLError("MFA is not enabled", {
          extensions: { code: "MFA_NOT_ENABLED" },
        });
      }

      const ok = await mfa.verifyTotp(user, code);
      if (!ok) {
        throw new GraphQLError("Invalid verification code", {
          extensions: { code: "MFA_INVALID_CODE" },
        });
      }

      await mfa.disableMfa(user);
      return true;
    },

    mfaRegenerateBackupCodes: async (
      _: unknown,
      { code }: { code: string },
      ctx: { userId?: string }
    ) => {
      const userId = requireAuth(ctx);
      const user = await User.findById(userId).select(MFA_SELECT);
      if (!user) throw new GraphQLError("User not found");
      if (!user.mfaEnabled) {
        throw new GraphQLError("MFA is not enabled", {
          extensions: { code: "MFA_NOT_ENABLED" },
        });
      }

      const ok = await mfa.verifyTotp(user, code);
      if (!ok) {
        throw new GraphQLError("Invalid verification code", {
          extensions: { code: "MFA_INVALID_CODE" },
        });
      }

      const backupCodes = await mfa.regenerateBackupCodes(user);
      return { backupCodes };
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

      // Auto-connect WhatsApp platform — track phone without WABA credentials
      await PlatformConnection.findOneAndUpdate(
        { userId: user.id, platform: "whatsapp" },
        {
          $set: {
            userId:       user.id,
            platform:     "whatsapp",
            displayPhone: normalized,
            isActive:     true,
          },
        },
        { upsert: true, new: true }
      );

      // If the user previously enabled TOTP, require it here too. WhatsApp
      // OTP alone isn't enough: a SIM-swap attacker can receive the OTP but
      // won't have the authenticator-app secret. The TOTP challenge closes
      // that hole — same mfaChallengeToken contract as email login.
      if (user.mfaEnabled) {
        const challengeToken = signMfaChallengeToken(user.id);
        return {
          token: null,
          user: null,
          mfaRequired: true,
          mfaChallengeToken: challengeToken,
        };
      }

      const token = signToken({ userId: user.id, phone: user.phone });
      return {
        token,
        user: formatUser(user),
        mfaRequired: false,
        mfaChallengeToken: null,
      };
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
