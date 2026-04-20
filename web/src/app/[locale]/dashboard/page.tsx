"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CommandCenter }   from "@/components/dashboard/CommandCenter";
import { EngineRoom }      from "@/components/dashboard/EngineRoom";
import { DeploymentHub }   from "@/components/dashboard/DeploymentHub";
import { IntegrationsSettings } from "@/components/dashboard/IntegrationsSettings";
import { SecuritySettings } from "@/components/dashboard/SecuritySettings";
import { Solutions } from "@/components/dashboard/Solutions";

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("yappaflow_token");
    if (!token) router.replace("/auth");
    else setReady(true);
  }, [router]);

  if (!ready) return (
    <div className="flex h-screen items-center justify-center bg-[#0A0A0A]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/[0.06] border-t-[#FF6B35]" />
    </div>
  );

  return (
    <DashboardShell>
      {(view, setView, signalId, setSignalId) => {
        if (view === "command")      return <CommandCenter setView={setView} setSignalId={setSignalId} />;
        if (view === "engine")       return <EngineRoom    setView={setView} signalId={signalId} />;
        if (view === "deploy")       return <DeploymentHub setView={setView} />;
        if (view === "solutions")    return <Solutions />;
        if (view === "integrations") return <IntegrationsSettings />;
        if (view === "security")     return <SecuritySettings />;
        return null;
      }}
    </DashboardShell>
  );
}
