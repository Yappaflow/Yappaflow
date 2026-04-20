"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  MessageCircle, Instagram, ArrowUpRight, Clock, Rocket, CheckCircle2,
  Radio, Plus, TrendingUp, Pin, PinOff, Trash2, X, Loader2, Zap, BookUser, Upload, Send,
} from "lucide-react";
import ChatImport from "./ChatImport";
import type { DashboardView } from "./DashboardShell";
import {
  getSignals, getProjects, getDashboardStats, getPlatformConnections,
  createSignal, createProject, toggleSignalDashboard, deleteSignal, deleteProject, sendMessage,
  type Signal, type Project, type DashboardStats, type PlatformConnection,
} from "@/lib/dashboard-api";
import { useRealtimeSignals, type RealtimeSignalEvent } from "@/lib/hooks/useRealtimeSignals";

const PHASE_STYLE: Record<string, { labelKey: string; cls: string }> = {
  listening: { labelKey: "phaseListening",  cls: "bg-blue-500/10 text-blue-400"     },
  building:  { labelKey: "phaseBuilding",   cls: "bg-amber-500/10 text-amber-400"   },
  deploying: { labelKey: "phaseDeploying",  cls: "bg-[#FF6B35]/10 text-[#FF6B35]"  },
  live:      { labelKey: "phaseLive",       cls: "bg-green-500/10 text-green-400"   },
};

const PHASE_BAR: Record<string, string> = {
  listening: "bg-blue-400",
  building:  "bg-amber-400",
  deploying: "bg-[#FF6B35]",
  live:      "bg-green-500",
};

const PLATFORM_COLOR: Record<string, string> = {
  shopify:   "#96BF48",
  wordpress: "#21759B",
  webflow:   "#4353FF",
  ikas:      "#F97316",
  custom:    "#737373",
};

