import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  async rewrites() {
    // API_URL is the server-side env used by rewrites. On Vercel we usually
    // only set NEXT_PUBLIC_API_URL (so client-side fetches know where the
    // backend lives) — fall back to it here so a single env var drives both.
    const apiUrl =
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:4000";
    return [
      { source: "/api/graphql",     destination: `${apiUrl}/graphql` },
      { source: "/api/events",      destination: `${apiUrl}/events` },
      { source: "/api/webhook",     destination: `${apiUrl}/webhook` },
      { source: "/api/webhook/:p*", destination: `${apiUrl}/webhook/:p*` },
      { source: "/api/health",      destination: `${apiUrl}/health` },
      { source: "/api/auth/:p*",    destination: `${apiUrl}/auth/:p*` },
      { source: "/webhook",         destination: `${apiUrl}/webhook` },
      { source: "/webhook/:p*",     destination: `${apiUrl}/webhook/:p*` },
      { source: "/health",          destination: `${apiUrl}/health` },
    ];
  },
};

export default withNextIntl(nextConfig);
