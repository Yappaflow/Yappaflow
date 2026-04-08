import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { expressMiddleware } from "@apollo/server/express4";
import { createApolloServer } from "./graphql";
import { connectDatabase } from "./config/db";
import { env } from "./config/env";
import { log } from "./utils/logger";
import { buildAuthContext } from "./middleware/auth";
import instagramRouter from "./routes/instagram.route";

async function main() {
  const app = express();

  app.use(cors({ origin: env.frontendUrl, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  await connectDatabase();

  // Instagram OAuth routes (REST)
  app.use("/auth", instagramRouter);

  // Apollo GraphQL
  const apolloServer = createApolloServer();
  await apolloServer.start();

  app.use(
    "/graphql",
    expressMiddleware(apolloServer, {
      context: buildAuthContext,
    })
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
