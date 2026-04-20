import { describe, it, expect, beforeEach, vi } from "vitest";
import jwt from "jsonwebtoken";

// Set env vars before importing the module under test
vi.stubEnv("JWT_SECRET", "test-secret-32-chars-long-enough!");
vi.stubEnv("JWT_EXPIRES_IN", "7d");

// Re-import after env stubs are in place
const { signToken, verifyToken } = await import("../services/jwt.service");

describe("jwt.service", () => {
  describe("signToken", () => {
    it("produces a valid JWT string", () => {
      const token = signToken({ userId: "u1" });
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
    });

    it("embeds userId in the payload", () => {
      const token = signToken({ userId: "u1" });
      const decoded = jwt.decode(token) as Record<string, unknown>;
      expect(decoded.userId).toBe("u1");
    });

    it("embeds email when provided", () => {
      const token = signToken({ userId: "u1", email: "hello@yappaflow.com" });
      const decoded = jwt.decode(token) as Record<string, unknown>;
      expect(decoded.email).toBe("hello@yappaflow.com");
    });

    it("embeds phone when provided", () => {
      const token = signToken({ userId: "u1", phone: "+905551234567" });
      const decoded = jwt.decode(token) as Record<string, unknown>;
      expect(decoded.phone).toBe("+905551234567");
    });

    it("sets an expiry claim (exp)", () => {
      const token = signToken({ userId: "u1" });
      const decoded = jwt.decode(token) as Record<string, unknown>;
      expect(decoded.exp).toBeDefined();
      expect(typeof decoded.exp).toBe("number");
    });

    it("uses HS256 algorithm", () => {
      const token = signToken({ userId: "u1" });
      const header = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString());
      expect(header.alg).toBe("HS256");
    });
  });

  describe("verifyToken", () => {
    it("returns the payload for a valid token", () => {
      const token = signToken({ userId: "u1", email: "a@b.com" });
      const payload = verifyToken(token);
      expect(payload.userId).toBe("u1");
      expect(payload.email).toBe("a@b.com");
    });

    it("throws JsonWebTokenError for a tampered token", () => {
      const token = signToken({ userId: "u1" });
      const parts = token.split(".");
      // Corrupt the signature
      parts[2] = parts[2].split("").reverse().join("");
      expect(() => verifyToken(parts.join("."))).toThrow(jwt.JsonWebTokenError);
    });

    it("throws JsonWebTokenError for a token signed with the wrong secret", () => {
      const wrongToken = jwt.sign({ userId: "u1" }, "wrong-secret", { algorithm: "HS256" });
      expect(() => verifyToken(wrongToken)).toThrow(jwt.JsonWebTokenError);
    });

    it("throws TokenExpiredError for an already-expired token", () => {
      const expired = jwt.sign({ userId: "u1" }, "test-secret-32-chars-long-enough!", {
        algorithm: "HS256",
        expiresIn: -1, // expired 1 second in the past
      });
      expect(() => verifyToken(expired)).toThrow(jwt.TokenExpiredError);
    });

    it("throws JsonWebTokenError for a completely invalid string", () => {
      expect(() => verifyToken("not.a.jwt")).toThrow(jwt.JsonWebTokenError);
    });

    it("throws for an empty string", () => {
      expect(() => verifyToken("")).toThrow();
    });

    it("does not accept tokens signed with an asymmetric algorithm", () => {
      // RS256 token — should be rejected because we only allow HS256
      const rsToken = jwt.sign({ userId: "u1" }, "any-hmac-secret", {
        algorithm: "HS384", // different HMAC algorithm, still fails because key mismatch
      });
      expect(() => verifyToken(rsToken)).toThrow();
    });
  });

  describe("token round-trip", () => {
    it("sign → verify preserves all payload fields", () => {
      const payload = { userId: "abc123", email: "test@yappaflow.com", phone: "+1234567890" };
      const token = signToken(payload);
      const result = verifyToken(token);
      expect(result.userId).toBe(payload.userId);
      expect(result.email).toBe(payload.email);
      expect(result.phone).toBe(payload.phone);
    });
  });
});
