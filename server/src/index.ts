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
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
};

async function main() {
  const app = express();

  app.use(cookieParser());

  await connectDatabase();

  app.use("/auth", cors(corsOptions), express.json(), instagramRouter);

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
    log(`Server running at http://localhost:${env.port}`);
    log(`GraphQL at http://localhost:${env.port}/graphql`);
    log(`Instagram OAuth at http://localhost:${env.port}/auth/instagram/authorize`);
  });
}

main().catch(console.error);
