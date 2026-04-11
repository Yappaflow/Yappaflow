"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, Instagram, Send, X, Loader2, Lock, ChevronRight, Zap,
} from "lucide-react";
import type { DashboardView } from "./DashboardShell";
import { getChatMessages, sendMessage, type ChatMessage, type Signal } from "@/lib/dashboard-api";
import { useRealtimeSignals, type RealtimeSignalEvent } from "@/lib/hooks/useRealtimeSignals";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Props {
  setView:  (v: DashboardView) => void;
  signalId: string | null;
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── No signal selected ────────────────────────────────────────────────────────
function EmptyState({ setView }: { setView: (v: DashboardView) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-8 bg-[#F5F5F5]">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white border border-[#EFEFEF]">
        <MessageCircle size={22} className="text-[#C0C0C0]" />
      </div>
      <div>
        <p className="text-[15px] font-bold text-[#0A0A0A]">No conversation selected</p>
        <p className="mt-1 text-[13px] text-[#737373]">Click a signal on the dashboard to open its chat thread</p>
      </div>
      <button onClick={() => setView("command")}
        className="rounded-xl border border-[#EFEFEF] bg-white px-5 py-2 text-[13px] font-semibold text-[#737373] hover:bg-[#F8F8F8]">
        ← Back to Dashboard
      </button>
    </div>
  );
}

// ── Consent notice ────────────────────────────────────────────────────────────
function ConsentNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-[#E8F0FF] bg-[#F0F5FF] px-4 py-3 mx-4 mt-3">
      <Lock size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />
      <p className="text-[11px] text-blue-700 leading-relaxed">
        <strong>Data with your permission.</strong> These messages are fetched from your connected
        WhatsApp / Instagram account. You authorized Yappaflow to access them during login.
        You can disconnect at any time in <strong>Settings → Platforms</strong>.
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function EngineRoom({ setView, signalId }: Props) {
  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [signal,    setSignal]    = useState<Signal | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [serverErr, setServerErr] = useState(false);
  const [reply,     setReply]     = useState("");
  const [sending,   setSending]   = useState(false);
  const [sendErr,   setSendErr]   = useState("");
  const chatRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollBottom = useCallback(() => {
    setTimeout(() => chatRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50);
  }, []);

  // Load history
  const loadMessages = useCallback(async () => {
    if (!signalId) return;
    setLoading(true); setServerErr(false);
    try {
      const msgs = await getChatMessages(signalId);
      setMessages(msgs);
      scrollBottom();
    } catch {
      setServerErr(true);
    } finally { setLoading(false); }
  }, [signalId, scrollBottom]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Fetch signal info for header
  useEffect(() => {
    if (!signalId) return;
    const token = localStorage.getItem("yappaflow_token");
    if (!token) return;
    fetch(`${API_URL}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query: `query { signals { id platform senderName sender preview status } }` }),
    })
      .then((r) => r.json())
      .then((json) => {
        const found = (json.data?.signals ?? []).find((s: Signal) => s.id === signalId);
        if (found) setSignal(found);
      })
      .catch(() => null);
  }, [signalId]);

  // Real-time new messages via SSE
  const handleRealtimeMessage = useCallback((evt: RealtimeSignalEvent) => {
    if (evt.signalId !== signalId) return;
    const newMsg: ChatMessage = {
      id:          `rt_${Date.now()}`,
      signalId:    evt.signalId,
      platform:    evt.platform,
      direction:   "inbound",
      senderName:  evt.senderName,
      text:        evt.text,
      messageType: "text",
      timestamp:   evt.timestamp,
    };
    setMessages((prev) => [...prev, newMsg]);
    scrollBottom();
  }, [signalId, scrollBottom]);

  useRealtimeSignals({ onMessage: handleRealtimeMessage });

  // Send reply
  const handleSend = async () => {
    if (!reply.trim() || !signalId || sending) return;
    const text = reply.trim();
    setReply(""); setSendErr(""); setSending(true);
    const optimistic: ChatMessage = {
      id:          `opt_${Date.now()}`,
      signalId,
      platform:    signal?.platform ?? "whatsapp",
      direction:   "outbound",
      senderName:  "Agency",
      text,
      messageType: "text",
      timestamp:   new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    scrollBottom();
    try {
      const sent = await sendMessage(signalId, text);
      // Replace optimistic with real
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? sent : m));
    } catch (e: unknown) {
      setSendErr(e instanceof Error ? e.message : "Failed to send");
      // Remove optimistic on error
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally { setSending(false); inputRef.current?.focus(); }
  };

  if (!signalId) return <EmptyState setView={setView} />;

  const isWA = signal?.platform === "whatsapp";
  const PlatformIcon = isWA ? MessageCircle : Instagram;
  const platformColor = isWA ? "#25D366" : "#E1306C";

  return (
    <div className="flex flex-col h-full bg-[#F5F5F5]">

      {/* Header */}
      <div className="flex items-center justify-between bg-white border-b border-[#EFEFEF] px-6 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: platformColor + "15" }}>
            <PlatformIcon size={17} style={{ color: platformColor }} />
          </div>
          <div>
            <h2 className="text-[15px] font-black leading-none">{signal?.senderName ?? "Loading…"}</h2>
            <p className="text-[11px] text-[#B5B5B5] mt-0.5">{signal?.sender ?? ""}</p>
          </div>
          <span className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ml-1"
            style={{ backgroundColor: platformColor + "10", borderColor: platformColor + "30", color: platformColor }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: platformColor }} />
            Live
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setView("deploy")}
            className="flex items-center gap-1.5 rounded-xl bg-[#F97316] px-3.5 py-1.5 text-[12px] font-bold text-white hover:opacity-90 transition-opacity">
            <Zap size={12} />
            Deploy
            <ChevronRight size={12} />
          </button>
          <button onClick={() => setView("command")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EFEFEF] bg-white text-[#737373] hover:text-[#0A0A0A] transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Consent notice */}
      <ConsentNotice />

      {/* Chat area */}
      <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">

        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-[#B5B5B5]" />
          </div>
        )}

        {serverErr && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <p className="text-[13px] text-[#737373]">Could not load messages — server offline</p>
            <button onClick={loadMessages}
              className="rounded-lg border border-[#EFEFEF] bg-white px-4 py-1.5 text-[12px] font-semibold text-[#737373] hover:bg-[#F8F8F8]">
              Retry
            </button>
          </div>
        )}

        {!loading && !serverErr && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
            <p className="text-[13px] text-[#737373]">No messages yet</p>
            <p className="text-[11px] text-[#B5B5B5]">
              Messages will appear here when {signal?.senderName ?? "the customer"} writes to you
            </p>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => {
            const isOut = msg.direction === "outbound";
            return (
              <motion.div key={msg.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className={`flex ${isOut ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-[72%] space-y-0.5">
                  {!isOut && (
                    <p className="text-[10px] font-semibold text-[#B5B5B5] px-1">{msg.senderName}</p>
                  )}
                  <div className={[
                    "rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed",
                    isOut
                      ? "bg-[#F97316] text-white rounded-br-sm"
                      : "bg-white border border-[#EFEFEF] text-[#0A0A0A] rounded-bl-sm",
                  ].join(" ")}>
                    {msg.text}
                  </div>
                  <p className={`text-[10px] text-[#B5B5B5] px-1 ${isOut ? "text-right" : "text-left"}`}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Reply box */}
      <div className="flex-shrink-0 border-t border-[#EFEFEF] bg-white p-4">
        {sendErr && (
          <p className="mb-2 text-[11px] text-red-500">{sendErr}</p>
        )}
        <div className="flex items-center gap-2 rounded-xl border border-[#EFEFEF] bg-[#F8F8F8] px-4 py-2">
          <input
            ref={inputRef}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={`Reply to ${signal?.senderName ?? "customer"}…`}
            className="flex-1 bg-transparent text-[13px] text-[#0A0A0A] placeholder-[#B5B5B5] outline-none"
          />
          <button onClick={handleSend} disabled={!reply.trim() || sending}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F97316] text-white disabled:opacity-40 hover:opacity-90 transition-opacity flex-shrink-0">
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-[#C0C0C0]">
          Requires WhatsApp Business API token in Settings → Platforms
        </p>
      </div>
    </div>
  );
}
