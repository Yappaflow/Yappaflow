"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Zap,
  Rocket,
  Settings,
  LogOut,
  Radio,
  Search,
  Bell,
  HelpCircle,
  Shield,
  X,
  Layers,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { destroySession } from "@/lib/auth-api";

function ConsentBanner() {
  const t = useTranslations("dashboardShell");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("yappaflow_consent_dismissed");
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem("yappaflow_consent_dismissed", "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="flex items-center gap-3 bg-[#0A0A0A] px-6 py-2.5 text-white"
      >
        <Shield size={13} className="text-[#FF6B35] flex-shrink-0" />
        <p className="flex-1 text-[11px] leading-relaxed">
          <strong>{t("consentLeader")}</strong> {t("consentBody")}{" "}
          <strong>{t("consentSettingsLink")}</strong>.
        </p>
        <button onClick={dismiss} className="flex-shrink-0 text-white/30 hover:text-white transition-colors ml-2">
          <X size={13} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

export type DashboardView = "command" | "engine" | "deploy" | "solutions" | "integrations" | "security";

const NAV_MAIN = [
  { id: "command"      as DashboardView, labelKey: "navDashboard", icon: LayoutDashboard },
  { id: "engine"       as DashboardView, labelKey: "navEngine",    icon: Zap             },
  { id: "deploy"       as DashboardView, labelKey: "navDeploy",    icon: Rocket          },
  { id: "solutions"    as DashboardView, labelKey: "navSolutions", icon: Layers          },
];

// "Security" lives in general nav alongside Settings — the two together
// form the account-admin cluster.
const NAV_GENERAL = [
  { id: "integrations" as DashboardView, labelKey: "navSettings",  icon: Settings        },
  { id: "security"     as DashboardView, labelKey: "navSecurity",  icon: Shield          },
];

interface Props {
  children: (
    view: DashboardView,
    setView: (v: DashboardView) => void,
    signalId: string | null,
    setSignalId: (id: string | null) => void,
  ) => React.ReactNode;
}

export function DashboardShell({ children }: Props) {
  const t = useTranslations("dashboardShell");
  const [view,     setView]     = useState<DashboardView>("command");
  const [signalId, setSignalId] = useState<string | null>(null);
  const router = useRouter();

  const signOut = async () => {
    localStorage.removeItem("yappaflow_token");
    await destroySession();
    router.replace("/auth");
  };

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-white overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="flex w-56 flex-col bg-[#0c0c0f] border-r border-white/[0.05] flex-shrink-0">

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FF6B35]">
            <span className="text-xs font-black text-white tracking-tight">YF</span>
          </div>
          <span className="font-bold text-[15px] tracking-tight">Yappaflow</span>
        </div>

        {/* Nav — Main */}
        <div className="px-3 mt-2">
          <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-white/20">{t("menuLabel")}</p>
          <nav className="flex flex-col gap-0.5">
            {NAV_MAIN.map(({ id, labelKey, icon: Icon }) => {
              const active = view === id;
              return (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={[
                    "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all text-left",
                    active
                      ? "bg-[#FF6B35]/10 text-[#FF6B35]"
                      : "text-white/30 hover:bg-white/[0.04] hover:text-white",
                  ].join(" ")}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-[#FF6B35]" />
                  )}
                  <Icon size={15} className="flex-shrink-0" />
                  <span>{t(labelKey)}</span>
                  {id === "engine" && (
                    <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-[#FF6B35] text-[9px] font-bold text-white">3</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Nav — General */}
        <div className="px-3 mt-5">
          <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-white/20">{t("generalLabel")}</p>
          <nav className="flex flex-col gap-0.5">
            {NAV_GENERAL.map(({ id, labelKey, icon: Icon }) => {
              const active = view === id;
              return (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={[
                    "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all text-left",
                    active
                      ? "bg-[#FF6B35]/10 text-[#FF6B35]"
                      : "text-white/30 hover:bg-white/[0.04] hover:text-white",
                  ].join(" ")}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-[#FF6B35]" />
                  )}
                  <Icon size={15} className="flex-shrink-0" />
                  <span>{t(labelKey)}</span>
                </button>
              );
            })}

            <button
              onClick={signOut}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-white/30 hover:bg-white/[0.04] hover:text-white transition-all text-left"
            >
              <LogOut size={15} />
              <span>{t("navLogout")}</span>
            </button>

            <button className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-white/30 hover:bg-white/[0.04] hover:text-white transition-all text-left">
              <HelpCircle size={15} />
              <span>{t("navHelp")}</span>
            </button>
          </nav>
        </div>

        {/* Mobile app promo */}
        <div className="mx-3 mt-auto mb-4 rounded-xl bg-white/[0.04] p-4 text-white border border-white/[0.05]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF6B35] mb-3">
            <Radio size={14} className="text-white" />
          </div>
          <p className="text-[12px] font-bold leading-tight">{t("mobilePromoTitle")}</p>
          <p className="text-[10px] text-white/30 mt-1">{t("mobilePromoDesc")}</p>
          <button className="mt-3 w-full rounded-lg bg-[#FF6B35] py-1.5 text-[11px] font-bold text-white">
            {t("mobilePromoCta")}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Consent banner */}
        <ConsentBanner />

        {/* Top bar */}
        <header className="flex items-center gap-4 bg-[#0c0c0f] border-b border-white/[0.05] px-6 py-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-white/[0.04] border border-white/[0.05] px-3.5 py-2 max-w-sm">
            <Search size={14} className="text-white/20 flex-shrink-0" />
            <input
              className="flex-1 bg-transparent text-[13px] text-white placeholder-white/20 outline-none"
              placeholder={t("searchPlaceholder")}
            />
            <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-white/20">⌘F</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setView("engine")}
              className="flex items-center gap-2 rounded-xl bg-[#FF6B35] px-4 py-2 text-[13px] font-bold text-white hover:opacity-90 transition-opacity shadow-lg shadow-[#FF6B35]/20"
            >
              <Radio size={13} className="animate-pulse" />
              {t("startLiveMeeting")}
            </button>

            <button className="relative flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/[0.04] transition-colors">
              <Bell size={16} className="text-white/30" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#FF6B35]" />
            </button>

            <div className="flex items-center gap-2.5 pl-2 border-l border-white/[0.05]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6B35]/10 border border-[#FF6B35]/30">
                <span className="text-[12px] font-bold text-[#FF6B35]">A</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-[12px] font-semibold leading-none text-white">Agency</p>
                <p className="text-[10px] text-white/20 mt-0.5">yappaflow.com</p>
              </div>
            </div>
          </div>
        </header>

        {/* View content */}
        <main className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="h-full overflow-y-auto"
            >
              {children(view, setView, signalId, setSignalId)}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
