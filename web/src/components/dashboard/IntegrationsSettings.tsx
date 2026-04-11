"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Eye, EyeOff, Check, User, Bell, Shield, Link2, Loader2, Unlink, MessageCircle, Instagram, Download, ChevronDown } from "lucide-react";
import {
  getPlatformConnections, connectWhatsApp, connectWhatsAppEmbedded, disconnectPlatform, importPlatformMessages,
  type PlatformConnection,
} from "@/lib/dashboard-api";
import { useFacebookSDK } from "@/lib/hooks/useFacebookSDK";

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
      "rounded-xl border p-4 bg-white transition-all",
      focused ? "shadow-sm" : "border-[#EFEFEF]",
    ].join(" ")}
      style={focused ? { borderColor: color + "60" } : {}}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: color }} />
          <div>
            <p className="text-[13px] font-semibold text-[#0A0A0A]">{label}</p>
            <p className="text-[11px] text-[#B5B5B5]">{service}</p>
          </div>
        </div>
        {connected && (
          <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: color + "15", color }}>
            <Check size={9} strokeWidth={3} />
            Connected
          </span>
        )}
      </div>
      <div className={`flex items-center gap-2 rounded-lg border px-3 bg-[#F8F8F8] transition-colors ${focused ? "border-[#DEDEDE]" : "border-[#EFEFEF]"}`}>
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent py-2.5 text-[12px] font-mono text-[#0A0A0A] placeholder-[#C0C0C0] outline-none"
          autoComplete="off"
          spellCheck={false}
        />
        <button onClick={() => setVisible((v) => !v)} className="text-[#C0C0C0] hover:text-[#737373] transition-colors">
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
      className={`relative h-5 w-9 rounded-full transition-colors ${enabled ? "bg-[#F97316]" : "bg-[#DEDEDE]"}`}
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
  const host = window.location.hostname;
  _settingsApiBase = (host === "localhost" || host === "127.0.0.1") ? direct : "/api";
  return _settingsApiBase;
}

// ── WhatsApp Business connect form (token-only) ────────────────────────────────

