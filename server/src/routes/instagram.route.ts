import express, { Request, Response } from "express";
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

const router: express.Router = express.Router();

// Step 1: Redirect to Instagram OAuth
router.get("/instagram/authorize", (_req: Request, res: Response): void => {
  const state = crypto.randomBytes(16).toString("hex");
  const url = getInstagramAuthUrl(state);
  res.redirect(url);
});

// Step 2: Instagram OAuth callback
router.get("/instagram/callback", async (req: Request, res: Response): Promise<void> => {
  const { code, error } = req.query;

  if (error || !code) {
    res.redirect(`${env.frontendUrl}/en/auth?error=instagram_cancelled`);
    return;
  }

  try {
    const accessToken = await exchangeCodeForToken(code as string);
    const profile = await getInstagramProfile(accessToken);

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
    res.redirect(
      `${env.frontendUrl}/en/auth/instagram/success?token=${token}&needsPhone=${!user.phoneVerified}`
    );
  } catch (err) {
    logError("Instagram OAuth error", err);
    res.redirect(`${env.frontendUrl}/en/auth?error=instagram_failed`);
  }
});

export default router;
