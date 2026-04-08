"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("yappaflow_token");
    if (!token) {
      router.replace("/auth");
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-brand-gray-50">
      <header className="border-b border-brand-gray-200 bg-white">
        <Container className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-black">
              <span className="text-sm font-bold text-white">Y</span>
            </div>
            <span className="font-bold">Yappaflow</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              localStorage.removeItem("yappaflow_token");
              router.replace("/auth");
            }}
          >
            Sign Out
          </Button>
        </Container>
      </header>
      <Container className="py-16 text-center">
        <h1 className="text-3xl font-bold">Welcome to your Dashboard</h1>
        <p className="mt-3 text-gray-500">Your projects will appear here.</p>
      </Container>
    </div>
  );
}
