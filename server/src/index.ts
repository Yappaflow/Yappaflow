import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { expressMiddleware } from "@as-integrations/express5";
import { createApolloServer } from "./graphql";
import { connectDatabase } from "./config/db";
import { env } from "./config/env";
import { log } from "./utils/logger";
import { buildAuthContext } from "./middleware/auth";
import { isMockMode } from "./ai/client";
import instagramRouter from "./routes/instagram.route";
import webhooksRouter  from "./routes/webhooks.route";
import sseRouter       from "./routes/sse.route";
import aiStreamRouter  from "./routes/ai-stream.route";
import aiDebugRouter   from "./routes/ai-debug.route";
import chatImportRouter from "./routes/chat-import.route";
import deployRouter      from "./routes/deploy.route";
import authSessionRouter from "./routes/auth-session.route";

// Accept requests from any localhost port in dev, or the configured frontend URL in prod
const allowedOrigins = [
  env.frontendUrl,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "https://yappaflow.com",
  "https://www.yappaflow.com",
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // No Origin header → not a browser cross-origin request (mobile apps, curl, server-to-server).
    // In dev: set CORS headers (Postman/testing). In prod: allow through but skip CORS headers.
    if (!origin) return callback(null, env.nodeEnv !== "production");
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow ngrok tunnels (*.ngrok-free.dev, *.ngrok.io) in dev
    if (env.nodeEnv !== "production" && origin && (origin.includes(".ngrok-free.dev") || origin.includes(".ngrok.io"))) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
};

async function main() {
  const app = express();

  // ── Security hardening ─────────────────────────────────────────────────────
  app.use(helmet({ contentSecurityPolicy: false })); // CSP off for GraphQL playground
  app.use(cookieParser());

  // Rate limiters
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,                  // 100 requests per window per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests — please try again later" },
  });
  const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,                    // 20 file uploads per 15 min
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many uploads — please try again later" },
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,                    // 30 auth attempts per 15 min
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts — please try again later" },
  });
  const deployLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1200,                  // generous — the project-state endpoint is polled during builds
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many deploy requests — please try again later" },
  });

  // Warn on insecure defaults
  if (env.jwtSecret === "dev-secret-change-in-production" || env.jwtSecret === "your-super-secret-jwt-key-change-this") {
    log("\n⚠️  WARNING: JWT_SECRET is a default placeholder — set a random 256-bit key in .env for production!");
    log("   Generate one: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"\n");
  }
  if (!env.encryptionMasterKey) {
    log("⚠️  WARNING: ENCRYPTION_MASTER_KEY is not set — chat messages will be stored in PLAINTEXT.");
    log("   Generate one: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"\n");
  }

  await connectDatabase();

  app.use("/auth",    cors(corsOptions), authLimiter, express.json(), instagramRouter);
  app.use("/auth",    cors(corsOptions), authLimiter, express.json(), authSessionRouter);
  app.use("/webhook", express.json(), webhooksRouter); // no CORS — server-to-server from Meta; no rate limit — Meta sends bursts
  app.use("/events",  cors(corsOptions), sseRouter);
  app.use("/ai",      cors(corsOptions), apiLimiter, express.json(), aiStreamRouter);
  app.use("/ai/debug", cors(corsOptions), express.json(), aiDebugRouter);
  app.use("/import",   cors(corsOptions), uploadLimiter, chatImportRouter); // multer handles its own body parsing
  app.use("/deploy",   cors(corsOptions), deployLimiter, express.json(), deployRouter);

  const apolloServer = createApolloServer();
  await apolloServer.start();

  // Apollo Server v4 with Express 4/5 — cors + json must be inline per route
  app.use(
    "/graphql",
    cors(corsOptions),
    express.json(),
    expressMiddleware(apolloServer, { context: buildAuthContext }) as unknown as express.RequestHandler
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.listen(env.port, () => {
    const base = `http://localhost:${env.port}`;
    log(`\n🚀 Server running at ${base}`);
    log(`   GraphQL        → ${base}/graphql`);
    log(`   Instagram OAuth→ ${base}/auth/instagram/authorize`);
    log(`\n📡 Webhook endpoints:`);
    log(`   Meta Cloud API → POST ${base}/webhook`);
    log(`      Verify token: ${env.metaWebhookVerifyToken}`);
    log(`      Register at: https://developers.facebook.com/apps → Webhooks`);
    log(`   Twilio WA      → POST ${base}/webhook/twilio`);
    log(`      Register at: https://console.twilio.com → Messaging → WhatsApp → Sandbox Settings`);
    log(`      "When a message comes in" → <your-ngrok-url>/webhook/twilio`);
    log(`   Debug (dev)    → POST ${base}/webhook/debug`);
    log(`      curl -X POST ${base}/webhook/debug \\`);
    log(`           -H "Content-Type: application/json" \\`);
    log(`           -d '{"phone":"+905551234567","name":"Test","message":"Hello"}'`);
    log(`\n🤖 AI Engine:`);
    if (isMockMode()) {
      log(`   Mode: MOCK (no API key — using sample data)`);
      log(`   Set ANTHROPIC_API_KEY in .env for real AI responses`);
    } else {
      log(`   Mode: LIVE (${env.anthropicModel})`);
    }
    log(`   Stream     → GET ${base}/ai/stream/:sessionId`);
    log(`\n🧪 AI Debug (dev only — no auth needed):`);
    log(`   Test analyze → curl -X POST ${base}/ai/debug/test -H "Content-Type: application/json" -d '{"scenario":"fashion-ecommerce","mode":"analyze"}'`);
    log(`   Test full    → curl -X POST ${base}/ai/debug/test -H "Content-Type: application/json" -d '{"scenario":"tech-startup","mode":"full"}'`);
    log(`   Sessions    → GET ${base}/ai/debug/sessions`);
    log(`   Cleanup     → DELETE ${base}/ai/debug/cleanup`);
    log(`   Scenarios: fashion-ecommerce, restaurant, tech-startup`);
    log(`\n💡 For local testing, expose this server with:`);
    log(`   npx ngrok http ${env.port}`);
    log(`   Then use the ngrok URL for webhook registration.\n`);
  });
}

main().catch(console.error);
