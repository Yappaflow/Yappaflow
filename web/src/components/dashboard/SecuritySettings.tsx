"use client";

/**
 * Security settings — currently just MFA (TOTP) management.
 *
 * State machine:
 *   "loading"      → fetching `me` so we know whether MFA is on
 *   "idle-off"     → MFA disabled. Primary CTA: "Enable MFA"
 *   "enrolling"    → QR + manual secret shown. Primary CTA: enter code to confirm
 *   "codes"        → freshly generated backup codes shown once. User must copy.
 *   "idle-on"      → MFA enabled. Options: disable / regenerate codes
 *   "confirm-off"  → user clicked Disable; confirm with current TOTP
 *   "regenerate"   → user clicked Regenerate; confirm with current TOTP
 *
 * All sensitive calls (enable/disable/regenerate) require a fresh TOTP
 * code from the user — the server re-verifies every time.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Shield,
  ShieldCheck,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  Download,
  RefreshCw,
  X,
} from "lucide-react";
import {
  fetchMe,
  mfaInit,
  mfaEnable,
  mfaDisable,
  mfaRegenerateBackupCodes,
  type AuthUser,
} from "@/lib/auth-api";

type Mode =
  | "loading"
  | "idle-off"
  | "enrolling"
  | "codes"
  | "idle-on"
  | "confirm-off"
  | "regenerate";

function useAuthToken(): string | null {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(localStorage.getItem("yappaflow_token"));
    }
  }, []);
  return token;
}

export function SecuritySettings() {
  const token = useAuthToken();
  const [mode, setMode] = useState<Mode>("loading");
  const [me, setMe] = useState<AuthUser | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Enrollment state
  const [setup, setSetup] = useState<{
    secret: string;
    otpauthUrl: string;
    qrDataUrl: string;
  } | null>(null);
  const [enrollCode, setEnrollCode] = useState("");

  // Backup-code display
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Disable / regenerate confirmation
  const [confirmCode, setConfirmCode] = useState("");

  // ── Initial load ────────────────────────────────────────────────
  const refreshMe = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchMe(token);
      setMe(data.me);
      setMode(data.me?.mfaEnabled ? "idle-on" : "idle-off");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load account");
    }
  }, [token]);

  useEffect(() => {
    if (token) refreshMe();
  }, [token, refreshMe]);

  // ── Actions ─────────────────────────────────────────────────────
  async function startEnrollment() {
    if (!token) return;
    setError("");
    setBusy(true);
    try {
      const data = await mfaInit(token);
      setSetup(data.mfaInit);
      setEnrollCode("");
      setMode("enrolling");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start enrollment");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnrollment(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError("");
    setBusy(true);
    try {
      const data = await mfaEnable(enrollCode.trim(), token);
      setBackupCodes(data.mfaEnable.backupCodes);
      setSetup(null);
      setEnrollCode("");
      setMode("codes");
      await refreshMe();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  async function doDisable(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError("");
    setBusy(true);
    try {
      await mfaDisable(confirmCode.trim(), token);
      setConfirmCode("");
      await refreshMe();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  async function doRegenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError("");
    setBusy(true);
    try {
      const data = await mfaRegenerateBackupCodes(confirmCode.trim(), token);
      setBackupCodes(data.mfaRegenerateBackupCodes.backupCodes);
      setConfirmCode("");
      setMode("codes");
      await refreshMe();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  // ── Backup-code helpers ─────────────────────────────────────────
  function copyAll() {
    if (!backupCodes) return;
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  }

  function downloadCodes() {
    if (!backupCodes) return;
    const body =
      `Yappaflow — Multi-Factor Authentication Backup Codes\n` +
      `Generated ${new Date().toISOString()}\n` +
      `Account: ${me?.email || me?.phone || ""}\n\n` +
      `Each code can be used ONCE. Store them somewhere safe — anyone\n` +
      `with a code can bypass your authenticator app.\n\n` +
      backupCodes.map((c, i) => `${String(i + 1).padStart(2, "0")}.  ${c}`).join("\n") +
      `\n`;
    const blob = new Blob([body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yappaflow-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function acknowledgeCodes() {
    setBackupCodes(null);
    setCopiedAll(false);
    refreshMe();
  }

  // ── Render ──────────────────────────────────────────────────────
  if (mode === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="px-8 py-8 max-w-3xl">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield size={20} className="text-brand-orange" />
          Security
        </h1>
        <p className="mt-1 text-sm text-white/40">
          Protect your account with multi-factor authentication.
        </p>
      </header>

      {/* ── Current status card ── */}
      <section className="rounded-2xl border border-white/[0.06] bg-[#0c0c0f] p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={[
                "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0",
                me?.mfaEnabled
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-white/[0.04] text-white/40",
              ].join(" ")}
            >
              {me?.mfaEnabled ? <ShieldCheck size={18} /> : <Shield size={18} />}
            </div>
            <div>
              <p className="text-[15px] font-semibold text-white">
                Two-factor authentication (TOTP)
              </p>
              <p className="mt-0.5 text-[12px] text-white/40">
                {me?.mfaEnabled
                  ? `Active — ${me.mfaBackupCodesRemaining ?? 0} backup code${
                      (me.mfaBackupCodesRemaining ?? 0) === 1 ? "" : "s"
                    } remaining`
                  : "Not enabled — your account is protected only by your password."}
              </p>
            </div>
          </div>
          <span
            className={[
              "text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1",
              me?.mfaEnabled
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-white/[0.04] text-white/30",
            ].join(" ")}
          >
            {me?.mfaEnabled ? "On" : "Off"}
          </span>
        </div>

        {/* ── MFA disabled: show enable CTA ── */}
        {mode === "idle-off" && (
          <div className="mt-6">
            <p className="text-[13px] text-white/50 leading-relaxed">
              Use an authenticator app (Google Authenticator, Authy, 1Password,
              Microsoft Authenticator) to generate a rotating 6-digit code
              that&apos;s required at every login. You&apos;ll also get 10
              single-use backup codes in case you lose your phone.
            </p>
            <button
              onClick={startEnrollment}
              disabled={busy}
              className="mt-4 rounded-lg bg-brand-orange text-white px-4 py-2.5 text-[13px] font-medium hover:bg-brand-orange-dark transition-colors disabled:opacity-50"
            >
              {busy ? "..." : "Enable MFA"}
            </button>
          </div>
        )}

        {/* ── Enrollment: QR + verify ── */}
        {mode === "enrolling" && setup && (
          <div className="mt-6 space-y-5">
            <ol className="text-[13px] text-white/60 space-y-2 list-decimal list-inside">
              <li>Open your authenticator app and add a new account.</li>
              <li>
                Scan the QR code below, or paste the secret manually.
              </li>
              <li>Enter the 6-digit code the app generates.</li>
            </ol>

            <div className="flex items-start gap-5">
              <div className="rounded-xl bg-white p-3 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={setup.qrDataUrl}
                  alt="Scan with your authenticator app"
                  width={200}
                  height={200}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">
                  Or paste this secret
                </p>
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-black/40 border border-white/[0.06] px-3 py-2.5">
                  <code className="flex-1 font-mono text-[12px] text-white break-all">
                    {setup.secret}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(setup.secret)}
                    className="text-white/30 hover:text-white transition-colors flex-shrink-0"
                    title="Copy secret"
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <p className="mt-3 text-[11px] text-white/30 leading-relaxed">
                  Account: <span className="text-white/60">{me?.email || me?.phone}</span>
                  <br />
                  Issuer: <span className="text-white/60">Yappaflow</span>
                </p>
              </div>
            </div>

            <form onSubmit={confirmEnrollment} className="space-y-3">
              <label className="block text-[11px] font-medium uppercase tracking-wider text-white/40">
                Verification code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
                value={enrollCode}
                onChange={(e) => setEnrollCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-48 rounded-lg bg-black/40 border border-white/[0.08] px-4 py-3 text-center font-mono text-xl tracking-[0.4em] text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-brand-orange/30"
              />
              {error && (
                <p className="text-[12px] text-red-400 flex items-center gap-1.5">
                  <AlertTriangle size={12} /> {error}
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={busy || enrollCode.length !== 6}
                  className="rounded-lg bg-brand-orange text-white px-4 py-2.5 text-[13px] font-medium hover:bg-brand-orange-dark transition-colors disabled:opacity-50"
                >
                  {busy ? "Verifying..." : "Verify & enable"}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("idle-off"); setSetup(null); setError(""); }}
                  className="rounded-lg bg-white/[0.04] text-white/60 px-4 py-2.5 text-[13px] font-medium hover:bg-white/[0.08] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── MFA on, idle ── */}
        {mode === "idle-on" && (
          <div className="mt-6 space-y-2">
            <button
              onClick={() => { setMode("regenerate"); setConfirmCode(""); setError(""); }}
              className="w-full flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 hover:bg-white/[0.05] transition-colors text-left"
            >
              <RefreshCw size={15} className="text-white/50" />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-white">Regenerate backup codes</p>
                <p className="text-[11px] text-white/30">
                  Invalidates your current codes and issues 10 new ones.
                </p>
              </div>
            </button>
            <button
              onClick={() => { setMode("confirm-off"); setConfirmCode(""); setError(""); }}
              className="w-full flex items-center gap-3 rounded-lg border border-red-500/10 bg-red-500/[0.03] px-4 py-3 hover:bg-red-500/[0.07] transition-colors text-left"
            >
              <X size={15} className="text-red-400" />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-red-400">Disable MFA</p>
                <p className="text-[11px] text-red-400/50">
                  Removes the second factor from your account.
                </p>
              </div>
            </button>
          </div>
        )}

        {/* ── Confirm disable ── */}
        {mode === "confirm-off" && (
          <form onSubmit={doDisable} className="mt-6 space-y-3">
            <p className="text-[13px] text-white/60">
              Enter a current 6-digit code from your authenticator to confirm
              disabling MFA.
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="w-48 rounded-lg bg-black/40 border border-white/[0.08] px-4 py-3 text-center font-mono text-xl tracking-[0.4em] text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-red-400/30"
            />
            {error && (
              <p className="text-[12px] text-red-400 flex items-center gap-1.5">
                <AlertTriangle size={12} /> {error}
              </p>
            )}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={busy || confirmCode.length !== 6}
                className="rounded-lg bg-red-500 text-white px-4 py-2.5 text-[13px] font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {busy ? "Disabling..." : "Disable MFA"}
              </button>
              <button
                type="button"
                onClick={() => { setMode("idle-on"); setConfirmCode(""); setError(""); }}
                className="rounded-lg bg-white/[0.04] text-white/60 px-4 py-2.5 text-[13px] font-medium hover:bg-white/[0.08] transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* ── Confirm regenerate ── */}
        {mode === "regenerate" && (
          <form onSubmit={doRegenerate} className="mt-6 space-y-3">
            <p className="text-[13px] text-white/60">
              Enter a current 6-digit code from your authenticator to
              generate fresh backup codes. Your existing codes will stop working.
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="w-48 rounded-lg bg-black/40 border border-white/[0.08] px-4 py-3 text-center font-mono text-xl tracking-[0.4em] text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-brand-orange/30"
            />
            {error && (
              <p className="text-[12px] text-red-400 flex items-center gap-1.5">
                <AlertTriangle size={12} /> {error}
              </p>
            )}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={busy || confirmCode.length !== 6}
                className="rounded-lg bg-brand-orange text-white px-4 py-2.5 text-[13px] font-medium hover:bg-brand-orange-dark transition-colors disabled:opacity-50"
              >
                {busy ? "..." : "Generate new codes"}
              </button>
              <button
                type="button"
                onClick={() => { setMode("idle-on"); setConfirmCode(""); setError(""); }}
                className="rounded-lg bg-white/[0.04] text-white/60 px-4 py-2.5 text-[13px] font-medium hover:bg-white/[0.08] transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {/* ── Fresh backup-codes modal — render last so it overlays ── */}
      {mode === "codes" && backupCodes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="max-w-md w-full rounded-2xl border border-white/[0.08] bg-[#0c0c0f] p-6">
            <div className="flex items-center gap-2 text-brand-orange mb-3">
              <AlertTriangle size={16} />
              <h3 className="text-[14px] font-bold uppercase tracking-wider">
                Save these codes now
              </h3>
            </div>
            <p className="text-[13px] text-white/60 leading-relaxed">
              These backup codes will <strong>not be shown again</strong>.
              Store them somewhere safe — a password manager is ideal. Each
              code can be used once if you lose access to your authenticator.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-[13px] text-white bg-black/40 border border-white/[0.06] rounded-lg p-4">
              {backupCodes.map((code) => (
                <code key={code} className="tracking-[0.1em]">
                  {code}
                </code>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={copyAll}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/80 px-4 py-2.5 text-[13px] font-medium hover:bg-white/[0.08] transition-colors"
              >
                {copiedAll ? <Check size={14} /> : <Copy size={14} />}
                {copiedAll ? "Copied" : "Copy all"}
              </button>
              <button
                onClick={downloadCodes}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/80 px-4 py-2.5 text-[13px] font-medium hover:bg-white/[0.08] transition-colors"
              >
                <Download size={14} />
                Download
              </button>
            </div>

            <button
              onClick={acknowledgeCodes}
              className="mt-3 w-full rounded-lg bg-brand-orange text-white px-4 py-2.5 text-[13px] font-medium hover:bg-brand-orange-dark transition-colors"
            >
              I&apos;ve saved my codes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
