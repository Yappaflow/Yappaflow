import type { ExpressContextFunctionArgument } from "@as-integrations/express5";
import { verifyToken } from "../services/jwt.service";

export interface AuthContext {
  userId?: string;
}

export async function buildAuthContext({
  req,
}: ExpressContextFunctionArgument): Promise<AuthContext> {
  const authHeader = req.headers.authorization;
  // cookie-parser attaches cookies to req but typings differ between versions
  const cookieToken = (req as unknown as { cookies?: Record<string, string> })
    .cookies?.token;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : cookieToken;

  if (!token) return {};

  try {
    const payload = verifyToken(token);
    return { userId: payload.userId };
  } catch {
    return {};
  }
}
