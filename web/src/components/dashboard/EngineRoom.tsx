"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, Instagram, Send, X, Loader2, Lock, ChevronRight, Zap,
} from "lucide-react";
import type { DashboardView } from "./DashboardShell";
import { getChatMessages, sendMessage, getSignals, type ChatMessage, type Signal } from "@/lib/dashboard-api";
import { useRealtimeSignals, type RealtimeSignalEvent } from "@/lib/hooks/useRealtimeSignals";

interface Props {
  setView:  (v: DashboardView) => void;
  signalId: string | null;
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── No signal selected ────────────────────────────────────────────────────────
function EmptyState({ setView }: { setView: (v: DashboardView) => void }) {
  const t = useTranslations("engineRoom");
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-8 bg-[#0A0A0A]">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#111114] border border-white/[0.05]">
        <MessageCircle size={22} className="text-white/20" />
      </div>
      <div>
        <p className="text-[15px] font-bold text-white">{t("emptyTitle")}</p>
        <p className="mt-1 text-[13px] text-white/30">{t("emptyDesc")}</p>
      </div>
      <button onClick={() => setView("command")}
        className="rounded-xl border border-white/[0.05] bg-[#111114] px-5 py-2 text-[13px] font-semibold text-white/30 hover:bg-white/[0.04]">
        {t("backToDashboard")}
      </button>
    </div>
  );
}

// ── Consent notice ────────────────────────────────────────────────────────────
function ConsentNotice() {
  const t = useTranslations("engineRoom");
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 mx-4 mt-3">
      <Lock size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />
      <p className="text-[11px] text-blue-300 leading-relaxed">
        <strong>{t("consentLeader")}</strong> {t("consentBody")}{" "}
        <strong>{t("consentSettingsLink")}</strong>.
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function EngineRoom({ setView, signalId }: Props) {
  const t = useTranslations("engineRoom");
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
    getSignals()
      .then((signals) => {
        const found = signals.find((s) => s.id === signalId);
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
      senderName:  t("agency"),
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
      setSendErr(e instanceof Error ? e.message : t("failedToSend"));
      // Remove optimistic on error
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally { setSending(false); inputRef.current?.focus(); }
  };

  if (!signalId) return <EmptyState setView={setView} />;

  const isWA = signal?.platform === "whatsapp";
  const PlatformIcon = isWA ? MessageCircle : Instagram;
  const platformColor = isWA ? "#25D366" : "#E1306C";

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A]">

      {/* Header */}
      <div className="flex items-center justify-between bg-[#0c0c0f] border-b border-white/[0.05] px-6 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: platformColor + "15" }}>
            <PlatformIcon size={17} style={{ color: platformColor }} />
          </div>
          <div>
            <h2 className="text-[15px] font-black leading-none text-white">{signal?.senderName ?? t("loading")}</h2>
            <p className="text-[11px] text-white/20 mt-0.5">{signal?.sender ?? ""}</p>
          </div>
          <span className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ml-1"
            style={{ backgroundColor: platformColor + "10", borderColor: platformColor + "30", color: platformColor }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: platformColor }} />
            {t("live")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setView("deploy")}
            className="flex items-center gap-1.5 rounded-xl bg-[#FF6B35] px-3.5 py-1.5 text-[12px] font-bold text-white hover:opacity-90 transition-opacity">
            <Zap size={12} />
            {t("deploy")}
            <ChevronRight size={12} />
          </button>
          <button onClick={() => setView("command")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.05] bg-[#111114] text-white/30 hover:text-white transition-colors">
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
            <Loader2 size={20} className="animate-spin text-white/20" />
          </div>
        )}

        {serverErr && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <p className="text-[13px] text-white/30">{t("loadError")}</p>
            <button onClick={loadMessages}
              className="rounded-lg border border-white/[0.05] bg-[#111114] px-4 py-1.5 text-[12px] font-semibold text-white/30 hover:bg-white/[0.04]">
              {t("retry")}
            </button>
          </div>
        )}

        {!loading && !serverErr && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
            <p className="text-[13px] text-white/30">{t("emptyMessagesTitle")}</p>
            <p className="text-[11px] text-white/20">
              {t("emptyMessagesDesc", { name: signal?.senderName ?? t("senderFallback") })}
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
                    <p className="text-[10px] font-semibold text-white/20 px-1">{msg.senderName}</p>
                  )}
                  <div className={[
                    "rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed",
                    isOut
                      ? "bg-[#FF6B35] text-white rounded-br-sm"
                      : "bg-[#111114] border border-white/[0.05] text-white rounded-bl-sm",
                  ].join(" ")}>
                    {msg.text}
                  </div>
                  <p className={`text-[10px] text-white/20 px-1 ${isOut ? "text-right" : "text-left"}`}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Reply box */}
      <div className="flex-shrink-0 border-t border-white/[0.05] bg-[#0c0c0f] p-4">
        {sendErr && (
          <p className="mb-2 text-[11px] text-red-500">{sendErr}</p>
        )}
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.04] px-4 py-2">
          <input
            ref={inputRef}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={t("replyPlaceholder", { name: signal?.senderName ?? t("senderFallback") })}
            className="flex-1 bg-transparent text-[13px] text-white placeholder-white/20 outline-none"
          />
          <button onClick={handleSend} disabled={!reply.trim() || sending}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF6B35] text-white disabled:opacity-40 hover:opacity-90 transition-opacity flex-shrink-0">
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-white/15">
          {t("whatsappRequiresToken")}
        </p>
      </div>
    </div>
  );
}
