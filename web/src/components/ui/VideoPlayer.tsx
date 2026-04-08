"use client";

import { cn } from "@/lib/cn";
import { Play } from "lucide-react";

interface VideoPlayerProps {
  className?: string;
}

export function VideoPlayer({ className }: VideoPlayerProps) {
  return (
    <div
      className={cn(
        "relative aspect-video w-full rounded-2xl bg-brand-gray-100 overflow-hidden shadow-card-hover cursor-pointer group",
        className
      )}
    >
      {/* Placeholder gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-gray-100 to-brand-gray-200" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-black text-white shadow-lg transition-transform group-hover:scale-110">
          <Play className="h-6 w-6 ml-1" fill="currentColor" />
        </div>
      </div>
    </div>
  );
}
