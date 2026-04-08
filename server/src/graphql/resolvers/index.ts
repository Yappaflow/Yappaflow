import { isDatabaseConnected } from "../../config/db";
import { authResolvers } from "./auth.resolver";

export const resolvers = {
  Query: {
    health: () => ({
      status: "ok",
      timestamp: new Date().toISOString(),
      dbConnected: isDatabaseConnected(),
    }),
    ...authResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
  },
};
