"use client";

import { cn } from "@/lib/cn";
import { motion } from "framer-motion";

interface Tab {
  key: string;
  label: string;
  sublabel?: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  className?: string;
}

export function TabBar({ tabs, activeTab, onTabChange, className }: TabBarProps) {
  return (
    <div className={cn("flex gap-8 border-b border-brand-gray-200", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={cn(
            "relative pb-4 text-left transition-colors cursor-pointer",
            activeTab === tab.key
              ? "text-brand-black"
              : "text-gray-400 hover:text-gray-600"
          )}
        >
          <span className="text-lg font-semibold">{tab.label}</span>
          {tab.sublabel && (
            <span className="block text-sm font-normal mt-0.5">{tab.sublabel}</span>
          )}
          {activeTab === tab.key && (
            <motion.div
              layoutId="tab-underline"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-black"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
