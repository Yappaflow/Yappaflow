"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { establishSession } from "@/lib/auth-api";

export default function InstagramSuccessPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    const needsPhone = params.get("needsPhone") === "true";

    if (!token) {
      router.replace("/auth");
      return;
    }

    localStorage.setItem("yappaflow_token", token);

    (async () => {
      await establishSession(token);
      if (needsPhone) {
        router.replace("/auth?step=phone_verify&provider=instagram");
      } else {
        router.replace("/dashboard");
      }
    })();
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="h-10 w-10 rounded-full border-2 border-brand-black border-t-transparent animate-spin mx-auto" />
        <p className="mt-4 text-sm text-gray-500">{t("signingIn")}</p>
      </div>
    </div>
  );
}
