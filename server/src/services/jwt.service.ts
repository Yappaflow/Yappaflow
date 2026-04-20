import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface JwtPayload {
  userId: string;
  email?: string;
  phone?: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    algorithm: "HS256",
    expiresIn: env.jwtExpiresIn,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret, {
    algorithms: ["HS256"],
  }) as JwtPayload;
}

// ── MFA challenge tokens ───────────────────────────────────────────────
//
// When a user with MFA enabled submits their password successfully, we
// can't hand them a full session JWT yet — they still need to prove
// possession of their second factor. Instead we issue a short-lived
// "mfa-pending" token that the client echoes back to `loginWithMfa`
// along with the TOTP code. The server verifies the token and the code
// together, then swaps them for a real session JWT.
//
// Kept separate from the normal JWT so that a stolen challenge token
// can't be mistaken for a full session: `purpose: "mfa"` is required,
// and the expiry is minutes-not-days.

export interface MfaChallengePayload {
  userId:  string;
  purpose: "mfa";
}

const MFA_CHALLENGE_EXPIRES_IN = "5m";

export function signMfaChallengeToken(userId: string): string {
  const payload: MfaChallengePayload = { userId, purpose: "mfa" };
  return jwt.sign(payload, env.jwtSecret, {
    algorithm: "HS256",
    expiresIn: MFA_CHALLENGE_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyMfaChallengeToken(token: string): MfaChallengePayload {
  const decoded = jwt.verify(token, env.jwtSecret, {
    algorithms: ["HS256"],
  }) as MfaChallengePayload;
  if (decoded.purpose !== "mfa") {
    throw new Error("Invalid MFA challenge token");
  }
  return decoded;
}
