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
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import {
  loginWithEmail,
  registerWithEmail,
  requestWhatsappOtp,
  verifyWhatsappOtp,
  requestPhoneVerification,
  verifyPhone,
  getInstagramAuthUrl,
} from "@/lib/auth-api";

type Step =
  | "choose"
  | "email"
  | "whatsapp_phone"
  | "whatsapp_otp"
  | "phone_verify"
  | "phone_otp";

export default function AuthPage() {
  const t = useTranslations("auth");
  const router = useRouter();

  const [step, setStep] = useState<Step>("choose");
  const [emailMode, setEmailMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Field state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  // After login we store token + userId for phone verification step
  const [authToken, setAuthToken] = useState("");
  const [needsPhone, setNeedsPhone] = useState(false);

  function clearError() {
    setError("");
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setLoading(true);
    try {
      let data;
      if (emailMode === "login") {
        data = await loginWithEmail(email, password);
        const result = data.loginWithEmail;
        setAuthToken(result.token);
        if (!result.user.phoneVerified) {
          setNeedsPhone(true);
          setStep("phone_verify");
        } else {
          storeTokenAndRedirect(result.token);
        }
      } else {
        data = await registerWithEmail(email, password, name);
        const result = data.registerWithEmail;
        setAuthToken(result.token);
        setNeedsPhone(true);
        setStep("phone_verify");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSendWhatsappOtp(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setLoading(true);
    try {
      await requestWhatsappOtp(phone);
      setStep("whatsapp_otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyWhatsappOtp(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setLoading(true);
    try {
      const data = await verifyWhatsappOtp(phone, otp);
      const result = data.verifyWhatsappOtp;
      setAuthToken(result.token);
      // WhatsApp OTP = phone already verified, go to dashboard
      storeTokenAndRedirect(result.token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("errorInvalid"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSendPhoneOtp(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setLoading(true);
    try {
      await requestPhoneVerification(phone, authToken);
      setStep("phone_otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyPhone(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setLoading(true);
    try {
      await verifyPhone(phone, otp, authToken);
      storeTokenAndRedirect(authToken);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("errorInvalid"));
    } finally {
      setLoading(false);
    }
  }

  function storeTokenAndRedirect(token: string) {
    localStorage.setItem("yappaflow_token", token);
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-brand-gray-50 flex items-center justify-center p-4">
      <Container className="max-w-md w-full">
        {/* Logo */}
        <a href="/">
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-black">
                <span className="text-lg font-bold text-white">Y</span>
              </div>
              <span className="text-xl font-bold">Yappaflow</span>
            </div>
          </div>
        </a>

        <AnimatePresence mode="wait">
          {/* ── CHOOSE ── */}
          {step === "choose" && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-card p-8"
            >
              <h1 className="text-2xl font-bold text-center">
                {t("loginTitle")}
              </h1>
              <p className="mt-2 text-center text-gray-500 text-sm">
                {t("loginSubtitle")}
              </p>

              <div className="mt-8 space-y-3">
                <button
                  onClick={() => setStep("whatsapp_phone")}
                  className="w-full flex items-center gap-3 rounded-xl border border-brand-gray-200 px-4 py-3.5 hover:bg-brand-gray-50 transition-colors font-medium"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#25D366] text-white">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <span>{t("whatsapp")}</span>
                </button>

                <a
                  href={getInstagramAuthUrl()}
                  className="w-full flex items-center gap-3 rounded-xl border border-brand-gray-200 px-4 py-3.5 hover:bg-brand-gray-50 transition-colors font-medium"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-white">
                    <Instagram className="h-5 w-5" />
                  </div>
                  <span>{t("instagram")}</span>
                </a>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-brand-gray-200" />
                  <span className="text-xs text-gray-400">{t("or")}</span>
                  <div className="flex-1 h-px bg-brand-gray-200" />
                </div>

                <button
                  onClick={() => setStep("email")}
                  className="w-full flex items-center gap-3 rounded-xl border border-brand-gray-200 px-4 py-3.5 hover:bg-brand-gray-50 transition-colors font-medium"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gray-100">
                    <Mail className="h-5 w-5 text-brand-gray-900" />
                  </div>
                  <span>{t("email")}</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* ── EMAIL ── */}
          {step === "email" && (
            <motion.div
              key="email"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-card p-8"
            >
              <button
                onClick={() => {
                  setStep("choose");
                  clearError();
                }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-black mb-6"
              >
                <ArrowLeft className="h-4 w-4" /> {t("back")}
              </button>

              <h2 className="text-2xl font-bold">
                {emailMode === "login" ? t("signIn") : t("createAccount")}
              </h2>

              <form onSubmit={handleEmailSubmit} className="mt-6 space-y-4">
                {emailMode === "register" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t("nameLabel")}
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("namePlaceholder")}
                      className="w-full rounded-xl border border-brand-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-black/20"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t("emailLabel")}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("emailPlaceholder")}
                    className="w-full rounded-xl border border-brand-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-black/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t("passwordLabel")}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("passwordPlaceholder")}
                      className="w-full rounded-xl border border-brand-gray-200 px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-brand-black/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <Button className="w-full" size="lg" onClick={() => {}}>
                  {loading
                    ? "..."
                    : emailMode === "login"
                      ? t("signIn")
                      : t("createAccount")}
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-gray-500">
                {emailMode === "login" ? t("noAccount") : t("hasAccount")}{" "}
                <button
                  onClick={() => {
                    setEmailMode(emailMode === "login" ? "register" : "login");
                    clearError();
                  }}
                  className="font-semibold text-brand-black hover:underline"
                >
                  {emailMode === "login"
                    ? t("switchToRegister")
                    : t("switchToLogin")}
                </button>
              </p>
            </motion.div>
          )}

          {/* ── WHATSAPP PHONE ── */}
          {step === "whatsapp_phone" && (
            <motion.div
              key="wa_phone"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-card p-8"
            >
              <button
                onClick={() => {
                  setStep("choose");
                  clearError();
                }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-black mb-6"
              >
                <ArrowLeft className="h-4 w-4" /> {t("back")}
              </button>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#25D366] text-white mb-4">
                <MessageCircle className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold">{t("whatsappTitle")}</h2>
              <p className="mt-1 text-sm text-gray-500">
                {t("whatsappSubtitle")}
              </p>

              <form onSubmit={handleSendWhatsappOtp} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t("phoneLabel")}
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t("phonePlaceholder")}
                    className="w-full rounded-xl border border-brand-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-black/20"
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button className="w-full" size="lg" onClick={() => {}}>
                  {loading ? "..." : t("sendCode")}
                </Button>
              </form>
            </motion.div>
          )}

          {/* ── WHATSAPP OTP ── */}
          {step === "whatsapp_otp" && (
            <OtpStep
              title={t("otpTitle")}
              subtitle={t("otpSubtitle").replace("{phone}", phone)}
              otp={otp}
              setOtp={setOtp}
              error={error}
              loading={loading}
              onSubmit={handleVerifyWhatsappOtp}
              onBack={() => {
                setStep("whatsapp_phone");
                setOtp("");
                clearError();
              }}
              onResend={() => requestWhatsappOtp(phone)}
              t={t}
            />
          )}

          {/* ── PHONE VERIFY ── */}
          {step === "phone_verify" && (
            <motion.div
              key="phone_verify"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-card p-8"
            >
              <h2 className="text-2xl font-bold">{t("phoneVerifyTitle")}</h2>
              <p className="mt-1 text-sm text-gray-500">
                {t("phoneVerifySubtitle")}
              </p>
              <p className="mt-1 text-xs text-gray-400">{t("phoneSmsNote")}</p>

              <form onSubmit={handleSendPhoneOtp} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t("phoneLabel")}
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t("phonePlaceholder")}
                    className="w-full rounded-xl border border-brand-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-black/20"
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button className="w-full" size="lg" onClick={() => {}}>
                  {loading ? "..." : t("sendCode")}
                </Button>
              </form>

              {needsPhone && (
                <button
                  onClick={() => storeTokenAndRedirect(authToken)}
                  className="mt-3 w-full text-center text-sm text-gray-400 hover:text-gray-600"
                >
                  {t("skip")}
                </button>
              )}
            </motion.div>
          )}

          {/* ── PHONE OTP ── */}
          {step === "phone_otp" && (
            <OtpStep
              title={t("otpTitle")}
              subtitle={t("otpSubtitle").replace("{phone}", phone)}
              otp={otp}
              setOtp={setOtp}
              error={error}
              loading={loading}
              onSubmit={handleVerifyPhone}
              onBack={() => {
                setStep("phone_verify");
                setOtp("");
                clearError();
              }}
              onResend={() => requestPhoneVerification(phone, authToken)}
              t={t}
            />
          )}
        </AnimatePresence>
      </Container>
    </div>
  );
}

// Shared OTP input step
function OtpStep({
  title,
  subtitle,
  otp,
  setOtp,
  error,
  loading,
  onSubmit,
  onBack,
  onResend,
  t,
}: {
  title: string;
  subtitle: string;
  otp: string;
  setOtp: (v: string) => void;
  error: string;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onResend: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <motion.div
      key="otp"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl shadow-card p-8"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-black mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> {t("back")}
      </button>
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("otpLabel")}
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder={t("otpPlaceholder")}
            className="w-full rounded-xl border border-brand-gray-200 px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-brand-black/20"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button className="w-full" size="lg" onClick={() => {}}>
          {loading ? "..." : t("verify")}
        </Button>
      </form>

      <button
        onClick={onResend}
        className="mt-3 w-full text-center text-sm text-gray-400 hover:text-brand-black"
      >
        {t("resend")}
      </button>
    </motion.div>
  );
}
