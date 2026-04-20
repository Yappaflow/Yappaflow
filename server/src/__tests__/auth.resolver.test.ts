import { describe, it, expect, vi, beforeEach } from "vitest";
import { GraphQLError } from "graphql";

// ── Mock models (paths relative to this test file: src/__tests__/) ──────────
const mockUser = {
  id: "user-id-1",
  name: "Test User",
  email: "test@yappaflow.com",
  phone: undefined as string | undefined,
  phoneVerified: false,
  authProvider: "email" as const,
  avatarUrl: undefined as string | undefined,
  locale: "en" as const,
  createdAt: new Date("2024-01-01T00:00:00Z"),
  comparePassword: vi.fn(),
};

vi.mock("../models/User.model", () => ({
  User: {
    findOne: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../models/PlatformConnection.model", () => ({
  PlatformConnection: {
    findOneAndUpdate: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("../services/jwt.service", () => ({
  signToken: vi.fn(() => "mock-jwt-token"),
}));

vi.mock("../services/otp.service", () => ({
  sendWhatsappOtp: vi.fn().mockResolvedValue(undefined),
  sendPhoneVerifyOtp: vi.fn().mockResolvedValue(undefined),
  verifyOtp: vi.fn(),
}));

vi.mock("../utils/logger", () => ({ log: vi.fn() }));

// Resolver imports the models from its own location — those resolve to the
// same files as the mocks above (both resolve to src/models/*, src/services/*).
const { authResolvers } = await import("../graphql/resolvers/auth.resolver");
const { User } = await import("../models/User.model");
const { signToken } = await import("../services/jwt.service");
const { verifyOtp, sendWhatsappOtp, sendPhoneVerifyOtp } = await import("../services/otp.service");

const noCtx = {};
const authCtx = { userId: "user-id-1" };

function formatExpected(user: typeof mockUser) {
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

describe("authResolvers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Query.me ───────────────────────────────────────────────────────────────
  describe("Query.me", () => {
    it("returns null when not authenticated", async () => {
      const result = await authResolvers.Query.me(undefined, undefined, noCtx);
      expect(result).toBeNull();
    });

    it("returns formatted user when authenticated and user exists", async () => {
      vi.mocked(User.findById).mockResolvedValueOnce(mockUser as never);
      const result = await authResolvers.Query.me(undefined, undefined, authCtx);
      expect(result).toEqual(formatExpected(mockUser));
    });

    it("returns null when authenticated but user not found in DB", async () => {
      vi.mocked(User.findById).mockResolvedValueOnce(null);
      const result = await authResolvers.Query.me(undefined, undefined, authCtx);
      expect(result).toBeNull();
    });
  });

  // ── Mutation.registerWithEmail ─────────────────────────────────────────────
  describe("Mutation.registerWithEmail", () => {
    const input = { email: "new@yappaflow.com", password: "Password123!", name: "New User" };

    it("throws EMAIL_TAKEN when email already exists", async () => {
      vi.mocked(User.findOne).mockResolvedValueOnce(mockUser as never);
      await expect(
        authResolvers.Mutation.registerWithEmail(undefined, { input })
      ).rejects.toMatchObject({ extensions: { code: "EMAIL_TAKEN" } });
    });

    it("creates user and returns token on success", async () => {
      vi.mocked(User.findOne).mockResolvedValueOnce(null);
      const newUser = { ...mockUser, email: "new@yappaflow.com", id: "new-id" };
      vi.mocked(User.create).mockResolvedValueOnce(newUser as never);

      const result = await authResolvers.Mutation.registerWithEmail(undefined, { input });

      expect(result.token).toBe("mock-jwt-token");
      expect(result.user.email).toBe("new@yappaflow.com");
      expect(signToken).toHaveBeenCalledWith({ userId: "new-id", email: "new@yappaflow.com" });
    });

    it("lowercases email before lookup and creation", async () => {
      vi.mocked(User.findOne).mockResolvedValueOnce(null);
      vi.mocked(User.create).mockResolvedValueOnce({ ...mockUser, email: "new@yappaflow.com", id: "x" } as never);

      await authResolvers.Mutation.registerWithEmail(undefined, {
        input: { ...input, email: "NEW@YAPPAFLOW.COM" },
      });

      expect(User.findOne).toHaveBeenCalledWith({ email: "new@yappaflow.com" });
    });
  });

  // ── Mutation.loginWithEmail ────────────────────────────────────────────────
  describe("Mutation.loginWithEmail", () => {
    const input = { email: "test@yappaflow.com", password: "Password123!" };

    it("throws INVALID_CREDENTIALS when user not found", async () => {
      vi.mocked(User.findOne).mockResolvedValueOnce(null);
      await expect(
        authResolvers.Mutation.loginWithEmail(undefined, { input })
      ).rejects.toMatchObject({ extensions: { code: "INVALID_CREDENTIALS" } });
    });

    it("throws INVALID_CREDENTIALS when password doesn't match", async () => {
      const userWithBadPw = { ...mockUser, comparePassword: vi.fn().mockResolvedValue(false) };
      vi.mocked(User.findOne).mockResolvedValueOnce(userWithBadPw as never);

      await expect(
        authResolvers.Mutation.loginWithEmail(undefined, { input })
      ).rejects.toMatchObject({ extensions: { code: "INVALID_CREDENTIALS" } });
    });

    it("returns token and user on valid credentials", async () => {
      const userOk = { ...mockUser, comparePassword: vi.fn().mockResolvedValue(true) };
      vi.mocked(User.findOne).mockResolvedValueOnce(userOk as never);

      const result = await authResolvers.Mutation.loginWithEmail(undefined, { input });

      expect(result.token).toBe("mock-jwt-token");
      expect(result.user.id).toBe("user-id-1");
      expect(signToken).toHaveBeenCalledWith({ userId: "user-id-1", email: "test@yappaflow.com" });
    });
  });

  // ── Mutation.requestWhatsappOtp ────────────────────────────────────────────
  describe("Mutation.requestWhatsappOtp", () => {
    it("normalizes phone without + prefix", async () => {
      const result = await authResolvers.Mutation.requestWhatsappOtp(undefined, { phone: "905551234567" });
      expect(sendWhatsappOtp).toHaveBeenCalledWith("+905551234567");
      expect(result.success).toBe(true);
    });

    it("passes phone with + through unchanged", async () => {
      await authResolvers.Mutation.requestWhatsappOtp(undefined, { phone: "+905551234567" });
      expect(sendWhatsappOtp).toHaveBeenCalledWith("+905551234567");
    });
  });

  // ── Mutation.verifyWhatsappOtp ─────────────────────────────────────────────
  describe("Mutation.verifyWhatsappOtp", () => {
    it("throws INVALID_OTP when OTP verification fails", async () => {
      vi.mocked(verifyOtp).mockResolvedValueOnce(false);
      await expect(
        authResolvers.Mutation.verifyWhatsappOtp(undefined, { phone: "+905551234567", code: "000000" })
      ).rejects.toMatchObject({ extensions: { code: "INVALID_OTP" } });
    });

    it("finds existing user and returns token when OTP is valid", async () => {
      vi.mocked(verifyOtp).mockResolvedValueOnce(true);
      const whatsappUser = { ...mockUser, phone: "+905551234567", authProvider: "whatsapp" as const, id: "wa-user-1" };
      vi.mocked(User.findOne).mockResolvedValueOnce(whatsappUser as never);

      const result = await authResolvers.Mutation.verifyWhatsappOtp(undefined, { phone: "+905551234567", code: "123456" });

      expect(result.token).toBe("mock-jwt-token");
      expect(result.user.id).toBe("wa-user-1");
    });

    it("creates a new user when no existing user matches phone", async () => {
      vi.mocked(verifyOtp).mockResolvedValueOnce(true);
      vi.mocked(User.findOne).mockResolvedValueOnce(null);
      const newUser = { ...mockUser, phone: "+905551234567", authProvider: "whatsapp" as const, id: "new-wa-user" };
      vi.mocked(User.create).mockResolvedValueOnce(newUser as never);

      const result = await authResolvers.Mutation.verifyWhatsappOtp(undefined, { phone: "+905551234567", code: "123456" });

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({ phone: "+905551234567", authProvider: "whatsapp", phoneVerified: true })
      );
      expect(result.user.id).toBe("new-wa-user");
    });
  });

  // ── Mutation.requestPhoneVerification ─────────────────────────────────────
  describe("Mutation.requestPhoneVerification", () => {
    it("throws UNAUTHENTICATED when not logged in", async () => {
      await expect(
        authResolvers.Mutation.requestPhoneVerification(undefined, { phone: "+905551234567" }, noCtx)
      ).rejects.toMatchObject({ extensions: { code: "UNAUTHENTICATED" } });
    });

    it("throws PHONE_TAKEN when phone belongs to another user", async () => {
      vi.mocked(User.findOne).mockResolvedValueOnce({ id: "other-user" } as never);
      await expect(
        authResolvers.Mutation.requestPhoneVerification(undefined, { phone: "+905551234567" }, authCtx)
      ).rejects.toMatchObject({ extensions: { code: "PHONE_TAKEN" } });
    });

    it("sends OTP and returns success when phone is available", async () => {
      vi.mocked(User.findOne).mockResolvedValueOnce(null);
      const result = await authResolvers.Mutation.requestPhoneVerification(undefined, { phone: "+905551234567" }, authCtx);
      expect(sendPhoneVerifyOtp).toHaveBeenCalledWith("+905551234567");
      expect(result.success).toBe(true);
    });
  });

  // ── Mutation.verifyPhone ───────────────────────────────────────────────────
  describe("Mutation.verifyPhone", () => {
    it("throws UNAUTHENTICATED when not logged in", async () => {
      await expect(
        authResolvers.Mutation.verifyPhone(undefined, { phone: "+905551234567", code: "123456" }, noCtx)
      ).rejects.toMatchObject({ extensions: { code: "UNAUTHENTICATED" } });
    });

    it("throws INVALID_OTP when code is wrong", async () => {
      vi.mocked(verifyOtp).mockResolvedValueOnce(false);
      await expect(
        authResolvers.Mutation.verifyPhone(undefined, { phone: "+905551234567", code: "000000" }, authCtx)
      ).rejects.toMatchObject({ extensions: { code: "INVALID_OTP" } });
    });

    it("updates user and returns formatted user on success", async () => {
      vi.mocked(verifyOtp).mockResolvedValueOnce(true);
      const updated = { ...mockUser, phone: "+905551234567", phoneVerified: true };
      vi.mocked(User.findByIdAndUpdate).mockResolvedValueOnce(updated as never);

      const result = await authResolvers.Mutation.verifyPhone(undefined, { phone: "+905551234567", code: "123456" }, authCtx);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        "user-id-1",
        { phone: "+905551234567", phoneVerified: true },
        { new: true }
      );
      expect(result.phoneVerified).toBe(true);
    });
  });

  // ── Mutation.logout ────────────────────────────────────────────────────────
  describe("Mutation.logout", () => {
    it("returns true", () => {
      expect(authResolvers.Mutation.logout()).toBe(true);
    });
  });
});
