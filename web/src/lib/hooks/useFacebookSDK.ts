"use client";

import { useEffect, useState, useRef } from "react";

// ── Global type declarations for Meta Facebook SDK ────────────────────────────

interface FBLoginResponse {
  status?: string;
  authResponse?: {
    code?: string;
    accessToken?: string;
    userID?: string;
    expiresIn?: number;
  };
}

interface FBLoginOptions {
  config_id: string;
  response_type: string;
  override_default_response_type: boolean;
  extras?: { setup?: Record<string, unknown>; featureType?: string; sessionInfoVersion?: number };
}

declare global {
  interface Window {
    FB?: {
      init: (params: {
        appId: string;
        cookie: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: FBLoginResponse) => void,
        options: FBLoginOptions
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseFacebookSDKResult {
  ready: boolean;
  error: string | null;
}

/**
 * Lazily loads the Facebook JavaScript SDK and returns readiness state.
 * Idempotent — safe to call in multiple components.
 */
export function useFacebookSDK(appId: string | undefined): UseFacebookSDKResult {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loading = useRef(false);

  useEffect(() => {
    if (!appId) {
      setError("META_APP_ID not configured");
      return;
    }

    // Already loaded — skip
    if (window.FB) {
      setReady(true);
      return;
    }

    // Another instance is loading — wait
    if (loading.current) return;
    loading.current = true;

    window.fbAsyncInit = () => {
      window.FB!.init({
        appId,
        cookie: true,
        xfbml: false,
        version: "v21.0",
      });
      setReady(true);
    };

    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => {
      setError("Failed to load Facebook SDK");
      loading.current = false;
    };

    document.body.appendChild(script);
  }, [appId]);

  return { ready, error };
}