// ── Add Signal modal ───────────────────────────────────────────────────────────
function AddSignalModal({ onClose, onAdd }: { onClose: () => void; onAdd: (s: Signal) => void }) {
  const t = useTranslations("commandCenter");
  const [form, setForm] = useState({ platform: "whatsapp", senderName: "", sender: "", preview: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!form.senderName || !form.sender || !form.preview) { setErr(t("addSignalFieldsRequired")); return; }
    setLoading(true);
    try {
      const sig = await createSignal(form);
      onAdd(sig);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl bg-[#0c0c0f] border border-white/[0.05] p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-bold">{t("addSignalTitle")}</h2>
          <button onClick={onClose}><X size={16} className="text-white/30" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-white/30 uppercase tracking-wide">{t("addSignalPlatform")}</label>
            <div className="mt-1.5 flex gap-2">
              {["whatsapp", "instagram"].map((p) => (
                <button key={p} onClick={() => setForm({ ...form, platform: p })}
                  className={`flex-1 rounded-lg border py-2 text-[12px] font-semibold capitalize transition-all ${form.platform === p ? "border-[#FF6B35] bg-[#FF6B35]/10 text-[#FF6B35]" : "border-white/[0.05] text-white/30"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          {[
            { key: "senderName", labelKey: "addSignalClientName",    placeholder: t("addSignalClientNamePh") },
            { key: "sender",     labelKey: "addSignalHandle", placeholder: form.platform === "whatsapp" ? t("addSignalWhatsappPh") : t("addSignalInstagramPh") },
            { key: "preview",    labelKey: "addSignalMessage",        placeholder: t("addSignalMessagePh") },
          ].map(({ key, labelKey, placeholder }) => (
            <div key={key}>
              <label className="text-[11px] font-semibold text-white/30 uppercase tracking-wide">{t(labelKey)}</label>
              <input value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                className="mt-1.5 w-full rounded-lg border border-white/[0.05] bg-white/[0.04] px-3 py-2 text-[13px] text-white placeholder-white/15 outline-none focus:border-[#FF6B35]" />
            </div>
          ))}
          {err && <p className="text-[11px] text-red-500">{err}</p>}
          <button onClick={submit} disabled={loading}
            className="w-full rounded-xl bg-white py-2.5 text-[13px] font-bold text-[#0A0A0A] hover:opacity-80 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {loading ? t("addSignalAdding") : t("addSignalSubmit")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Add Project modal ──────────────────────────────────────────────────────────
function AddProjectModal({ signals, onClose, onAdd }: { signals: Signal[]; onClose: () => void; onAdd: (p: Project) => void }) {
  const t = useTranslations("commandCenter");
  const [form, setForm] = useState({ name: "", clientName: "", platform: "shopify", dueDate: "", notes: "", signalId: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!form.name || !form.clientName) { setErr(t("addProjectNameClientRequired")); return; }
    setLoading(true);
    try {
      const proj = await createProject({
        name:       form.name,
        clientName: form.clientName,
        platform:   form.platform,
        dueDate:    form.dueDate || undefined,
        notes:      form.notes   || undefined,
        signalId:   form.signalId || undefined,
      });
      onAdd(proj);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl bg-[#0c0c0f] border border-white/[0.05] p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-bold">{t("addProjectTitle")}</h2>
          <button onClick={onClose}><X size={16} className="text-white/30" /></button>
        </div>
        <div className="space-y-3">
          {[
            { key: "name",       labelKey: "addProjectNameLabel",   placeholder: t("addProjectNamePh") },
            { key: "clientName", labelKey: "addProjectClientLabel",    placeholder: t("addProjectClientPh")       },
          ].map(({ key, labelKey, placeholder }) => (
            <div key={key}>
              <label className="text-[11px] font-semibold text-white/30 uppercase tracking-wide">{t(labelKey)}</label>
              <input value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                className="mt-1.5 w-full rounded-lg border border-white/[0.05] bg-white/[0.04] px-3 py-2 text-[13px] outline-none focus:border-[#FF6B35]" />
            </div>
          ))}
          <div>
            <label className="text-[11px] font-semibold text-white/30 uppercase tracking-wide">{t("addProjectPlatform")}</label>
            <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-white/[0.05] bg-white/[0.04] px-3 py-2 text-[13px] outline-none focus:border-[#FF6B35]">
              {["shopify", "wordpress", "webflow", "ikas", "custom"].map((p) => (
                <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
          {signals.length > 0 && (
            <div>
              <label className="text-[11px] font-semibold text-white/30 uppercase tracking-wide">{t("addProjectLinkSignal")}</label>
              <select value={form.signalId} onChange={(e) => setForm({ ...form, signalId: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-white/[0.05] bg-white/[0.04] px-3 py-2 text-[13px] outline-none focus:border-[#FF6B35]">
                <option value="">{t("addProjectLinkNone")}</option>
                {signals.map((s) => (
                  <option key={s.id} value={s.id}>{s.senderName} ({s.platform})</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-[11px] font-semibold text-white/30 uppercase tracking-wide">{t("addProjectDueDate")}</label>
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-white/[0.05] bg-white/[0.04] px-3 py-2 text-[13px] outline-none focus:border-[#FF6B35]" />
          </div>
          {err && <p className="text-[11px] text-red-500">{err}</p>}
          <button onClick={submit} disabled={loading}
            className="w-full rounded-xl bg-white py-2.5 text-[13px] font-bold text-[#0A0A0A] hover:opacity-80 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {loading ? t("addProjectCreating") : t("addProjectSubmit")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Contact Picker API (mobile/modern browsers) ────────────────────────────────
async function pickFromDeviceContacts(): Promise<{ name: string; phone: string } | null> {
  try {
    if (!("contacts" in navigator && "ContactsManager" in window)) return null;
    // @ts-expect-error
    const results = await navigator.contacts.select(["name", "tel"], { multiple: false });
    if (!results || results.length === 0) return null;
    const c = results[0];
    return {
      name:  c.name?.[0]  ?? "",
      phone: c.tel?.[0]   ?? "",
    };
  } catch {
    return null;
  }
}

// ── Start Conversation modal ───────────────────────────────────────────────────
function StartConversationModal({
  onClose, onStarted, knownContacts,
}: {
  onClose: () => void;
  onStarted: (sig: Signal) => void;
  knownContacts: Signal[];
}) {
  const t = useTranslations("commandCenter");
  const [search,       setSearch]       = useState("");
  const [phone,        setPhone]        = useState("");
  const [name,         setName]         = useState("");
  const [message,      setMessage]      = useState(t("startConvDefaultMessage"));
  const [loading,      setLoading]      = useState(false);
  const [err,          setErr]          = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasContactApi, setHasContactApi] = useState(false);

  useEffect(() => {
    setHasContactApi("contacts" in navigator && "ContactsManager" in window);
  }, []);

  // Real contacts = WA signals from DB, auto-updated via SSE
  const waContacts = knownContacts.filter((s) => s.platform === "whatsapp");

  const filtered = search.trim()
    ? waContacts.filter((c) =>
        c.senderName.toLowerCase().includes(search.toLowerCase()) ||
        c.sender.includes(search)
      )
    : waContacts;

  const pickContact = (c: Signal) => {
    setName(c.senderName);
    setPhone(c.sender);
    setSearch("");
    setShowDropdown(false);
  };

  const handleDevicePick = async () => {
    const result = await pickFromDeviceContacts();
    if (result?.name) setName(result.name);
    if (result?.phone) setPhone(result.phone.replace(/\s/g, ""));
  };

  const submit = async () => {
    if (!phone.trim() || !name.trim() || !message.trim()) { setErr(t("startConvAllRequired")); return; }
    const normalized = phone.startsWith("+") ? phone.replace(/\s/g, "") : "+" + phone.replace(/\s/g, "");
    setLoading(true); setErr("");
    try {
      // Reuse existing signal if this number already exists
      const existing = knownContacts.find(
        (s) => s.sender === normalized || s.sender === phone.trim()
      );
      const sig = existing ?? await createSignal({
        platform:   "whatsapp",
        sender:     normalized,
        senderName: name.trim(),
        preview:    message,
      });
      await sendMessage(sig.id, message);
      onStarted(sig);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : t("startConvFailed"));
    } finally { setLoading(false); }
  };

  const hasContact = !!(name && phone);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl bg-[#0c0c0f] border border-white/[0.05] p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[15px] font-bold">{t("startConvTitle")}</h2>
            <p className="text-[11px] text-white/20 mt-0.5">{t("startConvSubtitle")}</p>
          </div>
          <button onClick={onClose}><X size={16} className="text-white/30" /></button>
        </div>
        <div className="space-y-3">

          {/* ── Contact picker ── */}
          {!hasContact ? (
            <>
              {/* Search existing (real signals from DB, live via SSE) */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-white/30 uppercase tracking-wide">
                    {t("startConvRecentCustomers")}
                  </label>
                  {hasContactApi && (
                    <button onClick={handleDevicePick}
                      className="flex items-center gap-1 text-[10px] font-semibold text-[#FF6B35] hover:underline">
                      <BookUser size={11} /> {t("startConvPickFromDevice")}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                    placeholder={t("startConvSearch")}
                    className="w-full rounded-lg border border-white/[0.05] bg-white/[0.04] pl-9 pr-3 py-2.5 text-[13px] outline-none focus:border-[#25D366] transition-colors"
                  />
                  <MessageCircle size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#25D366]" />
                </div>

                {/* Dropdown with real contacts */}
                {showDropdown && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border border-white/[0.05] bg-[#0c0c0f] shadow-lg overflow-hidden">
                    {filtered.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto">
                        {filtered.map((c) => (
                          <button key={c.id} onMouseDown={() => pickContact(c)}
                            className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-white/[0.04] transition-colors text-left">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20">
                              <span className="text-[12px] font-bold text-green-400">
                                {c.senderName[0]?.toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-semibold text-white truncate">{c.senderName}</p>
                              <p className="text-[11px] text-white/20">{c.sender}</p>
                            </div>
                            {c.status === "new" && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#FF6B35] flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-4 text-center">
                        <p className="text-[12px] font-semibold text-white/30">
                          {waContacts.length === 0
                            ? t("startConvNoCustomers")
                            : t("startConvNoMatch")}
                        </p>
                        <p className="mt-0.5 text-[10px] text-white/20 leading-relaxed">
                          {waContacts.length === 0
                            ? t("startConvNoCustomersDesc")
                            : t("startConvManualAddDesc")}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Manual entry */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "name",  labelKey: "startConvNameLabel",   value: name,  set: setName,  placeholder: t("startConvNamePh")  },
                  { key: "phone", labelKey: "startConvNumberLabel", value: phone, set: setPhone, placeholder: t("startConvNumberPh") },
                ].map(({ key, labelKey, value, set, placeholder }) => (
                  <div key={key}>
                    <label className="text-[11px] font-semibold text-white/30 uppercase tracking-wide">{t(labelKey)}</label>
                    <input value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder}
                      className="mt-1.5 w-full rounded-lg border border-white/[0.05] bg-white/[0.04] px-3 py-2 text-[12px] outline-none focus:border-[#25D366]" />
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* ── Selected contact card ── */
            <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-500/20">
                <span className="text-[14px] font-bold text-green-400">{name[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-white">{name}</p>
                <p className="text-[11px] text-white/30 font-mono">{phone}</p>
              </div>
              <button onClick={() => { setName(""); setPhone(""); setSearch(""); }}
                className="rounded-lg p-1 text-white/20 hover:bg-green-500/20 hover:text-white/30 transition-colors">
                <X size={13} />
              </button>
            </div>
          )}

          {/* Opening message */}
          <div>
            <label className="text-[11px] font-semibold text-white/30 uppercase tracking-wide">{t("startConvOpeningMessage")}</label>
            <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/[0.05] bg-white/[0.04] px-3 py-2 text-[13px] outline-none focus:border-[#25D366] resize-none" />
          </div>

          <p className="text-[10px] text-white/20 leading-relaxed">
            {t("startConvWindowNote")}
          </p>

          {err && <p className="text-[11px] text-red-500">{err}</p>}

          <button onClick={submit} disabled={loading || !hasContact}
            className="w-full rounded-xl py-2.5 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
            style={{ background: "#25D366" }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
            {loading ? t("startConvStarting") : t("startConvSubmit")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
interface Props {
  setView:    (v: DashboardView) => void;
  setSignalId: (id: string | null) => void;
}

export function CommandCenter({ setView, setSignalId }: Props) {
  const t = useTranslations("commandCenter");
  const [signals,     setSignals]     = useState<Signal[]>([]);
  const [projects,    setProjects]    = useState<Project[]>([]);
  const [stats,       setStats]       = useState<DashboardStats | null>(null);
  const [platforms,   setPlatforms]   = useState<PlatformConnection[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [serverError, setServerError] = useState(false);
  const [showAddSignal,        setShowAddSignal]        = useState(false);
  const [showAddProject,       setShowAddProject]       = useState(false);
  const [showStartConversation, setShowStartConversation] = useState(false);
  const [showImport,           setShowImport]           = useState(false);
  const [liveFlash, setLiveFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setServerError(false);
    try {
      const [sigs, projs, st, conns] = await Promise.all([
        getSignals(), getProjects(), getDashboardStats(), getPlatformConnections(),
      ]);
      setSignals(sigs);
      setProjects(projs);
      setStats(st);
      setPlatforms(conns);
    } catch {
      setServerError(true);
    } finally { setLoading(false); }
  }, []);

  // Realtime: incoming messages from Meta webhooks via SSE
  const handleRealtimeMessage = useCallback((evt: RealtimeSignalEvent) => {
    setSignals((prev) => {
      const idx = prev.findIndex((s) => s.id === evt.signalId);
      if (idx !== -1) {
        // Update existing signal's preview
        const updated = [...prev];
        updated[idx] = { ...updated[idx], preview: evt.text, status: "new" };
        return updated;
      }
      // New signal — prepend it
      const newSig: Signal = {
        id:            evt.signalId,
        platform:      evt.platform,
        sender:        evt.sender,
        senderName:    evt.senderName,
        preview:       evt.text,
        isOnDashboard: false,
        status:        "new",
        createdAt:     evt.timestamp,
      };
      return [newSig, ...prev];
    });

    // Update stats counter
    if (evt.isNew) {
      setStats((prev) => prev ? { ...prev, totalSignals: prev.totalSignals + 1, newSignals: prev.newSignals + 1 } : prev);
    }

    // Flash indicator for 4 seconds
    setLiveFlash(evt.senderName);
    setTimeout(() => setLiveFlash(null), 4_000);
  }, []);

  useRealtimeSignals({ onMessage: handleRealtimeMessage });

  useEffect(() => { load(); }, [load]);

  const handleTogglePin = async (sig: Signal) => {
    try {
      const updated = await toggleSignalDashboard(sig.id, !sig.isOnDashboard);
      setSignals((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    } catch (e) { console.error(e); }
  };

  const handleDeleteSignal = async (id: string) => {
    try {
      await deleteSignal(id);
      setSignals((prev) => prev.filter((s) => s.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (e) { console.error(e); }
  };

  const dashboardSignals = signals.filter((s) => s.isOnDashboard);
  // whatsapp_business = fully connected via Meta API (can receive webhooks + send messages)
  // whatsapp = login-only connection (just phone number, no Meta API access)
  const waConnected       = platforms.some((p) => p.platform === "whatsapp_business");
  const waLoginOnly       = !waConnected && platforms.some((p) => p.platform === "whatsapp");
  const igConnected       = platforms.some((p) => p.platform === "instagram_dm" || p.platform === "instagram");

  const STAT_CARDS = [
    { labelKey: "statTotalSignals",    value: stats?.totalSignals      ?? "—", subKey: "statTotalSignalsSub",       dark: true  },
    { labelKey: "statNew",              value: stats?.newSignals         ?? "—", subKey: "statNewSub",    dark: false },
    { labelKey: "statActiveProjects",  value: stats?.activeProjects     ?? "—", subKey: "statActiveProjectsSub",        dark: false },
    { labelKey: "statLiveSites",       value: stats?.liveProjects       ?? "—", subKey: "statLiveSitesSub", dark: false },
  ];

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <Loader2 size={24} className="animate-spin text-white/20" />
    </div>
  );

  if (serverError) return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6B35]/10">
        <Radio size={22} className="text-[#FF6B35]" />
      </div>
      <div>
        <p className="text-[15px] font-bold text-white">{t("serverOfflineTitle")}</p>
        <p className="mt-1 text-[13px] text-white/30">{t("serverOfflineHint", { cmd: t("serverOfflineCmd"), pkg: t("serverOfflinePkg") })}</p>
      </div>
      <button onClick={load}
        className="rounded-xl border border-white/[0.05] bg-[#111114] px-5 py-2 text-[13px] font-semibold text-white/30 hover:bg-white/[0.04]">
        {t("retry")}
      </button>
    </div>
  );

  return (
    <>
      <div className="relative p-6">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">{t("pageTitle")}</h1>
            <p className="mt-0.5 text-[13px] text-white/30">{t("pageSubtitle")}</p>
          </div>

          {/* Live flash toast */}
          <AnimatePresence>
            {liveFlash && (
              <motion.div
                key="live-flash"
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0,  scale: 1    }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                className="absolute left-1/2 top-6 z-50 -translate-x-1/2 flex items-center gap-2 rounded-full border border-[#FF6B35]/20 bg-[#0c0c0f] px-4 py-2 shadow-lg"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF6B35] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF6B35]" />
                </span>
                <Zap size={12} className="text-[#FF6B35]" />
                <span className="text-[12px] font-semibold text-white">{t("liveFlash", { name: liveFlash || "" })}</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAddProject(true)}
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-[13px] font-bold text-[#0A0A0A] hover:opacity-80 transition-opacity">
              <Plus size={14} />{t("newProject")}
            </button>
            <button onClick={() => { setSignalId(null); setView("engine"); }}
              className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-[#0c0c0f] px-4 py-2 text-[13px] font-medium text-white/30 hover:bg-white/[0.04] transition-colors">
              {t("openEngineRoom")}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-5 grid grid-cols-4 gap-4">
          {STAT_CARDS.map((s, i) => (
            <motion.div key={s.labelKey} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`relative rounded-2xl p-5 ${s.dark ? "bg-[#0A0A0A] text-white" : "bg-[#0c0c0f] border border-white/[0.05]"}`}>
              <button className={`absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full ${s.dark ? "bg-white/10" : "bg-white/[0.06]"}`}>
                <ArrowUpRight size={12} className={s.dark ? "text-white" : "text-white/30"} />
              </button>
              <p className={`text-[12px] font-semibold mb-2 ${s.dark ? "text-white/60" : "text-white/30"}`}>{t(s.labelKey)}</p>
              <p className="text-4xl font-black tracking-tight">{s.value}</p>
              <div className={`mt-3 flex items-center gap-1.5 text-[11px] ${s.dark ? "text-white/50" : "text-white/20"}`}>
                <TrendingUp size={11} className="text-green-400" />
                <span>{t(s.subKey)}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Import banner: show when no conversations exist yet */}
        {signals.length === 0 && !loading && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-5 rounded-2xl border border-[#FF6B35]/20 bg-[#FF6B35]/5 p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#FF6B35]/10">
              <Upload size={22} className="text-[#FF6B35]" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-bold text-white">{t("importBannerTitle")}</p>
              <p className="mt-0.5 text-[12px] text-white/40 leading-relaxed">
                {t("importBannerDesc")}
              </p>
            </div>
            <button onClick={() => setShowImport(true)}
              className="flex-shrink-0 flex items-center gap-1.5 rounded-xl bg-[#FF6B35] px-4 py-2.5 text-[13px] font-bold text-white hover:opacity-90 transition-opacity">
              <Upload size={13} />
              {t("importChats")}
            </button>
          </motion.div>
        )}

        <div className="grid grid-cols-3 gap-4">
          {/* Signals panel */}
          <div className="col-span-1 rounded-2xl bg-[#0c0c0f] border border-white/[0.05] p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-bold">{t("conversations")}</h2>
                {signals.filter((s) => s.status === "new").length > 0 && (
                  <span className="rounded-full bg-[#FF6B35]/10 px-2 py-0.5 text-[10px] font-bold text-[#FF6B35]">
                    {t("newCount", { n: signals.filter((s) => s.status === "new").length })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setShowImport(true)}
                  className="flex items-center gap-1 rounded-lg border border-[#FF6B35]/20 px-2.5 py-1 text-[11px] font-semibold text-[#FF6B35] bg-[#FF6B35]/10 hover:bg-[#FF6B35]/20 transition-colors">
                  <Upload size={11} />{t("import")}
                </button>
                {waConnected && (
                  <button onClick={() => setShowStartConversation(true)}
                    className="flex items-center gap-1 rounded-lg border border-green-500/20 px-2.5 py-1 text-[11px] font-semibold text-[#25D366] bg-green-500/10 hover:bg-green-500/20 transition-colors">
                    <MessageCircle size={11} />{t("startBtn")}
                  </button>
                )}
              </div>
            </div>


            {/* Signal list */}
            {signals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center flex-1">
                {waConnected ? (
                  <>
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20">
                      <MessageCircle size={20} className="text-green-500" />
                    </div>
                    <p className="text-[13px] font-bold text-white">{t("whatsappLive")}</p>
                    <p className="mt-1 text-[11px] text-white/20 leading-relaxed max-w-[160px]">
                      {t("whatsappLiveDesc")}
                    </p>
                    <button onClick={() => setShowStartConversation(true)}
                      className="mt-4 flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold text-white hover:opacity-90 transition-opacity"
                      style={{ background: "#25D366" }}>
                      <MessageCircle size={13} />{t("startSession")}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04]">
                      <Upload size={18} className="text-white/20" />
                    </div>
                    <p className="text-[13px] font-semibold text-white/30">{t("noConversations")}</p>
                    <p className="mt-1 text-[11px] text-white/20 max-w-[180px]">
                      {t("noConversationsDesc")}
                    </p>
                    <button onClick={() => setShowImport(true)}
                      className="mt-4 flex items-center gap-1.5 rounded-xl bg-[#FF6B35] px-4 py-2 text-[12px] font-bold text-white hover:opacity-90 transition-opacity">
                      <Upload size={13} />{t("importChats")}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-1.5 overflow-y-auto flex-1">
                <AnimatePresence>
                  {signals.map((sig) => (
                    <motion.div key={sig.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -8 }}
                      className="group flex items-center gap-3 rounded-xl p-2 hover:bg-white/[0.04] transition-colors cursor-pointer"
                      onClick={() => { setSignalId(sig.id); setView("engine"); }}
                    >
                      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                        sig.platform === "whatsapp"  ? "bg-green-500/10" :
                        sig.platform === "instagram" ? "bg-pink-500/10"  :
                        sig.platform === "telegram"  ? "bg-blue-500/10"  :
                                                       "bg-white/[0.06]"
                      }`}>
                        {sig.platform === "whatsapp"  ? <MessageCircle size={14} className="text-green-500" /> :
                         sig.platform === "instagram" ? <Instagram     size={14} className="text-pink-500" /> :
                         sig.platform === "telegram"  ? <Send          size={14} className="text-blue-400" /> :
                                                        <MessageCircle size={14} className="text-white/30" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[12px] font-semibold truncate">{sig.senderName}</p>
                          {sig.status === "new" && (
                            <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-[#FF6B35]" />
                          )}
                        </div>
                        <p className="text-[11px] text-white/20 truncate">{sig.preview}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); handleTogglePin(sig); }} title={sig.isOnDashboard ? t("unpinTip") : t("pinTip")}
                          className="flex h-6 w-6 items-center justify-center rounded hover:bg-white/[0.06]">
                          {sig.isOnDashboard ? <PinOff size={11} className="text-[#FF6B35]" /> : <Pin size={11} className="text-white/20" />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteSignal(sig.id); }} title={t("deleteTip")}
                          className="flex h-6 w-6 items-center justify-center rounded hover:bg-red-500/10">
                          <Trash2 size={11} className="text-red-400" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Pipeline */}
          <div className="col-span-2 rounded-2xl bg-[#0c0c0f] border border-white/[0.05] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-bold">{t("pipeline")}</h2>
              <button onClick={() => setShowAddProject(true)}
                className="flex items-center gap-1 rounded-lg border border-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-white/30 hover:bg-white/[0.04]">
                <Plus size={11} />{t("pipelineNew")}
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
                  <Rocket size={20} className="text-white/20" />
                </div>
                <p className="text-[13px] font-semibold text-white/30">{t("noProjectsTitle")}</p>
                <p className="mt-1 text-[11px] text-white/20">{t("noProjectsDesc")}</p>
                <button onClick={() => setShowAddProject(true)}
                  className="mt-4 flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-[12px] font-bold text-[#0A0A0A] hover:opacity-80">
                  <Plus size={13} /> {t("newProject")}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {projects.map((proj, i) => {
                    const meta = PHASE_STYLE[proj.phase] ?? { labelKey: "phaseLive", cls: "bg-white/[0.03] text-white/30" };
                    const barCls = PHASE_BAR[proj.phase] ?? "bg-white/25";
                    const color  = PLATFORM_COLOR[proj.platform] ?? "#737373";
                    return (
                      <motion.div key={proj.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="group flex items-center gap-4 rounded-xl border border-white/[0.04] p-3 hover:border-white/[0.06] hover:bg-white/[0.03] transition-all">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-white text-[10px] font-black"
                          style={{ backgroundColor: color }}>
                          {proj.platform[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <p className="text-[13px] font-semibold truncate">{proj.name}</p>
                            <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.cls}`}>{t(meta.labelKey)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${proj.progress}%` }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className={`h-1 rounded-full ${barCls}`} />
                            </div>
                            <span className="text-[10px] font-bold text-white/20 flex-shrink-0">{proj.progress}%</span>
                          </div>
                          <p className="mt-1 text-[11px] text-white/20">
                            {proj.clientName}{proj.dueDate ? ` · ${t("dueLabel", { date: new Date(proj.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) })}` : ""}
                          </p>
                        </div>
                        <button onClick={() => handleDeleteProject(proj.id)}
                          className="opacity-0 group-hover:opacity-100 flex h-7 w-7 items-center justify-center rounded-lg hover:bg-red-500/10 transition-all">
                          <Trash2 size={13} className="text-red-400" />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Quick stats bar */}
        {stats && (
          <div className="mt-4 grid grid-cols-3 gap-4">
            {[
              { icon: Clock,        labelKey: "quickStatCompleted", value: stats.completedThisWeek, color: "bg-green-500/10 text-green-400" },
              { icon: Radio,        labelKey: "quickStatActive",      value: signals.filter((s) => s.status !== "ignored").length, color: "bg-blue-500/10 text-blue-400" },
              { icon: CheckCircle2, labelKey: "quickStatLive",          value: stats.liveProjects,      color: "bg-[#FF6B35]/10 text-[#FF6B35]" },
            ].map(({ icon: Icon, labelKey, value, color }) => (
              <div key={labelKey} className="flex items-center gap-4 rounded-2xl bg-[#0c0c0f] border border-white/[0.05] px-5 py-4">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-xl font-black">{value}</p>
                  <p className="text-[11px] text-white/20">{t(labelKey)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddSignal && (
          <AddSignalModal
            onClose={() => setShowAddSignal(false)}
            onAdd={(sig) => { setSignals((prev) => [sig, ...prev]); setShowAddSignal(false); }}
          />
        )}
        {showAddProject && (
          <AddProjectModal
            signals={signals}
            onClose={() => setShowAddProject(false)}
            onAdd={(proj) => { setProjects((prev) => [proj, ...prev]); setShowAddProject(false); }}
          />
        )}
        {showStartConversation && (
          <StartConversationModal
            knownContacts={signals}
            onClose={() => setShowStartConversation(false)}
            onStarted={(sig) => {
              setSignals((prev) => prev.find((s) => s.id === sig.id) ? prev : [sig, ...prev]);
              setShowStartConversation(false);
              setSignalId(sig.id);
              setView("engine");
            }}
          />
        )}
        {showImport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md relative">
              <button onClick={() => setShowImport(false)}
                className="absolute -top-2 -right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[#0c0c0f] border border-white/[0.08] text-white/30 hover:text-white/60">
                <X size={14} />
              </button>
              <ChatImport onImportComplete={() => { setTimeout(() => { setShowImport(false); load(); }, 2000); }} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
