"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { getSignals, type Signal } from "@/lib/dashboard-api";

interface Props {
  selectedId: string | null;
  onSelect:   (id: string) => void;
}

// Platform badges are proper nouns — same in every locale.
const PLATFORM_BADGE: Record<string, string> = {
  whatsapp:  "WhatsApp",
  instagram: "Instagram",
  telegram:  "Telegram",
  csv:       "CSV",
  other:     "Other",
};

export function SignalPicker({ selectedId, onSelect }: Props) {
  const t = useTranslations("deploy");
  const [signals, setSignals] = useState<Signal[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSignals(false)
      .then((list) => {
        if (!cancelled) setSignals(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "unknown");
      });
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-[13px] text-red-300">
        {t("signalPickerLoadError", { error })}
      </div>
    );
  }

  if (!signals) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-[#111114] p-6 text-[13px] text-white/40">
        <Loader2 size={14} className="animate-spin" />
        {t("signalPickerLoading")}
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.05] bg-[#111114] p-6 text-center">
        <MessageCircle size={22} className="mx-auto mb-2 text-white/20" />
        <p className="text-[13px] text-white/60">{t("signalPickerEmptyTitle")}</p>
        <p className="mt-1 text-[11px] text-white/30">{t("signalPickerEmptyDesc")}</p>
      </div>
    );
  }

  return (
    <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
      {signals.map((s) => {
        const active = selectedId === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={[
              "w-full rounded-xl border p-4 text-left transition-all",
              active
                ? "border-[#FF6B35] bg-[#FF6B35]/10"
                : "border-white/[0.05] bg-[#111114] hover:border-white/[0.1] hover:bg-white/[0.03]",
            ].join(" ")}
          >
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-white">{s.senderName}</p>
              <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/40">
                {PLATFORM_BADGE[s.platform] || s.platform}
              </span>
            </div>
            <p className="mt-1 line-clamp-1 text-[12px] text-white/50">{s.preview || t("signalPickerNoPreview")}</p>
            <p className="mt-2 text-[10px] text-white/25">
              {new Date(s.createdAt).toLocaleDateString()} • {s.status}
            </p>
          </button>
        );
      })}
    </div>
  );
}
