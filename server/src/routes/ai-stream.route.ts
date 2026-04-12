import express from "express";
import { verifyToken } from "../services/jwt.service";
import { addSessionSSEClient } from "../services/sse.service";
import { AISession } from "../models/AISession.model";

const router: express.Router = express.Router();

/**
 * GET /ai/stream/:sessionId
 * Session-scoped SSE stream for real-time AI processing events.
 * Auth: Bearer token via Authorization header OR ?token= query param.
 */
router.get("/stream/:sessionId", async (req, res): Promise<void> => {
  // Auth
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string | undefined;
  const raw = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : queryToken;

  if (!raw) { res.status(401).json({ error: "Unauthorized" }); return; }

  let userId: string;
  try {
    userId = verifyToken(raw).userId;
  } catch {
    res.status(401).json({ error: "Invalid token" }); return;
  }

  // Verify session belongs to user
  const session = await AISession.findOne({
    _id: req.params.sessionId,
    agencyId: userId,
  });

  if (!session) {
    res.status(404).json({ error: "AI session not found" }); return;
  }

  const sessionId = req.params.sessionId;

  // SSE headers
  res.setHeader("Content-Type",       "text/event-stream");
  res.setHeader("Cache-Control",      "no-cache");
  res.setHeader("Connection",         "keep-alive");
  res.setHeader("X-Accel-Buffering",  "no");
  res.flushHeaders();

  // Heartbeat
  const heartbeat = setInterval(() => {
    try { res.write(`: heartbeat\n\n`); }
    catch { /* disconnected */ }
  }, 25_000);

  // Send current session state
  res.write(`event: connected\ndata: ${JSON.stringify({
    sessionId,
    phase: session.phase,
    status: session.status,
  })}\n\n`);

  const cleanup = addSessionSSEClient(sessionId, res);

  req.on("close", () => {
    clearInterval(heartbeat);
    cleanup();
  });
});

export default router;
