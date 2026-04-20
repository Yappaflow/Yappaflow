"use client";

import { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, Check, User, Bell, Shield, Link2, Loader2, Unlink, MessageCircle, Instagram, Download, Upload } from "lucide-react";
import {
  getPlatformConnections, disconnectPlatform, importPlatformMessages,
  getMe,
  type PlatformConnection,
  type Me,
} from "@/lib/dashboard-api";
import ChatImport from "./ChatImport";

// ── API Key field ──────────────────────────────────────────────────────────────

const API_FIELDS = [
  { id: "namecheap",  label: "Namecheap API Key",  service: "Domain registrar",  placeholder: "nc_api_xxxxxxxxxx",  color: "#E05C00" },
  { id: "hostinger",  label: "Hostinger API Key",  service: "Hosting provider",  placeholder: "hg_tok_xxxxxxxxxx",  color: "#7823DC" },
  { id: "iyzico",     label: "Iyzico API Key",     service: "Payment gateway",   placeholder: "sandbox-xxxxxxxxxx", color: "#00B4D8" },
];

const PREFERENCES = [
  { id: "push",  label: "Push Notifications", desc: "New signals & deployment alerts" },
  { id: "sound", label: "Sound Alerts",        desc: "Audio cue on new message"       },
  { id: "auto",  label: "Auto-Build",          desc: "Start building on intake end"   },
];

function ApiKeyField({ label, service, placeholder, color }: {
  label: string; service: string; placeholder: string; color: string;
}) {
  const [value, setValue]     = useState("");
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const connected = value.length > 6;

  return (
    <div className={[
      "rounded-xl border p-4 bg-[#111114] transition-all",
      focused ? "shadow-xl shadow-black/20" : "border-white/[0.05]",
    ].join(" ")}
      style={focused ? { borderColor: color + "60" } : {}}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: color }} />
          <div>
            <p className="text-[13px] font-semibold text-white">{label}</p>
            <p className="text-[11px] text-white/20">{service}</p>
          </div>
        </div>
        {connected && (
          <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: color + "15", color }}>
            <Check size={9} strokeWidth={3} />
            Connected
          </span>
        )}
      </div>
      <div className={`flex items-center gap-2 rounded-lg border px-3 bg-white/[0.04] transition-colors ${focused ? "border-white/[0.08]" : "border-white/[0.05]"}`}>
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent py-2.5 text-[12px] font-mono text-white placeholder-white/15 outline-none"
          autoComplete="off"
          spellCheck={false}
        />
        <button onClick={() => setVisible((v) => !v)} className="text-white/15 hover:text-white/30 transition-colors">
          {visible ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
    </div>
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative h-5 w-9 rounded-full transition-colors ${enabled ? "bg-[#FF6B35]" : "bg-white/[0.08]"}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

let _settingsApiBase: string | null = null;
function getApiBase(): string {
  if (_settingsApiBase !== null) return _settingsApiBase;
  const direct = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  if (typeof window === "undefined") return direct;
  _settingsApiBase = direct;
  return _settingsApiBase;
}

// ── Instagram one-click connect ────────────────────────────────────────────────

function InstagramOAuthButton() {
  const handleClick = () => {
    window.location.href = "/api/auth/instagram/authorize";
  };

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-white/[0.05] bg-white/[0.04] p-4">
      <p className="text-[11px] text-white/30 leading-relaxed">
        Connect your Instagram Business account in one click. You&apos;ll be redirected to Meta
        to authorize Yappaflow to read your DMs.
      </p>
      <button onClick={handleClick}
        className="w-full rounded-lg py-2 text-[12px] font-bold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        style={{ background: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}>
        <Instagram size={13} />
        Continue with Instagram
      </button>
    </div>
  );
}

// ── Connected platform card ────────────────────────────────────────────────────

