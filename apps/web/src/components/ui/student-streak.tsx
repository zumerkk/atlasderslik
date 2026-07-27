"use client";

import React from "react";
import { Flame, Award, CheckCircle2, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BadgeItem {
  id: string;
  icon: string;
  title: string;
  unlocked: boolean;
  reqText: string;
}

interface StudentStreakProps {
  streakDays?: number;
  completedCount?: number;
  avgScore?: number;
  avgNet?: number;
  className?: string;
}

export function StudentStreak({
  streakDays = 1,
  completedCount = 0,
  avgScore = 0,
  avgNet = 0,
  className = "",
}: StudentStreakProps) {
  const badges: BadgeItem[] = [
    {
      id: "1",
      icon: "🎯",
      title: "Optik Canavarı",
      unlocked: completedCount >= 3,
      reqText: completedCount >= 3 ? "Kazanıldı" : `${completedCount}/3 Optik Test`,
    },
    {
      id: "2",
      icon: "🔥",
      title: "Çalışkan Öğrenci",
      unlocked: streakDays >= 1,
      reqText: streakDays >= 1 ? "Kazanıldı" : "1 Günlük Seri",
    },
    {
      id: "3",
      icon: "📐",
      title: "Matematik Üstadı",
      unlocked: avgNet >= 10,
      reqText: avgNet >= 10 ? "Kazanıldı" : `${avgNet}/10 Net Ort.`,
    },
    {
      id: "4",
      icon: "🏆",
      title: "Sınav Dâhisi",
      unlocked: avgScore >= 80,
      reqText: avgScore >= 80 ? "Kazanıldı" : `${avgScore}/80 Puan Ort.`,
    },
  ];

  return (
    <div className={`p-4 rounded-2xl bg-card border border-border shadow-md space-y-3 ${className}`}>
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-orange-500/10 text-orange-600 rounded-xl">
            <Flame className="w-5 h-5 text-orange-500 animate-bounce" />
          </span>
          <div>
            <h4 className="text-sm font-bold text-foreground">{streakDays} Günlük Çalışma Serisi!</h4>
            <p className="text-[10px] text-muted-foreground">Her gün optik sınav çözerek serinizi koruyun ve rozetler kazanın</p>
          </div>
        </div>

        <Badge variant="outline" className="bg-orange-500 text-white border-orange-600 font-extrabold text-xs px-2.5 py-0.5">
          🔥 {streakDays} Gün Seri
        </Badge>
      </div>

      {/* Badges List */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {badges.map((b) => (
          <div
            key={b.id}
            className={`p-2.5 rounded-xl border text-center space-y-1 transition-all ${
              b.unlocked ? "bg-emerald-500/10 border-emerald-300 dark:border-emerald-900/60" : "bg-muted/30 border-border opacity-70"
            }`}
          >
            <div className="text-2xl">{b.icon}</div>
            <div className="text-xs font-bold text-foreground truncate" title={b.title}>
              {b.title}
            </div>
            <div className="text-[10px]">
              {b.unlocked ? (
                <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Kazanıldı
                </span>
              ) : (
                <span className="text-muted-foreground flex items-center justify-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" /> {b.reqText}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
