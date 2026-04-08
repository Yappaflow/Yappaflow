import { Request } from "express";
import { verifyToken } from "../services/jwt.service";

export interface AuthContext {
  userId?: string;
  req: Request;
}

export function buildAuthContext({ req }: { req: Request }): AuthContext {
  // Token can come from Authorization header or cookie
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.token;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : cookieToken;

  if (!token) return { req };

  try {
    const payload = verifyToken(token);
    return { userId: payload.userId, req };
  } catch {
    return { req };
  }
}
