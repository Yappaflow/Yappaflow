"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

export default function InstagramSuccessPage() {
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

    if (needsPhone) {
      router.replace("/auth?step=phone_verify&provider=instagram");
    } else {
      router.replace("/dashboard");
    }
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="h-10 w-10 rounded-full border-2 border-brand-black border-t-transparent animate-spin mx-auto" />
        <p className="mt-4 text-sm text-gray-500">Signing you in…</p>
      </div>
    </div>
  );
}