function ConnectedCard({
  conn, onDisconnect,
}: { conn: PlatformConnection; onDisconnect: () => void }) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [importing, setImporting]         = useState(false);
  const [importMsg, setImportMsg]         = useState("");

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try { await disconnectPlatform(conn.platform); onDisconnect(); }
    finally { setDisconnecting(false); }
  };

  const handleImport = async () => {
    setImporting(true); setImportMsg("");
    try {
      const result = await importPlatformMessages(conn.platform);
      setImportMsg(`Imported ${result.signalsCreated} conversations, ${result.messagesCreated} messages`);
    } catch (e: unknown) {
      setImportMsg(e instanceof Error ? e.message : "Import failed");
    } finally { setImporting(false); }
  };

  const isWA = conn.platform === "whatsapp" || conn.platform === "whatsapp_business";
  const isIG = conn.platform === "instagram" || conn.platform === "instagram_dm";
  const color = isWA ? "#25D366" : "#E1306C";
  const label = isWA ? "WhatsApp Business" : "Instagram DMs";
  const sub   = isWA ? conn.displayPhone : `@${conn.igUsername}`;

  return (
    <div className="rounded-xl border border-white/[0.05] bg-[#111114] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: color + "15" }}>
            {isWA
              ? <MessageCircle size={18} style={{ color }} />
              : <Instagram     size={18} style={{ color }} />}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white">{label}</p>
            <p className="text-[11px] text-white/20">{sub}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: color + "15", color }}>
            <Check size={9} strokeWidth={3} /> Live
          </span>
          {isIG && (
            <button onClick={handleImport} disabled={importing}
              className="flex items-center gap-1 rounded-lg border border-white/[0.05] px-2.5 py-1.5 text-[11px] font-semibold text-white/30 hover:border-white/[0.08] hover:text-white transition-colors disabled:opacity-50">
              {importing ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
              {importing ? "Importing…" : "Import Messages"}
            </button>
          )}
          <button onClick={handleDisconnect} disabled={disconnecting}
            className="flex items-center gap-1 rounded-lg border border-white/[0.05] px-2.5 py-1.5 text-[11px] font-semibold text-white/30 hover:border-red-200 hover:text-red-500 transition-colors disabled:opacity-50">
            {disconnecting ? <Loader2 size={11} className="animate-spin" /> : <Unlink size={11} />}
            Disconnect
          </button>
        </div>
      </div>
      {isWA && (
        <p className="text-[10px] text-white/20 leading-relaxed px-1">
          WhatsApp message history is not available via the API — new messages will appear here in real-time as customers write to you.
        </p>
      )}
      {importMsg && (
        <p className="text-[11px] font-medium px-1" style={{ color: importMsg.includes("failed") ? "#EF4444" : "#25D366" }}>
          {importMsg}
        </p>
      )}
    </div>
  );
}

// ── Connect Platforms section ──────────────────────────────────────────────────

