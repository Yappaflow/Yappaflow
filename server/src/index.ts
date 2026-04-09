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

async function main() {
  const app = express();

  app.use(cookieParser());

  await connectDatabase();

  app.use("/auth", cors({ origin: env.frontendUrl, credentials: true }), express.json(), instagramRouter);

  const apolloServer = createApolloServer();
  await apolloServer.start();

  // Apollo Server v4 with Express 4/5 — cors + json must be inline per route
  app.use(
    "/graphql",
    cors({ origin: env.frontendUrl, credentials: true }),
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
