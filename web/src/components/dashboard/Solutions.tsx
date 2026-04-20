"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2,
  Mail,
  BarChart3,
  Users,
  Calendar,
  Send,
  TrendingUp,
  Search,
  FileText,
  Target,
  Sparkles,
} from "lucide-react";

type SolutionTab = "social" | "email" | "seo" | "crm";

const TAB_ICONS = [Share2, Mail, BarChart3, Users];
const TAB_IDS: SolutionTab[] = ["social", "email", "seo", "crm"];
const TAB_LABEL_KEYS = ["tabSocial", "tabEmail", "tabSeo", "tabCrm"] as const;

/* ── Social Media Management ── */
function SocialMediaTab() {
  const t = useTranslations("solutions");
  const scheduled = [
    { platform: t("socialPost1Platform"), content: t("socialPost1Content"), time: t("socialPost1When"), status: t("socialPost1Status") },
    { platform: t("socialPost2Platform"), content: t("socialPost2Content"), time: t("socialPost2When"), status: t("socialPost2Status") },
    { platform: t("socialPost3Platform"), content: t("socialPost3Content"), time: t("socialPost3When"), status: t("socialPost3Status") },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: t("socialScheduled"), value: "24", icon: Calendar, color: "text-blue-400" },
          { label: t("socialPublished"), value: "12", icon: Send, color: "text-green-400" },
          { label: t("socialEngagement"), value: "4.8%", icon: TrendingUp, color: "text-[#FF6B35]" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={13} className={stat.color} />
              <span className="text-[10px] uppercase tracking-wider text-white/20">{stat.label}</span>
            </div>
            <span className="text-xl font-semibold text-white">{stat.value}</span>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-medium text-white">{t("socialCalendar")}</h3>
          <button className="flex items-center gap-1.5 text-[11px] text-[#FF6B35] hover:text-[#FF6B35]/80">
            <Sparkles size={12} /> {t("socialGenerate")}
          </button>
        </div>
        <div className="space-y-2">
          {scheduled.map((post, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-white/[0.04] hover:border-white/[0.08] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                  <Share2 size={13} className="text-white/30" />
                </div>
                <div>
                  <p className="text-[12px] text-white/70">{post.content}</p>
                  <p className="text-[10px] text-white/20">{post.platform} · {post.time}</p>
                </div>
              </div>
              <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                post.status === t("socialPost3Status") ? "bg-white/[0.04] text-white/30" : "bg-blue-500/10 text-blue-400"
              }`}>{post.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Email Marketing ── */
function EmailMarketingTab() {
  const t = useTranslations("solutions");
  const campaigns = [
    { name: t("emailC1Name"), status: t("emailC1Status"), sent: t("emailC1Sent"), opens: t("emailC1Opens"), clicks: t("emailC1Clicks") },
    { name: t("emailC2Name"), status: t("emailC2Status"), sent: t("emailC2Sent"), opens: t("emailC2Opens"), clicks: t("emailC2Clicks") },
    { name: t("emailC3Name"), status: t("emailC3Status"), sent: t("emailC3Sent"), opens: t("emailC3Opens"), clicks: t("emailC3Clicks") },
  ];

  const statusActive = t("emailC1Status");
  const statusDraft = t("emailC3Status");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-medium text-white">{t("emailCampaigns")}</h3>
        <button className="flex items-center gap-1.5 text-[11px] bg-[#FF6B35] text-white px-3 py-1.5 rounded-lg hover:bg-[#FF6B35]/80">
          <Sparkles size={12} /> {t("emailCreate")}
        </button>
      </div>

      <div className="rounded-lg border border-white/[0.05] overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-2 bg-white/[0.02] border-b border-white/[0.05] text-[9px] uppercase tracking-wider text-white/20">
          <span>{t("emailTableCampaign")}</span><span>{t("emailTableStatus")}</span><span>{t("emailTableSent")}</span><span>{t("emailTableOpens")}</span><span>{t("emailTableClicks")}</span>
        </div>
        {campaigns.map((c, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-4 py-3 border-b border-white/[0.03] last:border-0">
            <span className="text-[12px] text-white/70">{c.name}</span>
            <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
              c.status === statusActive ? "bg-green-500/10 text-green-400" :
              c.status === statusDraft ? "bg-white/[0.04] text-white/30" :
              "bg-blue-500/10 text-blue-400"
            }`}>{c.status}</span>
            <span className="text-[11px] text-white/30">{c.sent}</span>
            <span className="text-[11px] text-white/30">{c.opens}</span>
            <span className="text-[11px] text-white/30">{c.clicks}</span>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-4">
        <div className="flex items-center gap-2 mb-2">
          <Mail size={13} className="text-[#FF6B35]" />
          <span className="text-[11px] text-white/40">{t("emailAiTip")}</span>
        </div>
      </div>
    </div>
  );
}

/* ── SEO & Analytics ── */
function SeoAnalyticsTab() {
  const t = useTranslations("solutions");
  const keywords = [
    { keyword: t("seoKw1"), position: t("seoKw1Pos"), change: t("seoKw1Chg"), volume: t("seoKw1Vol") },
    { keyword: t("seoKw2"), position: t("seoKw2Pos"), change: t("seoKw2Chg"), volume: t("seoKw2Vol") },
    { keyword: t("seoKw3"), position: t("seoKw3Pos"), change: t("seoKw3Chg"), volume: t("seoKw3Vol") },
    { keyword: t("seoKw4"), position: t("seoKw4Pos"), change: t("seoKw4Chg"), volume: t("seoKw4Vol") },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {[
          { label: t("seoOrganicTraffic"), value: "12.4K", change: "+18%", icon: TrendingUp },
          { label: t("seoKeywordsTracked"), value: "156", change: "+12", icon: Search },
          { label: t("seoAvgPosition"), value: "8.2", change: "+3.1", icon: Target },
          { label: t("seoPagesIndexed"), value: "342", change: "+24", icon: FileText },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={13} className="text-white/20" />
              <span className="text-[10px] uppercase tracking-wider text-white/20">{stat.label}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-white">{stat.value}</span>
              <span className="text-[10px] text-green-400">{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-[13px] font-medium text-white mb-3">{t("seoTopKeywords")}</h3>
        <div className="rounded-lg border border-white/[0.05] overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2 bg-white/[0.02] border-b border-white/[0.05] text-[9px] uppercase tracking-wider text-white/20">
            <span>{t("seoTableKeyword")}</span><span>{t("seoTablePosition")}</span><span>{t("seoTableChange")}</span><span>{t("seoTableVolume")}</span>
          </div>
          {keywords.map((kw, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3 border-b border-white/[0.03] last:border-0">
              <span className="text-[12px] text-white/70">{kw.keyword}</span>
              <span className="text-[11px] text-white font-medium w-8 text-center">{kw.position}</span>
              <span className={`text-[10px] w-8 text-center ${kw.change.startsWith("+") ? "text-green-400" : "text-white/30"}`}>{kw.change}</span>
              <span className="text-[11px] text-white/30 w-10 text-right">{kw.volume}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── CRM & Client Management ── */
function CrmTab() {
  const t = useTranslations("solutions");
  const clients = [
    { name: t("crmC1Name"), stage: t("crmC1Stage"), value: t("crmC1Value"), last: t("crmC1LastContact") },
    { name: t("crmC2Name"), stage: t("crmC2Stage"), value: t("crmC2Value"), last: t("crmC2LastContact") },
    { name: t("crmC3Name"), stage: t("crmC3Stage"), value: t("crmC3Value"), last: t("crmC3LastContact") },
    { name: t("crmC4Name"), stage: t("crmC4Stage"), value: t("crmC4Value"), last: t("crmC4LastContact") },
  ];

  const stageActive = t("crmC1Stage");
  const stageCompleted = t("crmC4Stage");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: t("crmTotalClients"), value: "48", icon: Users, color: "text-white" },
          { label: t("crmActiveProjects"), value: "12", icon: Target, color: "text-[#FF6B35]" },
          { label: t("crmRevenueMtd"), value: "₺124K", icon: TrendingUp, color: "text-green-400" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={13} className="text-white/20" />
              <span className="text-[10px] uppercase tracking-wider text-white/20">{stat.label}</span>
            </div>
            <span className={`text-xl font-semibold ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-medium text-white">{t("crmPipeline")}</h3>
          <button className="text-[11px] text-[#FF6B35] hover:text-[#FF6B35]/80">{t("crmAddClient")}</button>
        </div>
        <div className="rounded-lg border border-white/[0.05] overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2 bg-white/[0.02] border-b border-white/[0.05] text-[9px] uppercase tracking-wider text-white/20">
            <span>{t("crmTableClient")}</span><span>{t("crmTableStage")}</span><span>{t("crmTableValue")}</span><span>{t("crmTableLastContact")}</span>
          </div>
          {clients.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer">
              <p className="text-[12px] text-white/70">{c.name}</p>
              <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                c.stage === stageActive ? "bg-green-500/10 text-green-400" :
                c.stage === stageCompleted ? "bg-blue-500/10 text-blue-400" :
                "bg-[#FF6B35]/10 text-[#FF6B35]"
              }`}>{c.stage}</span>
              <span className="text-[11px] text-white/50 font-medium">{c.value}</span>
              <span className="text-[11px] text-white/30">{c.last}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main Solutions Component ── */
export function Solutions() {
  const t = useTranslations("solutions");
  const [tab, setTab] = useState<SolutionTab>("social");

  const tabs = TAB_IDS.map((id, i) => ({
    id,
    label: t(TAB_LABEL_KEYS[i]),
    icon: TAB_ICONS[i],
  }));

  return (
    <div className="p-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-[15px] font-bold text-white">{t("title")}</h2>
        <p className="text-[11px] text-white/25 mt-0.5">{t("subtitle")}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-white/[0.05]">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[12px] font-medium transition-colors relative ${
              tab === tabItem.id
                ? "text-[#FF6B35]"
                : "text-white/30 hover:text-white/50"
            }`}
          >
            <tabItem.icon size={14} />
            <span>{tabItem.label}</span>
            {tab === tabItem.id && (
              <motion.div
                layoutId="solutions-tab"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FF6B35]"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "social" && <SocialMediaTab />}
          {tab === "email" && <EmailMarketingTab />}
          {tab === "seo" && <SeoAnalyticsTab />}
          {tab === "crm" && <CrmTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
