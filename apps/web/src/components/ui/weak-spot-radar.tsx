"use client";

import React from "react";
import { Radar, BookOpen, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface WeakSpotSubject {
  subject: string;
  tests: number;
  correct: number;
  incorrect: number;
  empty: number;
  questions: number;
  net: number;
  accuracy: number;
  level: "strong" | "medium" | "weak";
}

export interface WeakSpotData {
  hasData: boolean;
  subjects: WeakSpotSubject[];
  weakest: string[];
}

interface WeakSpotRadarProps {
  data?: WeakSpotData | null;
  loading?: boolean;
  className?: string;
}

const LEVEL_STYLE = {
  strong: { bar: "bg-emerald-500", label: "Güçlü", chip: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  medium: { bar: "bg-amber-500", label: "Geliştirilebilir", chip: "text-amber-700 bg-amber-50 border-amber-200" },
  weak: { bar: "bg-rose-500", label: "Tekrar Etmeli", chip: "text-rose-700 bg-rose-50 border-rose-200" },
} as const;

export function WeakSpotRadar({ data, loading = false, className = "" }: WeakSpotRadarProps) {
  return (
    <div className={`p-4 rounded-2xl bg-card border border-border shadow-md space-y-3 ${className}`}>
      <div className="flex items-center justify-between border-b pb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 bg-primary/10 text-primary rounded-xl shrink-0">
            <Radar className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-foreground truncate">📊 Ders Başarı &amp; Zayıf Nokta Radarı</h4>
            <p className="text-[10px] text-muted-foreground truncate">
              Çözdüğün optik testlerin doğru/yanlış dağılımından hesaplanır
            </p>
          </div>
        </div>
        {data?.hasData && (
          <Badge variant="outline" className="text-[10px] font-bold border-emerald-200 text-emerald-700 bg-emerald-50 shrink-0">
            🟢 Canlı Veri
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Analiz hesaplanıyor...
        </div>
      ) : !data?.hasData ? (
        <div className="py-6 text-center space-y-1">
          <div className="text-2xl">📭</div>
          <p className="text-xs font-semibold text-foreground">Henüz analiz edilecek veri yok</p>
          <p className="text-[10px] text-muted-foreground">
            İlk optik testini çözdüğünde ders bazlı güçlü ve zayıf yönlerin burada görünecek.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 pt-1">
          {data.subjects.map((s) => {
            const style = LEVEL_STYLE[s.level];
            return (
              <div key={s.subject} className="p-2 rounded-xl bg-muted/20 border border-border/60 space-y-1">
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="font-bold text-foreground flex items-center gap-1.5 min-w-0">
                    <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">{s.subject}</span>
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.level !== "strong" && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold flex items-center gap-1 ${style.chip}`}>
                        <AlertCircle className="w-3 h-3" /> {style.label}
                      </span>
                    )}
                    <span className="font-extrabold text-foreground">%{s.accuracy}</span>
                  </div>
                </div>

                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${style.bar}`} style={{ width: `${s.accuracy}%` }} />
                </div>

                <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-0.5 flex-wrap">
                  <span>{s.tests} test</span>
                  <span>·</span>
                  <span className="text-emerald-600 font-semibold">{s.correct} doğru</span>
                  <span className="text-rose-600 font-semibold">{s.incorrect} yanlış</span>
                  {s.empty > 0 && <span className="text-amber-600 font-semibold">{s.empty} boş</span>}
                  <span>·</span>
                  <span className="font-semibold text-foreground">{s.net} net</span>
                </div>
              </div>
            );
          })}

          {data.weakest.length > 0 && (
            <div className="text-[10px] text-muted-foreground pt-1 border-t">
              💡 Öncelik verilmesi gereken dersler: <strong className="text-foreground">{data.weakest.join(", ")}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
