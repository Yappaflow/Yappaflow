import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { expressMiddleware } from "@as-integrations/express5";
import { createApolloServer } from "./graphql";
import { connectDatabase } from "./config/db";
import { env } from "./config/env";
import { log } from "./utils/logger";
import { buildAuthContext } from "./middleware/auth";
import instagramRouter from "./routes/instagram.route";
import webhooksRouter  from "./routes/webhooks.route";
import sseRouter       from "./routes/sse.route";

// Accept requests from any localhost port in dev, or the configured frontend URL in prod
const allowedOrigins = [
  env.frontendUrl,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
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

  app.use(cookieParser());

  await connectDatabase();

  app.use("/auth",    cors(corsOptions), express.json(), instagramRouter);
  app.use("/webhook", cors(corsOptions), express.json(), webhooksRouter);
  app.use("/events",  cors(corsOptions), sseRouter);

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
    log(`\n💡 For local testing, expose this server with:`);
    log(`   npx ngrok http ${env.port}`);
    log(`   Then use the ngrok URL for webhook registration.\n`);
  });
}

main().catch(console.error);
