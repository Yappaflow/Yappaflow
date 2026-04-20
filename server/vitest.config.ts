import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/services/jwt.service.ts", "src/middleware/auth.ts", "src/services/otp.service.ts", "src/graphql/resolvers/auth.resolver.ts"],
    },
  },
});
