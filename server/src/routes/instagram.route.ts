import { Router, Request, Response } from "express";
import crypto from "crypto";
import {
  getInstagramAuthUrl,
  exchangeCodeForToken,
  getInstagramProfile,
} from "../services/instagram.service";
import { User } from "../models/User.model";
import { signToken } from "../services/jwt.service";
import { env } from "../config/env";
import { logError } from "../utils/logger";

const router = Router();

// Step 1: Redirect to Instagram OAuth
router.get("/instagram/authorize", (_req: Request, res: Response) => {
  const state = crypto.randomBytes(16).toString("hex");
  const url = getInstagramAuthUrl(state);
  // In production: store state in session/cookie to prevent CSRF
  res.redirect(url);
});

// Step 2: Instagram OAuth callback
router.get("/instagram/callback", async (req: Request, res: Response) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(
      `${env.frontendUrl}/en/auth?error=instagram_cancelled`
    );
  }

  try {
    const accessToken = await exchangeCodeForToken(code as string);
    const profile = await getInstagramProfile(accessToken);

    // Find or create user
    let user = await User.findOne({ instagramId: profile.id });
    if (!user) {
      user = await User.create({
        instagramId: profile.id,
        instagramAccessToken: accessToken,
        name: profile.name || profile.username,
        avatarUrl: profile.profile_picture_url,
        authProvider: "instagram",
      });
    } else {
      user.instagramAccessToken = accessToken;
      if (profile.profile_picture_url) user.avatarUrl = profile.profile_picture_url;
      await user.save();
    }

    const token = signToken({ userId: user.id });

    // Redirect to frontend with token (frontend stores in httpOnly cookie via API)
    return res.redirect(
      `${env.frontendUrl}/en/auth/instagram/success?token=${token}&needsPhone=${!user.phoneVerified}`
    );
  } catch (err) {
    logError("Instagram OAuth error", err);
    return res.redirect(
      `${env.frontendUrl}/en/auth?error=instagram_failed`
    );
  }
});

export default router;