function WhatsAppForm({ onSuccess }: { onSuccess: () => void }) {
  const [token, setToken]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState("");
  const [showToken, setShowToken] = useState(false);

  const submit = async () => {
    if (!token) { setErr("Paste your WhatsApp Business System User token"); return; }
    setLoading(true); setErr("");
    try {
      await connectWhatsApp({ accessToken: token });
      onSuccess();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Connection failed — check the token");
    } finally { setLoading(false); }
  };

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-[#EFEFEF] bg-[#F8F8F8] p-4">
      <p className="text-[11px] text-[#737373] leading-relaxed">
        Paste your <strong>System User Access Token</strong> from Meta Business Manager.
        We&apos;ll auto-detect your WABA ID and phone number — no extra fields needed.
      </p>
      <div className="flex items-center gap-2 rounded-lg border border-[#EFEFEF] bg-white px-3">
        <input
          type={showToken ? "text" : "password"}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="EAAxxxxxxxxxxxxxx"
          className="flex-1 bg-transparent py-2 text-[12px] font-mono outline-none"
          autoComplete="off"
        />
        <button onClick={() => setShowToken((v) => !v)} className="text-[#C0C0C0] hover:text-[#737373]">
          {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
      {err && <p className="text-[11px] text-red-500">{err}</p>}
      <button onClick={submit} disabled={loading}
        className="w-full rounded-lg bg-[#25D366] py-2 text-[12px] font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
        {loading && <Loader2 size={13} className="animate-spin" />}
        {loading ? "Auto-detecting…" : "Connect WhatsApp Business"}
      </button>
    </div>
  );
}

// ── WhatsApp Embedded Signup (one-click Meta popup) ───────────────────────────

function WhatsAppEmbeddedSignup({ onSuccess }: { onSuccess: () => void }) {
  const { ready, error: sdkError } = useFacebookSDK(process.env.NEXT_PUBLIC_META_APP_ID);
  const [loading, setLoading]      = useState(false);
  const [err, setErr]              = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Ref to capture WA_EMBEDDED_SIGNUP postMessage data (arrives before FB.login callback)
  const embeddedDataRef = useRef<{ waba_id?: string; phone_number_id?: string } | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // Only accept messages from Meta domains
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      ) return;

      if (event.data?.type === "WA_EMBEDDED_SIGNUP") {
        if (event.data.event === "FINISH" || event.data.event === "FINISH_ONLY_WABA") {
          embeddedDataRef.current = event.data.data;
        } else if (event.data.event === "CANCEL") {
          setLoading(false);
          setErr("Signup was cancelled");
        }
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleClick = () => {
    const configId = process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID;
    if (!configId) {
      setErr("WHATSAPP_CONFIG_ID is not configured. Create one in Meta Developer Console → WhatsApp → Embedded Signup.");
      return;
    }
    if (!window.FB) {
      setErr("Facebook SDK not loaded — try refreshing the page.");
      return;
    }

    setErr("");
    setLoading(true);
    embeddedDataRef.current = null;

    window.FB.login(
      async (response) => {
        const code = response.authResponse?.code;
        if (!code) {
          setLoading(false);
          setErr("Login cancelled or no authorization received.");
          return;
        }

        // Wait briefly for postMessage data if not yet received
        let retries = 0;
        while (!embeddedDataRef.current && retries < 10) {
          await new Promise((r) => setTimeout(r, 200));
          retries++;
        }

        const embedded = embeddedDataRef.current;
        if (!embedded?.waba_id || !embedded?.phone_number_id) {
          setLoading(false);
          setErr("WhatsApp Business Account data not received. Please try again.");
          return;
        }

        try {
          await connectWhatsAppEmbedded({
            code,
            wabaId:        embedded.waba_id,
            phoneNumberId: embedded.phone_number_id,
          });
          onSuccess();
        } catch (e: unknown) {
          setErr(e instanceof Error ? e.message : "Connection failed");
        } finally {
          setLoading(false);
        }
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "",
          sessionInfoVersion: 2,
        },
      }
    );
  };

  const hasConfigId = !!process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID;

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-[#EFEFEF] bg-[#F8F8F8] p-4">
      {hasConfigId ? (
        <>
          <p className="text-[11px] text-[#737373] leading-relaxed">
            Connect your WhatsApp Business account in <strong>one click</strong>. A Meta popup will open
            where you can select your business and phone number — no API keys needed.
          </p>

          {sdkError && (
            <p className="text-[11px] text-amber-600">{sdkError}</p>
          )}

          <button
            onClick={handleClick}
            disabled={loading || !ready}
            className="w-full rounded-lg bg-[#25D366] py-2.5 text-[12px] font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                <MessageCircle size={13} />
                Connect WhatsApp Business
              </>
            )}
          </button>
        </>
      ) : (
        <p className="text-[11px] text-amber-600 leading-relaxed">
          <strong>Embedded Signup not configured.</strong> Set <code className="bg-amber-50 px-1 rounded">NEXT_PUBLIC_WHATSAPP_CONFIG_ID</code> in
          your <code className="bg-amber-50 px-1 rounded">.env.local</code> file. Create one at Meta Developer Console → WhatsApp → Embedded Signup.
          <br /><br />
          Meanwhile, you can use the manual token method below.
        </p>
      )}

      {err && <p className="text-[11px] text-red-500">{err}</p>}

      {/* Collapsible manual token fallback */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 text-[10px] text-[#B5B5B5] hover:text-[#737373] transition-colors"
      >
        <ChevronDown size={10} className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
        Advanced: paste token manually
      </button>
      {showAdvanced && <WhatsAppForm onSuccess={onSuccess} />}
    </div>
  );
}

// ── Instagram one-click connect ────────────────────────────────────────────────

