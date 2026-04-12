import { isDatabaseConnected } from "../../config/db";
import { authResolvers }     from "./auth.resolver";
import { projectResolvers }  from "./project.resolver";
import { signalResolvers }   from "./signal.resolver";
import { platformResolvers } from "./platform.resolver";
import { aiResolvers }       from "./ai.resolver";

export const resolvers = {
  Query: {
    health: () => ({
      status:      "ok",
      timestamp:   new Date().toISOString(),
      dbConnected: isDatabaseConnected(),
    }),
    ...authResolvers.Query,
    ...projectResolvers.Query,
    ...signalResolvers.Query,
    ...platformResolvers.Query,
    ...aiResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...projectResolvers.Mutation,
    ...signalResolvers.Mutation,
    ...platformResolvers.Mutation,
    ...aiResolvers.Mutation,
  },
};
