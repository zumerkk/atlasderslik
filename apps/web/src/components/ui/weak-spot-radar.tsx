"use client";

import React from "react";
import { Radar, BookOpen, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SubjectMastery {
  subject: string;
  pct: number;
  weakTopics?: string[];
}

interface WeakSpotRadarProps {
  className?: string;
}

export function WeakSpotRadar({ className = "" }: WeakSpotRadarProps) {
  const masteries: SubjectMastery[] = [
    { subject: "Matematik", pct: 85, weakTopics: ["Üslü İfadeler"] },
    { subject: "Fen Bilimleri", pct: 90 },
    { subject: "Türkçe", pct: 72, weakTopics: ["Paragrafta Anlam"] },
    { subject: "T.C. İnkılap Tarihi", pct: 60, weakTopics: ["Milli Mücadele"] },
    { subject: "İngilizce", pct: 88 },
  ];

  return (
    <div className={`p-4 rounded-2xl bg-card border border-border shadow-md space-y-3 ${className}`}>
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-primary/10 text-primary rounded-xl">
            <Radar className="w-5 h-5" />
          </span>
          <div>
            <h4 className="text-sm font-bold text-foreground">📊 Ders Başarı &amp; Zayıf Nokta Radarı</h4>
            <p className="text-[10px] text-muted-foreground">Optik testlerinize göre ders yetkinlik seviyeleri</p>
          </div>
        </div>

        <Badge variant="outline" className="text-[10px] font-bold border-indigo-200 text-indigo-700 bg-indigo-50">
          Akıllı Analiz
        </Badge>
      </div>

      {/* Subject Bars List */}
      <div className="space-y-2.5 pt-1">
        {masteries.map((m) => {
          const isWeak = m.pct < 75;
          let barColor = "bg-emerald-500";
          if (m.pct < 65) barColor = "bg-rose-500";
          else if (m.pct < 75) barColor = "bg-amber-500";

          return (
            <div key={m.subject} className="p-2 rounded-xl bg-muted/20 border border-border/60 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-primary" /> {m.subject}
                </span>
                <div className="flex items-center gap-2">
                  {isWeak && (
                    <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-600" /> Tekrar Etmeli
                    </span>
                  )}
                  <span className="font-extrabold text-foreground">%{m.pct}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${m.pct}%` }} />
              </div>

              {m.weakTopics && m.weakTopics.length > 0 && (
                <div className="text-[10px] text-muted-foreground pt-0.5">
                  💡 Önerilen Konu Çalışması: <strong className="text-foreground">{m.weakTopics.join(", ")}</strong>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
