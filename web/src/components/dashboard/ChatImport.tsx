"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, MessageCircle, Instagram, Send, X, Check, Loader2,
  Shield, AlertCircle, User, Users,
} from "lucide-react";
import {
  uploadChatFile, previewChatFile,
  type ChatImportResult, type ChatPreview,
} from "@/lib/dashboard-api";

const ACCEPTED_TYPES = ".txt,.json,.csv";

interface Props {
  onImportComplete?: (result: ChatImportResult) => void;
}

export default function ChatImport({ onImportComplete }: Props) {
  const t = useTranslations("chatImport");

  // Platform info with translated labels & how-tos. The `color` stays as a
  // brand hex since it's visual, not copy.
  const PLATFORM_INFO: Record<string, { icon: React.ReactNode; label: string; color: string; howTo: string }> = {
    whatsapp: {
      icon: <MessageCircle size={16} />,
      label: t("whatsapp"),
      color: "#25D366",
      howTo: t("whatsappHow"),
    },
    instagram: {
      icon: <Instagram size={16} />,
      label: t("instagram"),
      color: "#E1306C",
      howTo: t("instagramHow"),
    },
    telegram: {
      icon: <Send size={16} />,
      label: t("telegram"),
      color: "#0088CC",
      howTo: t("telegramHow"),
    },
    csv: {
      icon: <FileText size={16} />,
      label: t("csv"),
      color: "#737373",
      howTo: t("csvHow"),
    },
  };

  const [file, setFile]           = useState<File | null>(null);
  const [preview, setPreview]     = useState<ChatPreview | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null); // null = not chosen yet; "" = "none" (group view)
  const [previewing, setPreviewing] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [result, setResult]       = useState<ChatImportResult | null>(null);
  const [dragOver, setDragOver]   = useState(false);
  const inputRef                  = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setError("");
    setResult(null);
    setPreview(null);
    setOwnerName(null);
    setPreviewing(true);
    try {
      const p = await previewChatFile(f);
      setPreview(p);
      // Auto-default for 1-participant files (nothing to pick)
      if (p.participants.length <= 1) setOwnerName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorRead"));
    } finally {
      setPreviewing(false);
    }
  }, [t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleSubmit = async () => {
    if (!file || ownerName === null) return;
    setLoading(true);
    setError("");
    try {
      const res = await uploadChatFile(file, ownerName || undefined);
      setResult(res);
      onImportComplete?.(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorImport"));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setOwnerName(null);
    setError("");
    setResult(null);
  };

  // ── Success state ──
  if (result) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/[0.05] bg-[#0c0c0f] p-6">
        <div className="flex flex-col items-center text-center py-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20 mb-4">
            <Check size={28} className="text-green-400" />
          </div>
          <h3 className="text-[15px] font-bold text-white">{t("completeTitle")}</h3>
          <p className="mt-2 text-[13px] text-white/40">
            {t("completeSummary", { count: result.messagesCreated, participants: result.participants.length })}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{ background: `${PLATFORM_INFO[result.platform]?.color ?? "#737373"}15`, color: PLATFORM_INFO[result.platform]?.color ?? "#737373" }}>
              {PLATFORM_INFO[result.platform]?.icon}
              {PLATFORM_INFO[result.platform]?.label ?? result.platform}
            </span>
            {result.encrypted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                <Shield size={10} /> {t("encrypted")}
              </span>
            )}
          </div>
          {result.participants.length > 0 && (
            <div className="mt-4 w-full text-left">
              <p className="text-[10px] font-semibold text-white/20 uppercase tracking-wide mb-1.5">{t("contactsImported")}</p>
              <div className="flex flex-wrap gap-1.5">
                {result.participants.slice(0, 10).map((p) => (
                  <span key={p} className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/40">{p}</span>
                ))}
                {result.participants.length > 10 && (
                  <span className="text-[11px] text-white/20">{t("morePlus", { n: result.participants.length - 10 })}</span>
                )}
              </div>
            </div>
          )}
          <button onClick={reset}
            className="mt-5 rounded-lg bg-white/[0.05] px-4 py-2 text-[12px] font-medium text-white/50 hover:bg-white/[0.08] transition-colors">
            {t("importAnother")}
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Upload state ──
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-[#0c0c0f] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-bold text-white">{t("title")}</h3>
        <div className="flex items-center gap-1 text-[10px] text-emerald-400/60">
          <Shield size={10} />
          <span>{t("encryptionBadge")}</span>
        </div>
      </div>
      <p className="text-[12px] text-white/30 mb-5 leading-relaxed">
        {t("description")}
      </p>

      {/* Platform quick-guide */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        {Object.entries(PLATFORM_INFO).map(([key, info]) => (
          <div key={key} className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <span style={{ color: info.color }}>{info.icon}</span>
              <span className="text-[11px] font-semibold text-white/60">{info.label}</span>
            </div>
            <p className="text-[10px] text-white/20 leading-snug">{info.howTo}</p>
          </div>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
          dragOver
            ? "border-[#FF6B35]/40 bg-[#FF6B35]/5"
            : file
              ? "border-green-500/20 bg-green-500/5"
              : "border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.02]"
        }`}
      >
        <input ref={inputRef} type="file" accept={ACCEPTED_TYPES} className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

        <AnimatePresence mode="wait">
          {file ? (
            <motion.div key="file" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <FileText size={18} className="text-green-400" />
              </div>
              <div className="text-left">
                <p className="text-[13px] font-medium text-white/80">{file.name}</p>
                <p className="text-[11px] text-white/30">{t("kbSize", { kb: (file.size / 1024).toFixed(1) })}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); reset(); }}
                className="ml-2 text-white/20 hover:text-white/50">
                <X size={14} />
              </button>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
              <Upload size={24} className="mx-auto text-white/15 mb-2" />
              <p className="text-[13px] text-white/40">
                {t("dropzoneTitle")}
              </p>
              <p className="text-[10px] text-white/15 mt-1">
                {t("dropzoneSupports")}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Preview loading */}
      {previewing && (
        <div className="mt-4 flex items-center gap-2 text-[12px] text-white/40">
          <Loader2 size={12} className="animate-spin" /> {t("readingFile")}
        </div>
      )}

      {/* Participant picker — appears once preview is ready and has 2+ participants */}
      {preview && preview.participants.length >= 2 && !result && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
          <label className="text-[11px] font-semibold text-white/30 uppercase tracking-wide mb-2 block">
            {t("whichSideIsYou")}
          </label>
          <div className="space-y-1.5">
            {preview.participants.map((p) => {
              const active = ownerName === p.name;
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setOwnerName(p.name)}
                  className={`w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-all ${
                    active
                      ? "border-[#FF6B35]/40 bg-[#FF6B35]/10"
                      : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      active ? "bg-[#FF6B35]/20 text-[#FF6B35]" : "bg-white/[0.05] text-white/40"
                    }`}>
                      <User size={13} />
                    </div>
                    <div>
                      <p className={`text-[13px] font-medium ${active ? "text-white" : "text-white/70"}`}>{p.name}</p>
                      <p className="text-[10px] text-white/25">{t("messageCount", { n: p.messageCount })}</p>
                    </div>
                  </div>
                  {active && <Check size={14} className="text-[#FF6B35]" />}
                </button>
              );
            })}
            {/* Group-view option — import without marking any side as "you" */}
            <button
              type="button"
              onClick={() => setOwnerName("")}
              className={`w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-all ${
                ownerName === ""
                  ? "border-white/20 bg-white/[0.06]"
                  : "border-white/[0.04] bg-transparent hover:bg-white/[0.02]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full ${
                  ownerName === "" ? "bg-white/10 text-white/70" : "bg-white/[0.03] text-white/25"
                }`}>
                  <Users size={13} />
                </div>
                <div>
                  <p className={`text-[13px] font-medium ${ownerName === "" ? "text-white" : "text-white/50"}`}>{t("notInChat")}</p>
                  <p className="text-[10px] text-white/25">{t("notInChatHint")}</p>
                </div>
              </div>
              {ownerName === "" && <Check size={14} className="text-white/70" />}
            </button>
          </div>
          <p className="mt-2 text-[10px] text-white/20">
            {t("outboundNote")}
          </p>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/5 border border-red-500/10 px-3 py-2.5">
          <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-[12px] text-red-400/80">{error}</p>
        </div>
      )}

      {/* Submit */}
      {file && !previewing && (
        <button
          onClick={handleSubmit}
          disabled={loading || ownerName === null}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-[#FF6B35] py-3 text-[13px] font-semibold text-white hover:bg-[#FF6B35]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <><Loader2 size={14} className="animate-spin" /> {t("importing")}</>
          ) : ownerName === null && preview && preview.participants.length >= 2 ? (
            <>{t("pickSideHint")}</>
          ) : (
            <><Upload size={14} /> {t("importMessages")}</>
          )}
        </button>
      )}
    </div>
  );
}
