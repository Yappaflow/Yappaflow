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
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";

function ConsentBanner() {
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
        <Shield size={13} className="text-[#F97316] flex-shrink-0" />
        <p className="flex-1 text-[11px] leading-relaxed">
          <strong>Your data, your control.</strong> Yappaflow accesses your WhatsApp and Instagram messages
          only with the permissions you granted during login. You can revoke access anytime in{" "}
          <strong>Settings → Platforms</strong>.
        </p>
        <button onClick={dismiss} className="flex-shrink-0 text-[#737373] hover:text-white transition-colors ml-2">
          <X size={13} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

export type DashboardView = "command" | "engine" | "deploy" | "integrations";

const NAV_MAIN = [
  { id: "command"      as DashboardView, label: "Dashboard",    icon: LayoutDashboard },
  { id: "engine"       as DashboardView, label: "Engine Room",  icon: Zap             },
  { id: "deploy"       as DashboardView, label: "Deploy Hub",   icon: Rocket          },
];

const NAV_GENERAL = [
  { id: "integrations" as DashboardView, label: "Settings",    icon: Settings        },
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
  const [view,     setView]     = useState<DashboardView>("command");
  const [signalId, setSignalId] = useState<string | null>(null);
  const router = useRouter();

  const signOut = () => {
    localStorage.removeItem("yappaflow_token");
    router.replace("/auth");
  };

  const VIEW_LABELS: Record<DashboardView, string> = {
    command:      "Dashboard",
    engine:       "Engine Room",
    deploy:       "Deploy Hub",
    integrations: "Settings",
  };

  return (
    <div className="flex h-screen bg-[#F5F5F5] text-[#0A0A0A] overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="flex w-56 flex-col bg-white border-r border-[#EFEFEF] flex-shrink-0">

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F97316]">
            <span className="text-xs font-black text-white tracking-tight">YF</span>
          </div>
          <span className="font-bold text-[15px] tracking-tight">Yappaflow</span>
        </div>

        {/* Nav — Main */}
        <div className="px-3 mt-2">
          <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-[#B5B5B5]">Menu</p>
          <nav className="flex flex-col gap-0.5">
            {NAV_MAIN.map(({ id, label, icon: Icon }) => {
              const active = view === id;
              return (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={[
                    "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all text-left",
                    active
                      ? "bg-[#FFF3EE] text-[#F97316]"
                      : "text-[#737373] hover:bg-[#F8F8F8] hover:text-[#0A0A0A]",
                  ].join(" ")}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-[#F97316]" />
                  )}
                  <Icon size={15} className="flex-shrink-0" />
                  <span>{label}</span>
                  {id === "engine" && (
                    <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-[#F97316] text-[9px] font-bold text-white">3</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Nav — General */}
        <div className="px-3 mt-5">
          <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-[#B5B5B5]">General</p>
          <nav className="flex flex-col gap-0.5">
            {NAV_GENERAL.map(({ id, label, icon: Icon }) => {
              const active = view === id;
              return (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={[
                    "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all text-left",
                    active
                      ? "bg-[#FFF3EE] text-[#F97316]"
                      : "text-[#737373] hover:bg-[#F8F8F8] hover:text-[#0A0A0A]",
                  ].join(" ")}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-[#F97316]" />
                  )}
                  <Icon size={15} className="flex-shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}

            <button
              onClick={signOut}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#737373] hover:bg-[#F8F8F8] hover:text-[#0A0A0A] transition-all text-left"
            >
              <LogOut size={15} />
              <span>Logout</span>
            </button>

            <button className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#737373] hover:bg-[#F8F8F8] hover:text-[#0A0A0A] transition-all text-left">
              <HelpCircle size={15} />
              <span>Help</span>
            </button>
          </nav>
        </div>

        {/* Mobile app promo */}
        <div className="mx-3 mt-auto mb-4 rounded-xl bg-[#0A0A0A] p-4 text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F97316] mb-3">
            <Radio size={14} className="text-white" />
          </div>
          <p className="text-[12px] font-bold leading-tight">Download our Mobile App</p>
          <p className="text-[10px] text-[#737373] mt-1">Get easy in another way</p>
          <button className="mt-3 w-full rounded-lg bg-[#F97316] py-1.5 text-[11px] font-bold text-white">
            Download
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Consent banner */}
        <ConsentBanner />

        {/* Top bar */}
        <header className="flex items-center gap-4 bg-white border-b border-[#EFEFEF] px-6 py-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-[#F5F5F5] border border-[#EFEFEF] px-3.5 py-2 max-w-sm">
            <Search size={14} className="text-[#B5B5B5] flex-shrink-0" />
            <input
              className="flex-1 bg-transparent text-[13px] text-[#0A0A0A] placeholder-[#B5B5B5] outline-none"
              placeholder="Search..."
            />
            <span className="rounded-md bg-[#EFEFEF] px-1.5 py-0.5 text-[10px] font-semibold text-[#B5B5B5]">⌘F</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setView("engine")}
              className="flex items-center gap-2 rounded-xl bg-[#F97316] px-4 py-2 text-[13px] font-bold text-white hover:opacity-90 transition-opacity shadow-sm shadow-orange-200"
            >
              <Radio size={13} className="animate-pulse" />
              Start Live Meeting
            </button>

            <button className="relative flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#F5F5F5] transition-colors">
              <Bell size={16} className="text-[#737373]" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#F97316]" />
            </button>

            <div className="flex items-center gap-2.5 pl-2 border-l border-[#EFEFEF]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF3EE] border border-[#FFD9C4]">
                <span className="text-[12px] font-bold text-[#F97316]">A</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-[12px] font-semibold leading-none">Agency</p>
                <p className="text-[10px] text-[#B5B5B5] mt-0.5">yappaflow.com</p>
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