function ConnectPlatforms() {
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expand, setExpand]           = useState<"instagram" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setConnections(await getPlatformConnections()); }
    catch { setConnections([]); /* server may be offline */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isIGConnected = connections.some((c) => c.platform === "instagram" || c.platform === "instagram_dm");

  // Filter out login-only connections
  const visibleConnections = connections.filter((c) => c.platform !== "whatsapp");

  return (
    <div className="space-y-4">
      {/* Chat Import */}
      <ChatImport />

      {/* Instagram connection */}
      <div className="rounded-2xl bg-[#0c0c0f] border border-white/[0.05] p-5">
        <h2 className="text-[14px] font-bold mb-1">Live Integrations</h2>
        <p className="text-[11px] text-white/20 mb-4">
          Optionally connect Instagram to receive DMs in real-time.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-white/20" />
          </div>
        ) : (
          <div className="space-y-3">
            {visibleConnections.map((conn) => (
              <ConnectedCard key={conn.id} conn={conn} onDisconnect={load} />
            ))}

            {!isIGConnected && (
              <div>
                <button
                  onClick={() => setExpand((prev) => prev === "instagram" ? null : "instagram")}
                  className="w-full flex items-center justify-between rounded-xl border border-dashed border-white/[0.08] px-4 py-3 hover:border-white/[0.12] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] group-hover:bg-white/[0.06] transition-colors">
                      <Instagram size={16} style={{ color: "#E1306C" }} />
                    </div>
                    <div className="text-left">
                      <p className="text-[12px] font-semibold text-white">Instagram DMs</p>
                      <p className="text-[10px] text-white/20 max-w-xs">Connect to receive real-time customer messages</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.05] px-3 py-1.5 text-[11px] font-semibold text-white/30 group-hover:border-white/[0.08] flex-shrink-0">
                    <Link2 size={11} />
                    {expand === "instagram" ? "Cancel" : "Connect"}
                  </div>
                </button>

                {expand === "instagram" && <InstagramOAuthButton />}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sections ───────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "profile",   label: "Profile",    icon: User    },
  { id: "platforms", label: "Platforms",  icon: Link2   },
  { id: "api",       label: "API Keys",   icon: Shield  },
  { id: "notif",     label: "Notifications", icon: Bell },
];

export function IntegrationsSettings() {
  const [lang, setLang]       = useState<"tr" | "en">("tr");
  const [prefs, setPrefs]     = useState({ push: true, sound: true, auto: false });
  const [section, setSection] = useState("profile");
  // Pull the logged-in user so the Profile panel shows THEIR name/email/phone
  // instead of the hardcoded placeholder that used to live here.
  const [me, setMe]           = useState<Me | null>(null);
  const [meLoading, setMeLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await getMe();
        if (!cancelled) setMe(user);
      } catch {
        // Silently degrade — show em-dashes rather than crashing the settings
        // page if the token happens to be stale. Middleware will bounce them
        // to /auth on the next navigation.
      } finally {
        if (!cancelled) setMeLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight">Settings</h1>
        <p className="mt-0.5 text-[13px] text-white/30">Manage your agency preferences and integrations</p>
      </div>

      <div className="flex gap-5">
        {/* Section tabs */}
        <div className="w-44 flex-shrink-0">
          <div className="flex flex-col gap-1">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setSection(id)}
                className={[
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium text-left transition-all",
                  section === id ? "bg-[#111114] border border-white/[0.05] text-white shadow-xl shadow-black/20" : "text-white/30 hover:bg-white/[0.04] hover:text-white",
                ].join(" ")}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-xl">

          {section === "profile" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-[#0c0c0f] border border-white/[0.05] p-6">
                <h2 className="text-[14px] font-bold mb-4">Profile</h2>
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF6B35]/10 border border-[#FF6B35]/30 overflow-hidden">
                    {me?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={me.avatarUrl} alt={me.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xl font-black text-[#FF6B35]">
                        {(me?.name?.trim()?.charAt(0) || "?").toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-[15px] font-bold">
                      {meLoading ? "Loading…" : me?.name || "—"}
                    </p>
                    <p className="text-[12px] text-white/20">
                      {me?.authProvider === "whatsapp"
                        ? "WhatsApp account"
                        : me?.authProvider === "instagram"
                        ? "Instagram account"
                        : "Email account"}
                    </p>
                  </div>
                  <button className="ml-auto rounded-lg border border-white/[0.05] px-3 py-1.5 text-[12px] font-semibold text-white/30 hover:bg-white/[0.04]">
                    Edit
                  </button>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Name",  value: meLoading ? "…" : (me?.name  || "—") },
                    { label: "Email", value: meLoading ? "…" : (me?.email || "—") },
                    {
                      label: "Phone",
                      value: meLoading
                        ? "…"
                        : me?.phone
                          ? me.phone + (me.phoneVerified ? "  ✓" : "")
                          : "—",
                    },
                  ].map((f) => (
                    <div key={f.label} className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-0">
                      <span className="text-[12px] text-white/30">{f.label}</span>
                      <span className="text-[12px] font-semibold text-white">{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-[#0c0c0f] border border-white/[0.05] p-5">
                <h2 className="text-[14px] font-bold mb-3">Language</h2>
                <div className="flex gap-2 rounded-xl border border-white/[0.05] bg-white/[0.04] p-1 w-fit">
                  {(["tr", "en"] as const).map((l) => (
                    <button key={l} onClick={() => setLang(l)}
                      className={[
                        "rounded-lg px-5 py-2 text-[13px] font-semibold transition-all",
                        lang === l ? "bg-[#111114] text-white shadow-sm border border-white/[0.05]" : "text-white/30",
                      ].join(" ")}
                    >
                      {l === "tr" ? "🇹🇷 Türkçe" : "🇺🇸 English"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {section === "platforms" && <ConnectPlatforms />}

          {section === "api" && (
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.05] p-5">
              <h2 className="text-[14px] font-bold mb-4">API Integrations</h2>
              <div className="grid grid-cols-1 gap-3">
                {API_FIELDS.map((f) => (
                  <ApiKeyField key={f.id} label={f.label} service={f.service} placeholder={f.placeholder} color={f.color} />
                ))}
              </div>
            </div>
          )}

          {section === "notif" && (
            <div className="rounded-2xl bg-[#0c0c0f] border border-white/[0.05] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <h2 className="text-[14px] font-bold">Notification Preferences</h2>
              </div>
              {PREFERENCES.map((pref, i) => (
                <div key={pref.id}
                  className={[
                    "flex items-center justify-between px-5 py-4",
                    i < PREFERENCES.length - 1 ? "border-b border-white/[0.05]" : "",
                  ].join(" ")}
                >
                  <div>
                    <p className="text-[13px] font-semibold text-white">{pref.label}</p>
                    <p className="text-[11px] text-white/20 mt-0.5">{pref.desc}</p>
                  </div>
                  <Toggle
                    enabled={prefs[pref.id as keyof typeof prefs]}
                    onChange={(v) => setPrefs((p) => ({ ...p, [pref.id]: v }))}
                  />
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
