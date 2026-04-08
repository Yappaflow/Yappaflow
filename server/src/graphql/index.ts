import { ApolloServer } from "@apollo/server";
import { typeDefs } from "./schema";
import { resolvers } from "./resolvers";

export function createApolloServer() {
  return new ApolloServer({
    typeDefs,
    resolvers,
  });
}
