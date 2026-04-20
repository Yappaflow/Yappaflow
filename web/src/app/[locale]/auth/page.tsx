"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  MessageCircle,
  Instagram,
  ArrowLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  loginWithEmail,
  registerWithEmail,
  requestWhatsappOtp,
  verifyWhatsappOtp,
  requestPhoneVerification,
  verifyPhone,
  getInstagramAuthUrl,
  establishSession,
} from "@/lib/auth-api";

type Step =
  | "choose"
  | "email"
  | "whatsapp_phone"
  | "whatsapp_otp"
  | "phone_verify"
  | "phone_otp";

/* ── Shared dark input style ── */
const inputCls =
  "w-full rounded-lg bg-white/[0.03] border border-white/[0.06] px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange/40";

const cardCls = "bg-[#0c0c0f] border border-white/[0.06] rounded-xl p-8";

export default function AuthPage() {
  const t = useTranslations("auth");
  const router = useRouter();

  const [step, setStep] = useState<Step>("choose");
  const [emailMode, setEmailMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const [authToken, setAuthToken] = useState("");
  const [needsPhone, setNeedsPhone] = useState(false);

  function clearError() { setError(""); }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault(); clearError(); setLoading(true);
    try {
      let data;
      if (emailMode === "login") {
        data = await loginWithEmail(email, password);
        const result = data.loginWithEmail;
        setAuthToken(result.token);
        if (!result.user.phoneVerified) { setNeedsPhone(true); setStep("phone_verify"); }
        else { storeTokenAndRedirect(result.token); }
      } else {
        data = await registerWithEmail(email, password, name);
        const result = data.registerWithEmail;
        setAuthToken(result.token); setNeedsPhone(true); setStep("phone_verify");
      }
    } catch (err: unknown) { setError(err instanceof Error ? err.message : t("errorGeneric")); }
    finally { setLoading(false); }
  }

  async function handleSendWhatsappOtp(e: React.FormEvent) {
    e.preventDefault(); clearError(); setLoading(true);
    try { await requestWhatsappOtp(phone); setStep("whatsapp_otp"); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : t("errorGeneric")); }
    finally { setLoading(false); }
  }

  async function handleVerifyWhatsappOtp(e: React.FormEvent) {
    e.preventDefault(); clearError(); setLoading(true);
    try {
      const data = await verifyWhatsappOtp(phone, otp);
      const result = data.verifyWhatsappOtp;
      storeTokenAndRedirect(result.token);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : t("errorInvalid")); }
    finally { setLoading(false); }
  }

  async function handleSendPhoneOtp(e: React.FormEvent) {
    e.preventDefault(); clearError(); setLoading(true);
    try { await requestPhoneVerification(phone, authToken); setStep("phone_otp"); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : t("errorGeneric")); }
    finally { setLoading(false); }
  }

  async function handleVerifyPhone(e: React.FormEvent) {
    e.preventDefault(); clearError(); setLoading(true);
    try { await verifyPhone(phone, otp, authToken); storeTokenAndRedirect(authToken); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : t("errorInvalid")); }
    finally { setLoading(false); }
  }

  async function storeTokenAndRedirect(token: string) {
    localStorage.setItem("yappaflow_token", token);
    // Set the httpOnly session cookie — Next middleware checks it before
    // rendering /dashboard, so we must wait before navigating.
    await establishSession(token);

    // Prefer ?next=<path> when present (middleware set it after an earlier
    // redirect). Hard-navigate with window.location — router.push() does a
    // soft (client) navigation that can skip a fresh cookie check on the
    // edge in some runtimes, which is exactly the loop we're trying to
    // escape here.
    let nextPath = "/dashboard";
    if (typeof window !== "undefined") {
      const urlNext = new URLSearchParams(window.location.search).get("next");
      if (urlNext && urlNext.startsWith("/")) nextPath = urlNext;
      // Compose with the current locale — useRouter is locale-aware,
      // window.location.assign is not, so prefix explicitly.
      const pathWithLocale =
        /^\/(en|tr)(\/|$)/.test(nextPath)
          ? nextPath
          : `/${document.documentElement.lang || "en"}${nextPath.startsWith("/") ? "" : "/"}${nextPath}`;
      window.location.assign(pathWithLocale);
    } else {
      router.push(nextPath);
    }
  }

  return (
    <div className="min-h-screen bg-brand-dark flex">
      {/* Atmosphere */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[30%] left-[20%] w-[600px] h-[400px] rounded-full bg-brand-orange/[0.03] blur-[200px]" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44IiBudW1PY3RhdmVzPSI0IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==")`,
            backgroundRepeat: "repeat",
          }}
        />
      </div>

      {/* Left — branding */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative z-10 p-12">
        <div>
          <h1 className="font-heading text-6xl xl:text-7xl uppercase tracking-tight text-white leading-[0.9]">
            From<br />Conversation<br />
            <span className="text-brand-orange">To Code.</span>
          </h1>
          <p className="mt-6 text-sm text-white/25 max-w-xs leading-relaxed">
            The entire web agency pipeline — automated by AI. Listen. Build. Ship.
          </p>
        </div>
      </div>

      {/* Right — auth form */}
      <div className="flex-1 flex items-center justify-center relative z-10 p-4 sm:p-8">
        <div className="max-w-md w-full">
          {/* Logo */}
          <a href="/">
            <div className="flex justify-center mb-8">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-orange">
                  <span className="text-sm font-bold text-white">Y</span>
                </div>
                <span className="font-heading text-lg uppercase tracking-tight text-white">Yappaflow</span>
              </div>
            </div>
          </a>

          <AnimatePresence mode="wait">
            {/* ── CHOOSE ── */}
            {step === "choose" && (
              <motion.div key="choose" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={cardCls}>
                <h1 className="text-xl font-bold text-white text-center">{t("loginTitle")}</h1>
                <p className="mt-2 text-center text-white/30 text-sm">{t("loginSubtitle")}</p>

                <div className="mt-8 space-y-3">
                  <button onClick={() => setStep("whatsapp_phone")}
                    className="w-full flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 hover:bg-white/[0.05] transition-colors text-white/80 font-medium">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#25D366] text-white">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <span>{t("whatsapp")}</span>
                  </button>

                  <a href={getInstagramAuthUrl()}
                    className="w-full flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 hover:bg-white/[0.05] transition-colors text-white/80 font-medium">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-white">
                      <Instagram className="h-5 w-5" />
                    </div>
                    <span>{t("instagram")}</span>
                  </a>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-white/[0.06]" />
                    <span className="text-xs text-white/20">{t("or")}</span>
                    <div className="flex-1 h-px bg-white/[0.06]" />
                  </div>

                  <button onClick={() => setStep("email")}
                    className="w-full flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 hover:bg-white/[0.05] transition-colors text-white/80 font-medium">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06]">
                      <Mail className="h-5 w-5 text-white/50" />
                    </div>
                    <span>{t("email")}</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── EMAIL ── */}
            {step === "email" && (
              <motion.div key="email" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={cardCls}>
                <button onClick={() => { setStep("choose"); clearError(); }}
                  className="flex items-center gap-1 text-sm text-white/30 hover:text-white mb-6">
                  <ArrowLeft className="h-4 w-4" /> {t("back")}
                </button>
                <h2 className="text-xl font-bold text-white">{emailMode === "login" ? t("signIn") : t("createAccount")}</h2>

                <form onSubmit={handleEmailSubmit} className="mt-6 space-y-4">
                  {emailMode === "register" && (
                    <div>
                      <label className="block text-xs font-medium text-white/40 mb-1.5">{t("nameLabel")}</label>
                      <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} className={inputCls} />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-white/40 mb-1.5">{t("emailLabel")}</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("emailPlaceholder")} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/40 mb-1.5">{t("passwordLabel")}</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("passwordPlaceholder")} className={`${inputCls} pr-12`} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <button type="submit" className="w-full bg-brand-orange text-white py-3 rounded-lg font-medium hover:bg-brand-orange-dark transition-colors text-sm">
                    {loading ? "..." : emailMode === "login" ? t("signIn") : t("createAccount")}
                  </button>
                </form>

                <p className="mt-4 text-center text-sm text-white/25">
                  {emailMode === "login" ? t("noAccount") : t("hasAccount")}{" "}
                  <button onClick={() => { setEmailMode(emailMode === "login" ? "register" : "login"); clearError(); }}
                    className="font-semibold text-brand-orange hover:underline">
                    {emailMode === "login" ? t("switchToRegister") : t("switchToLogin")}
                  </button>
                </p>
              </motion.div>
            )}

            {/* ── WHATSAPP PHONE ── */}
            {step === "whatsapp_phone" && (
              <motion.div key="wa_phone" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={cardCls}>
                <button onClick={() => { setStep("choose"); clearError(); }}
                  className="flex items-center gap-1 text-sm text-white/30 hover:text-white mb-6">
                  <ArrowLeft className="h-4 w-4" /> {t("back")}
                </button>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#25D366] text-white mb-4">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-white">{t("whatsappTitle")}</h2>
                <p className="mt-1 text-sm text-white/30">{t("whatsappSubtitle")}</p>

                <form onSubmit={handleSendWhatsappOtp} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-white/40 mb-1.5">{t("phoneLabel")}</label>
                    <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("phonePlaceholder")} className={inputCls} />
                  </div>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <button type="submit" className="w-full bg-brand-orange text-white py-3 rounded-lg font-medium hover:bg-brand-orange-dark transition-colors text-sm">
                    {loading ? "..." : t("sendCode")}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── WHATSAPP OTP ── */}
            {step === "whatsapp_otp" && (
              <OtpStep title={t("otpTitle")} subtitle={t("otpSubtitle", { phone })} otp={otp} setOtp={setOtp} error={error} loading={loading}
                onSubmit={handleVerifyWhatsappOtp} onBack={() => { setStep("whatsapp_phone"); setOtp(""); clearError(); }}
                onResend={() => requestWhatsappOtp(phone)} t={t} />
            )}

            {/* ── PHONE VERIFY ── */}
            {step === "phone_verify" && (
              <motion.div key="phone_verify" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={cardCls}>
                <h2 className="text-xl font-bold text-white">{t("phoneVerifyTitle")}</h2>
                <p className="mt-1 text-sm text-white/30">{t("phoneVerifySubtitle")}</p>
                <p className="mt-1 text-xs text-white/15">{t("phoneSmsNote")}</p>

                <form onSubmit={handleSendPhoneOtp} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-white/40 mb-1.5">{t("phoneLabel")}</label>
                    <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("phonePlaceholder")} className={inputCls} />
                  </div>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <button type="submit" className="w-full bg-brand-orange text-white py-3 rounded-lg font-medium hover:bg-brand-orange-dark transition-colors text-sm">
                    {loading ? "..." : t("sendCode")}
                  </button>
                </form>
                {needsPhone && (
                  <button onClick={() => storeTokenAndRedirect(authToken)}
                    className="mt-3 w-full text-center text-sm text-white/20 hover:text-white/40">
                    {t("skip")}
                  </button>
                )}
              </motion.div>
            )}

            {/* ── PHONE OTP ── */}
            {step === "phone_otp" && (
              <OtpStep title={t("otpTitle")} subtitle={t("otpSubtitle", { phone })} otp={otp} setOtp={setOtp} error={error} loading={loading}
                onSubmit={handleVerifyPhone} onBack={() => { setStep("phone_verify"); setOtp(""); clearError(); }}
                onResend={() => requestPhoneVerification(phone, authToken)} t={t} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function OtpStep({ title, subtitle, otp, setOtp, error, loading, onSubmit, onBack, onResend, t }: {
  title: string; subtitle: string; otp: string; setOtp: (v: string) => void;
  error: string; loading: boolean; onSubmit: (e: React.FormEvent) => void;
  onBack: () => void; onResend: () => void; t: ReturnType<typeof useTranslations>;
}) {
  return (
    <motion.div key="otp" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={cardCls}>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-white/30 hover:text-white mb-6">
        <ArrowLeft className="h-4 w-4" /> {t("back")}
      </button>
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <p className="mt-1 text-sm text-white/30">{subtitle}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-white/40 mb-1.5">{t("otpLabel")}</label>
          <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder={t("otpPlaceholder")}
            className={`${inputCls} text-center text-2xl tracking-[0.5em] font-mono`} />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" className="w-full bg-brand-orange text-white py-3 rounded-lg font-medium hover:bg-brand-orange-dark transition-colors text-sm">
          {loading ? "..." : t("verify")}
        </button>
      </form>
      <button onClick={onResend} className="mt-3 w-full text-center text-sm text-white/20 hover:text-brand-orange">
        {t("resend")}
      </button>
    </motion.div>
  );
}
