/**
 * POST   /auth/session  — body { token }  sets the httpOnly session cookie
 * DELETE /auth/session  — clears the cookie
 *
 * Why a separate route: the JWT is minted by GraphQL mutations (loginWithEmail,
 * verifyWhatsappOtp, etc.) and those resolvers return the token in the
 * response body. The client hands that token to this endpoint so we can set
 * an httpOnly cookie that Next.js middleware can read — closing the bypass
 * where `/dashboard` was only gated client-side via localStorage.
 */

import { Router } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export const AUTH_COOKIE_NAME = "yf_auth";

const router: import("express").Router = Router();

function cookieOptions() {
  // Parse JWT expiry into ms. Supports "7d", "24h", "3600s" or raw numbers.
  const raw = env.jwtExpiresIn || "7d";
  let maxAgeMs = 7 * 24 * 60 * 60 * 1000;
  const match = /^(\d+)([smhd]?)$/.exec(raw);
  if (match) {
    const n = parseInt(match[1], 10);
    const unit = match[2] || "s";
    const mult = unit === "d" ? 86400_000 : unit === "h" ? 3600_000 : unit === "m" ? 60_000 : 1000;
    maxAgeMs = n * mult;
  }
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure:   env.nodeEnv === "production",
    path:     "/",
    maxAge:   maxAgeMs,
  };
}

router.post("/session", (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token : "";
  if (!token) return res.status(400).json({ error: "token is required" });

  try {
    const payload = jwt.verify(token, env.jwtSecret) as { userId?: string };
    if (!payload?.userId) {
      return res.status(401).json({ error: "Invalid token" });
    }
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  res.cookie(AUTH_COOKIE_NAME, token, cookieOptions());
  return res.json({ ok: true });
});

router.delete("/session", (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
  return res.json({ ok: true });
});

export default router;