function InstagramOAuthButton() {
  const handleClick = () => {
    window.location.href = "/api/auth/instagram/authorize";
  };

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-[#EFEFEF] bg-[#F8F8F8] p-4">
      <p className="text-[11px] text-[#737373] leading-relaxed">
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
    <div className="rounded-xl border border-[#EFEFEF] bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: color + "15" }}>
            {isWA
              ? <MessageCircle size={18} style={{ color }} />
              : <Instagram     size={18} style={{ color }} />}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#0A0A0A]">{label}</p>
            <p className="text-[11px] text-[#B5B5B5]">{sub}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: color + "15", color }}>
            <Check size={9} strokeWidth={3} /> Live
          </span>
          {isIG && (
            <button onClick={handleImport} disabled={importing}
              className="flex items-center gap-1 rounded-lg border border-[#EFEFEF] px-2.5 py-1.5 text-[11px] font-semibold text-[#737373] hover:border-[#C0C0C0] hover:text-[#0A0A0A] transition-colors disabled:opacity-50">
              {importing ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
              {importing ? "Importing…" : "Import Messages"}
            </button>
          )}
          <button onClick={handleDisconnect} disabled={disconnecting}
            className="flex items-center gap-1 rounded-lg border border-[#EFEFEF] px-2.5 py-1.5 text-[11px] font-semibold text-[#737373] hover:border-red-200 hover:text-red-500 transition-colors disabled:opacity-50">
            {disconnecting ? <Loader2 size={11} className="animate-spin" /> : <Unlink size={11} />}
            Disconnect
          </button>
        </div>
      </div>
      {isWA && (
        <p className="text-[10px] text-[#B5B5B5] leading-relaxed px-1">
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
  const [expand, setExpand]           = useState<"whatsapp" | "instagram" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setConnections(await getPlatformConnections()); }
    catch { setConnections([]); /* server may be offline */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isWAConnected = connections.some((c) => c.platform === "whatsapp" || c.platform === "whatsapp_business");
  const isIGConnected = connections.some((c) => c.platform === "instagram" || c.platform === "instagram_dm");

  const PLATFORMS = [
    {
      id: "whatsapp" as const,
      label: "WhatsApp Business",
      sub: "One-click setup · receive customer DMs in real-time",
      color: "#25D366",
      Icon: MessageCircle,
      connected: isWAConnected,
    },
    {
      id: "instagram" as const,
      label: "Instagram DMs",
      sub: "Auto-connected on login · reconnect to refresh permissions",
      color: "#E1306C",
      Icon: Instagram,
      connected: isIGConnected,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white border border-[#EFEFEF] p-5">
        <h2 className="text-[14px] font-bold mb-1">Connected Platforms</h2>
        <p className="text-[11px] text-[#B5B5B5] mb-4">
          Platforms auto-connect when you log in. Upgrade to receive real-time customer DMs.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-[#B5B5B5]" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Active connections */}
            {connections.map((conn) => (
              <ConnectedCard key={conn.id} conn={conn} onDisconnect={load} />
            ))}

            {/* Not-yet-connected platforms */}
            {PLATFORMS.filter((p) => !p.connected).map(({ id, label, sub, color, Icon }) => (
              <div key={id}>
                <button
                  onClick={() => setExpand((prev) => prev === id ? null : id)}
                  className="w-full flex items-center justify-between rounded-xl border border-dashed border-[#DEDEDE] px-4 py-3 hover:border-[#C0C0C0] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8F8F8] group-hover:bg-white transition-colors">
                      <Icon size={16} style={{ color }} />
                    </div>
                    <div className="text-left">
                      <p className="text-[12px] font-semibold text-[#0A0A0A]">{label}</p>
                      <p className="text-[10px] text-[#B5B5B5] max-w-xs">{sub}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-[#EFEFEF] px-3 py-1.5 text-[11px] font-semibold text-[#737373] group-hover:border-[#DEDEDE] flex-shrink-0">
                    <Link2 size={11} />
                    {expand === id ? "Cancel" : "Connect"}
                  </div>
                </button>

                {expand === id && id === "whatsapp" && (
                  <WhatsAppEmbeddedSignup onSuccess={() => { load(); setExpand(null); }} />
                )}
                {expand === id && id === "instagram" && (
                  <InstagramOAuthButton />
                )}
              </div>
            ))}
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight">Settings</h1>
        <p className="mt-0.5 text-[13px] text-[#737373]">Manage your agency preferences and integrations</p>
      </div>

      <div className="flex gap-5">
        {/* Section tabs */}
        <div className="w-44 flex-shrink-0">
          <div className="flex flex-col gap-1">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setSection(id)}
                className={[
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium text-left transition-all",
                  section === id ? "bg-white border border-[#EFEFEF] text-[#0A0A0A] shadow-sm" : "text-[#737373] hover:bg-white hover:text-[#0A0A0A]",
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
              <div className="rounded-2xl bg-white border border-[#EFEFEF] p-6">
                <h2 className="text-[14px] font-bold mb-4">Agency Profile</h2>
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF3EE] border border-[#FFD9C4]">
                    <span className="text-xl font-black text-[#F97316]">A</span>
                  </div>
                  <div>
                    <p className="text-[15px] font-bold">Agency</p>
                    <p className="text-[12px] text-[#B5B5B5]">yappaflow.com</p>
                  </div>
                  <button className="ml-auto rounded-lg border border-[#EFEFEF] px-3 py-1.5 text-[12px] font-semibold text-[#737373] hover:bg-[#F8F8F8]">
                    Edit
                  </button>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Agency Name", value: "Yappaflow Agency" },
                    { label: "Email",       value: "agency@yappaflow.com" },
                    { label: "Phone",       value: "+90 555 000 00 00" },
                  ].map((f) => (
                    <div key={f.label} className="flex items-center justify-between py-2 border-b border-[#F5F5F5] last:border-0">
                      <span className="text-[12px] text-[#737373]">{f.label}</span>
                      <span className="text-[12px] font-semibold text-[#0A0A0A]">{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-[#EFEFEF] p-5">
                <h2 className="text-[14px] font-bold mb-3">Language</h2>
                <div className="flex gap-2 rounded-xl border border-[#EFEFEF] bg-[#F8F8F8] p-1 w-fit">
                  {(["tr", "en"] as const).map((l) => (
                    <button key={l} onClick={() => setLang(l)}
                      className={[
                        "rounded-lg px-5 py-2 text-[13px] font-semibold transition-all",
                        lang === l ? "bg-white text-[#0A0A0A] shadow-sm border border-[#EFEFEF]" : "text-[#737373]",
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
            <div className="rounded-2xl bg-[#F8F8F8] border border-[#EFEFEF] p-5">
              <h2 className="text-[14px] font-bold mb-4">API Integrations</h2>
              <div className="grid grid-cols-1 gap-3">
                {API_FIELDS.map((f) => (
                  <ApiKeyField key={f.id} label={f.label} service={f.service} placeholder={f.placeholder} color={f.color} />
                ))}
              </div>
            </div>
          )}

          {section === "notif" && (
            <div className="rounded-2xl bg-white border border-[#EFEFEF] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#F5F5F5]">
                <h2 className="text-[14px] font-bold">Notification Preferences</h2>
              </div>
              {PREFERENCES.map((pref, i) => (
                <div key={pref.id}
                  className={[
                    "flex items-center justify-between px-5 py-4",
                    i < PREFERENCES.length - 1 ? "border-b border-[#F5F5F5]" : "",
                  ].join(" ")}
                >
                  <div>
                    <p className="text-[13px] font-semibold text-[#0A0A0A]">{pref.label}</p>
                    <p className="text-[11px] text-[#B5B5B5] mt-0.5">{pref.desc}</p>
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
