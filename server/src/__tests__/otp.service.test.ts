import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock mongoose OtpCode model ─────────────────────────────────────────────
const mockRecord = {
  recipient: "+905551234567",
  code: "123456",
  purpose: "whatsapp_login" as const,
  used: false,
  attempts: 0,
  expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min from now
  save: vi.fn().mockResolvedValue(undefined),
  deleteOne: vi.fn().mockResolvedValue(undefined),
};

vi.mock("../models/OtpCode.model", () => ({
  OtpCode: {
    findOne: vi.fn(),
    deleteMany: vi.fn().mockResolvedValue({}),
    create: vi.fn().mockResolvedValue({}),
  },
  OtpPurpose: {},
}));

// Mock twilio so sendWhatsappOtp tests don't hit network
vi.mock("twilio", () => ({
  default: vi.fn(() => ({
    messages: { create: vi.fn().mockResolvedValue({ sid: "SM123" }) },
  })),
}));

// Mock env — no Twilio creds in tests
vi.mock("../config/env", () => ({
  env: {
    twilioAccountSid: "",
    twilioAuthToken: "",
    twilioWhatsappFrom: "whatsapp:+14155238886",
    twilioSmsFrom: "",
    jwtSecret: "test-secret",
    jwtExpiresIn: "7d",
  },
}));

// Mock logger
vi.mock("../utils/logger", () => ({ log: vi.fn() }));

const { verifyOtp } = await import("../services/otp.service");
const { OtpCode } = await import("../models/OtpCode.model");

function freshRecord(overrides: Partial<typeof mockRecord> = {}) {
  return {
    ...mockRecord,
    used: false,
    attempts: 0,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    save: vi.fn().mockResolvedValue(undefined),
    deleteOne: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("verifyOtp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when no matching OTP record exists", async () => {
    vi.mocked(OtpCode.findOne).mockResolvedValueOnce(null);
    const result = await verifyOtp("+905551234567", "123456", "whatsapp_login");
    expect(result).toBe(false);
  });

  it("returns false and deletes record when OTP is expired", async () => {
    const record = freshRecord({ expiresAt: new Date(Date.now() - 1000) }); // 1 s ago
    vi.mocked(OtpCode.findOne).mockResolvedValueOnce(record as never);

    const result = await verifyOtp("+905551234567", "123456", "whatsapp_login");

    expect(result).toBe(false);
    expect(record.deleteOne).toHaveBeenCalledOnce();
  });

  it("returns false and deletes record when max attempts exceeded", async () => {
    const record = freshRecord({ attempts: 5 }); // MAX_ATTEMPTS = 5, so next increment exceeds
    vi.mocked(OtpCode.findOne).mockResolvedValueOnce(record as never);

    const result = await verifyOtp("+905551234567", "999999", "whatsapp_login");

    expect(result).toBe(false);
    expect(record.deleteOne).toHaveBeenCalledOnce();
  });

  it("returns false and saves incremented attempts when code is wrong", async () => {
    const record = freshRecord({ attempts: 1 });
    vi.mocked(OtpCode.findOne).mockResolvedValueOnce(record as never);

    const result = await verifyOtp("+905551234567", "000000", "whatsapp_login");

    expect(result).toBe(false);
    expect(record.attempts).toBe(2);
    expect(record.save).toHaveBeenCalledOnce();
  });

  it("returns true and marks record as used when code is correct", async () => {
    const record = freshRecord({ code: "654321", attempts: 0 });
    vi.mocked(OtpCode.findOne).mockResolvedValueOnce(record as never);

    const result = await verifyOtp("+905551234567", "654321", "whatsapp_login");

    expect(result).toBe(true);
    expect(record.used).toBe(true);
    expect(record.save).toHaveBeenCalledOnce();
  });

  it("does not return true for an already-used OTP (findOne excludes used:true)", async () => {
    // The query uses { used: false } — simulate DB returning null for a used record
    vi.mocked(OtpCode.findOne).mockResolvedValueOnce(null);
    const result = await verifyOtp("+905551234567", "123456", "whatsapp_login");
    expect(result).toBe(false);
  });

  it("passes correct filter fields to findOne", async () => {
    vi.mocked(OtpCode.findOne).mockResolvedValueOnce(null);
    await verifyOtp("+905551234567", "123456", "phone_verify");
    expect(OtpCode.findOne).toHaveBeenCalledWith({
      recipient: "+905551234567",
      purpose: "phone_verify",
      used: false,
    });
  });

  it("returns false on a boundary attempt (exactly MAX_ATTEMPTS)", async () => {
    // attempts starts at 5 — increment makes it 6 > 5, triggers delete
    const record = freshRecord({ attempts: 5 });
    vi.mocked(OtpCode.findOne).mockResolvedValueOnce(record as never);
    const result = await verifyOtp("+905551234567", "123456", "whatsapp_login");
    expect(result).toBe(false);
    expect(record.deleteOne).toHaveBeenCalled();
  });

  it("handles phone_verify purpose correctly", async () => {
    const record = freshRecord({ code: "987654", purpose: "phone_verify" as const });
    vi.mocked(OtpCode.findOne).mockResolvedValueOnce(record as never);
    const result = await verifyOtp("+905551234567", "987654", "phone_verify");
    expect(result).toBe(true);
  });
});
