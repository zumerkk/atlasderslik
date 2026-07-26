"use client";

import React from "react";
import { Flame, Trophy, Award, Zap, Star, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StudentStreakProps {
  streakDays?: number;
  completedCount?: number;
  className?: string;
}

export function StudentStreak({
  streakDays = 5,
  completedCount = 8,
  className = "",
}: StudentStreakProps) {
  const badges = [
    { title: "Optik Canavarı", icon: "🎯", desc: "5+ Optik Sınav Tamamlandı", unlocked: completedCount >= 5 },
    { title: "Çalışkan Öğrenci", icon: "🔥", desc: "3 Gün Üst Üste Seri", unlocked: streakDays >= 3 },
    { title: "Matematik Üstadı", icon: "📐", desc: "Sayısal Bölüm Başarısı", unlocked: completedCount >= 3 },
    { title: "Devamsızlık Şampiyonu", icon: "🏆", desc: "%100 Derse Katılım", unlocked: true },
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${className}`}>
      {/* Streak & Level Progress Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md animate-bounce">
            <Flame className="w-7 h-7 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-base font-black text-amber-950 dark:text-amber-300">
                {streakDays} Günlük Çalışma Serisi!
              </h4>
              <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0 font-bold">🔥 Aktif</Badge>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-400 font-medium">
              Her gün test çözerek ve derse katılarak seriyi koruyun!
            </p>
          </div>
        </div>
      </div>

      {/* Badges Carousel / Grid */}
      <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-2">
          {badges.map((b, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold shrink-0 transition-all ${
                b.unlocked
                  ? "bg-slate-900 text-white border-slate-800 shadow-sm"
                  : "bg-muted/40 text-muted-foreground border-border opacity-50"
              }`}
              title={b.desc}
            >
              <span className="text-base">{b.icon}</span>
              <div>
                <div className="text-[11px] leading-tight font-bold">{b.title}</div>
                <div className="text-[9px] opacity-75">{b.unlocked ? "Kazanıldı" : "Kilitli"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
