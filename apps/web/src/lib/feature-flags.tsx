"use client";

import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// 3-Day Trial Window Configuration
// Start: 2026-07-27, End: 2026-07-30T00:00:00.000Z (3 Days)
export const TRIAL_CONFIG = {
  startDate: "2026-07-27T00:00:00.000Z",
  endDate: "2026-07-30T00:00:00.000Z",
  manualEnabled: true, // Can be toggled manually by agent upon user prompt "tüm 3 günlük test özellikleri aç"
};

export function is3DayTrialActive(): boolean {
  if (!TRIAL_CONFIG.manualEnabled) return false;
  const now = new Date().getTime();
  const expiry = new Date(TRIAL_CONFIG.endDate).getTime();
  return now < expiry;
}

export function getTrialTimeRemaining() {
  const now = new Date().getTime();
  const expiry = new Date(TRIAL_CONFIG.endDate).getTime();
  const diff = Math.max(0, expiry - now);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes, formatted: `${days} Gün ${hours} Saat ${minutes} Dk` };
}

export function TrialBadge({ className = "" }: { className?: string }) {
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => setTimeStr(getTrialTimeRemaining().formatted);
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!is3DayTrialActive()) return null;

  return (
    <div className={`flex items-center justify-between p-2.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/15 border border-amber-300 dark:border-amber-700/60 text-amber-950 dark:text-amber-300 text-xs font-bold shadow-xs animate-pulse ${className}`}>
      <div className="flex items-center gap-1.5">
        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>⏳ 3 GÜN SINIRLI SÜRE DENEME ÖZELLİĞİ</span>
      </div>
      <Badge variant="outline" className="bg-amber-500 text-white border-amber-600 font-extrabold text-[10px] px-2 py-0.5">
        Kalan: {timeStr || "3 Gün"}
      </Badge>
    </div>
  );
}
