"use client";

import { useEffect, useRef, useCallback } from "react";

let _apiBase: string | null = null;
function getApiBase(): string {
  if (_apiBase !== null) return _apiBase;
  const direct = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  if (typeof window === "undefined") return direct;
  const host = window.location.hostname;
  _apiBase = (host === "localhost" || host === "127.0.0.1") ? direct : "/api";
  return _apiBase;
}

export interface RealtimeSignalEvent {
  signalId:   string;
  platform:   "whatsapp" | "instagram";
  senderName: string;
  sender:     string;
  text:       string;
  timestamp:  string;
  isNew:      boolean;
}

interface Options {
  onMessage: (event: RealtimeSignalEvent) => void;
  onConnected?: () => void;
}

export function useRealtimeSignals({ onMessage, onConnected }: Options) {
  const esRef     = useRef<EventSource | null>(null);
  const retryRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted   = useRef(true);

  const connect = useCallback(() => {
    const token = localStorage.getItem("yappaflow_token");
    if (!token) return;

    const es = new EventSource(`${getApiBase()}/events?token=${encodeURIComponent(token)}`);
    esRef.current = es;

    es.addEventListener("connected", () => {
      onConnected?.();
    });

    es.addEventListener("signal:message", (e) => {
      try {
        const data = JSON.parse(e.data) as RealtimeSignalEvent;
        onMessage(data);
      } catch { /* malformed */ }
    });

    es.onerror = () => {
      es.close();
      if (!mounted.current) return;
      // Reconnect after 5 s
      retryRef.current = setTimeout(connect, 5_000);
    };
  }, [onMessage, onConnected]);

  useEffect(() => {
    mounted.current = true;
    connect();
    return () => {
      mounted.current = false;
      esRef.current?.close();
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [connect]);
}
