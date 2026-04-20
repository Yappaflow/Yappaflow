import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

const SECRET = "test-secret-middleware-32-chars!!";

vi.stubEnv("JWT_SECRET", SECRET);
vi.stubEnv("JWT_EXPIRES_IN", "7d");

const { buildAuthContext } = await import("../middleware/auth");

function makeReq(overrides: {
  authHeader?: string;
  cookieToken?: string;
}): Parameters<typeof buildAuthContext>[0]["req"] {
  const headers: Record<string, string> = {};
  if (overrides.authHeader) {
    headers["authorization"] = overrides.authHeader;
  }

  const cookies: Record<string, string> = {};
  if (overrides.cookieToken) {
    cookies["token"] = overrides.cookieToken;
  }

  return {
    headers,
    cookies,
  } as unknown as Parameters<typeof buildAuthContext>[0]["req"];
}

function makeValidToken(userId: string) {
  return jwt.sign({ userId }, SECRET, { algorithm: "HS256", expiresIn: "1h" });
}

describe("buildAuthContext (auth middleware)", () => {
  describe("no credentials", () => {
    it("returns empty object when no Authorization header and no cookie", async () => {
      const ctx = await buildAuthContext({ req: makeReq({}) } as Parameters<typeof buildAuthContext>[0]);
      expect(ctx).toEqual({});
    });
  });

  describe("Bearer header", () => {
    it("extracts userId from a valid Bearer token", async () => {
      const token = makeValidToken("user-abc");
      const ctx = await buildAuthContext({ req: makeReq({ authHeader: `Bearer ${token}` }) } as Parameters<typeof buildAuthContext>[0]);
      expect(ctx.userId).toBe("user-abc");
    });

    it("returns {} for a malformed Bearer token", async () => {
      const ctx = await buildAuthContext({ req: makeReq({ authHeader: "Bearer not-a-jwt" }) } as Parameters<typeof buildAuthContext>[0]);
      expect(ctx).toEqual({});
    });

    it("returns {} for an expired Bearer token", async () => {
      const expired = jwt.sign({ userId: "u1" }, SECRET, { algorithm: "HS256", expiresIn: -1 });
      const ctx = await buildAuthContext({ req: makeReq({ authHeader: `Bearer ${expired}` }) } as Parameters<typeof buildAuthContext>[0]);
      expect(ctx).toEqual({});
    });

    it("returns {} for a token signed with wrong secret", async () => {
      const bad = jwt.sign({ userId: "u1" }, "wrong-secret", { algorithm: "HS256" });
      const ctx = await buildAuthContext({ req: makeReq({ authHeader: `Bearer ${bad}` }) } as Parameters<typeof buildAuthContext>[0]);
      expect(ctx).toEqual({});
    });

    it("ignores Authorization header that doesn't start with 'Bearer '", async () => {
      const token = makeValidToken("u1");
      const ctx = await buildAuthContext({ req: makeReq({ authHeader: `Token ${token}` }) } as Parameters<typeof buildAuthContext>[0]);
      expect(ctx).toEqual({});
    });
  });

  describe("cookie token", () => {
    it("extracts userId from a valid cookie token", async () => {
      const token = makeValidToken("user-xyz");
      const ctx = await buildAuthContext({ req: makeReq({ cookieToken: token }) } as Parameters<typeof buildAuthContext>[0]);
      expect(ctx.userId).toBe("user-xyz");
    });

    it("returns {} for an invalid cookie token", async () => {
      const ctx = await buildAuthContext({ req: makeReq({ cookieToken: "garbage" }) } as Parameters<typeof buildAuthContext>[0]);
      expect(ctx).toEqual({});
    });

    it("returns {} for an expired cookie token", async () => {
      const expired = jwt.sign({ userId: "u1" }, SECRET, { algorithm: "HS256", expiresIn: -1 });
      const ctx = await buildAuthContext({ req: makeReq({ cookieToken: expired }) } as Parameters<typeof buildAuthContext>[0]);
      expect(ctx).toEqual({});
    });
  });

  describe("header takes precedence over cookie", () => {
    it("uses Bearer header userId when both header and cookie are present", async () => {
      const headerToken = makeValidToken("from-header");
      const cookieToken = makeValidToken("from-cookie");
      const ctx = await buildAuthContext({
        req: makeReq({ authHeader: `Bearer ${headerToken}`, cookieToken }),
      } as Parameters<typeof buildAuthContext>[0]);
      expect(ctx.userId).toBe("from-header");
    });
  });
});
