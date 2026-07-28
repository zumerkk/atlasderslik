"use client";

import React from "react";
import { Flame, Trophy, Target, CalendarCheck, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface StreakData {
  current: number;
  longest: number;
  activeDays: number;
  lastActive: string | null;
}

interface StudentStreakProps {
  streak?: StreakData | null;
  opticCount?: number;
  avgNet?: number;
  avgScore?: number;
  loading?: boolean;
  className?: string;
}

/** Last 7 calendar days, marked active when they fall inside the current streak. */
function useWeekDots(streak?: StreakData | null) {
  return React.useMemo(() => {
    const labels = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
    const today = new Date();
    const days: { label: string; active: boolean; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const dow = (d.getDay() + 6) % 7; // Monday-first
      days.push({
        label: labels[dow],
        active: !!streak && streak.current > i,
        isToday: i === 0,
      });
    }
    return days;
  }, [streak]);
}

export function StudentStreak({
  streak,
  opticCount = 0,
  avgNet = 0,
  avgScore = 0,
  loading = false,
  className = "",
}: StudentStreakProps) {
  const week = useWeekDots(streak);
  const current = streak?.current ?? 0;

  return (
    <div className={`p-4 rounded-2xl bg-card border border-border shadow-md space-y-3 ${className}`}>
      <div className="flex items-center justify-between border-b pb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`p-1.5 rounded-xl shrink-0 ${current > 0 ? "bg-orange-500/10 text-orange-600" : "bg-muted text-muted-foreground"}`}>
            <Flame className={`w-5 h-5 ${current > 0 ? "fill-orange-500/30" : ""}`} />
          </span>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-foreground truncate">
              {current > 0 ? `🔥 ${current} Günlük Çalışma Serisi!` : "Çalışma Serisi"}
            </h4>
            <p className="text-[10px] text-muted-foreground truncate">
              {current > 0
                ? "Seriyi bozmamak için bugün de bir ödev veya soru çöz"
                : "Bir ödev teslim et veya günün sorusunu çöz, serin başlasın"}
            </p>
          </div>
        </div>
        {streak && streak.longest > 0 && (
          <Badge variant="outline" className="text-[10px] font-bold shrink-0">
            En uzun: {streak.longest} gün
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor...
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-1.5">
            {week.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`w-full h-8 rounded-lg border flex items-center justify-center text-[11px] font-black transition-colors ${
                    d.active
                      ? "bg-orange-500/15 border-orange-400 text-orange-600"
                      : "bg-muted/30 border-border/60 text-muted-foreground"
                  } ${d.isToday ? "ring-1 ring-primary/50" : ""}`}
                >
                  {d.active ? "🔥" : "·"}
                </div>
                <span className={`text-[9px] ${d.isToday ? "font-bold text-foreground" : "text-muted-foreground"}`}>{d.label}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <Stat icon={<CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />} label="Aktif Gün" value={String(streak?.activeDays ?? 0)} />
            <Stat icon={<Target className="w-3.5 h-3.5 text-blue-600" />} label="Çözülen Test" value={String(opticCount)} />
            <Stat icon={<Trophy className="w-3.5 h-3.5 text-amber-600" />} label="Ort. Net" value={avgNet.toFixed(2)} />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-2 rounded-xl bg-muted/20 border border-border/60 text-center space-y-0.5">
      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground font-medium">
        {icon} {label}
      </div>
      <div className="text-sm font-black text-foreground">{value}</div>
    </div>
  );
}
