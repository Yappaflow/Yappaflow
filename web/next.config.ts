import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Proxy API calls through Next.js so the app works via a single ngrok tunnel.
  // When accessed from a phone via ngrok, the browser can't reach localhost:4000
  // directly, so Next.js proxies /api/* → localhost:4000/*
  async rewrites() {
    const apiUrl = process.env.API_URL || "http://localhost:4000";
    return [
      // /api/* prefix (used by frontend)
      { source: "/api/graphql",     destination: `${apiUrl}/graphql` },
      { source: "/api/events",      destination: `${apiUrl}/events` },
      { source: "/api/webhook",     destination: `${apiUrl}/webhook` },
      { source: "/api/webhook/:p*", destination: `${apiUrl}/webhook/:p*` },
      { source: "/api/health",      destination: `${apiUrl}/health` },
      { source: "/api/auth/:p*",    destination: `${apiUrl}/auth/:p*` },
      // Direct paths (used by external webhooks — Twilio, Meta)
      { source: "/webhook",         destination: `${apiUrl}/webhook` },
      { source: "/webhook/:p*",     destination: `${apiUrl}/webhook/:p*` },
      { source: "/health",          destination: `${apiUrl}/health` },
    ];
  },
};

export default withNextIntl(nextConfig);
