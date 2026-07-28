"use client";

import React from "react";
import { GraduationCap, Award, Target, TrendingUp, Loader2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface LgsSubjectDetail {
  subject: string;
  accuracy: number;
  projectedNet: number;
  maxNet: number;
  weight: number;
}

export interface LgsTarget {
  name: string;
  minScore: number;
  reached: boolean;
  gap: number;
}

export interface LgsData {
  hasData: boolean;
  estimatedScore: number | null;
  weightedNet: number;
  /** % of the exam's weighted total the student actually has data for. */
  coverage: number;
  subjects: LgsSubjectDetail[];
  targets: LgsTarget[];
}

interface ExamSimulatorProps {
  data?: LgsData | null;
  loading?: boolean;
  className?: string;
}

export function ExamSimulator({ data, loading = false, className = "" }: ExamSimulatorProps) {
  const nextTarget = data?.targets?.find((t) => !t.reached);
  const reachedTarget = data?.targets?.find((t) => t.reached);

  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white shadow-xl border border-slate-800 space-y-3 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-400/30 shrink-0">
            <GraduationCap className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-white">LGS Puan &amp; Hedef Okul Simülatörü</h4>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30 text-[10px] px-1.5 py-0">
                MEB Katsayıları
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400">Çözdüğün optik testlerin ders bazlı doğruluğundan hesaplanır</p>
          </div>
        </div>

        {data?.hasData && (
          <div className="text-right self-start sm:self-center shrink-0">
            <div className="text-[10px] text-slate-400">Tahmini LGS Puanı</div>
            <div className="text-xl font-black text-amber-400 flex items-center gap-1 justify-end">
              <Award className="w-4 h-4 text-amber-300" /> {data.estimatedScore} / 500
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-slate-400 text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Simülasyon hesaplanıyor...
        </div>
      ) : !data?.hasData ? (
        <div className="py-6 text-center space-y-1">
          <div className="text-2xl">🎓</div>
          <p className="text-xs font-semibold text-slate-200">Henüz tahmin yapılamıyor</p>
          <p className="text-[10px] text-slate-400">
            Optik test çözdükçe ders bazlı netlerin oluşur ve LGS puan tahminin burada belirir.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-blue-400" /> Tahmini Ağırlıklı Net
              </div>
              <div className="text-lg font-black text-white">
                {data.weightedNet} <span className="text-xs font-normal text-slate-400">/ 90</span>
              </div>
              <div className="text-[10px] text-slate-400">{data.subjects.length} dersten hesaplandı</div>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-emerald-400" /> Ulaşılabilir Seviye
              </div>
              <div className="text-sm font-black text-emerald-400 truncate">
                {reachedTarget?.name || "Hedef için çalışmaya devam"}
              </div>
              <div className="text-[10px] text-slate-400">Bu puanla girilebilecek okul tipi</div>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> Sonraki Hedef
              </div>
              {nextTarget ? (
                <>
                  <div className="text-xs font-bold text-slate-200 truncate">{nextTarget.name}</div>
                  <div className="text-[10px] text-amber-300 font-bold">+{nextTarget.gap} puan gerekli</div>
                </>
              ) : (
                <div className="text-xs font-bold text-emerald-400">Tüm hedefleri geçtin! 🎉</div>
              )}
            </div>
          </div>

          {/* Per-subject contribution */}
          <div className="space-y-1.5 pt-1">
            {data.subjects.map((s) => (
              <div key={s.subject} className="flex items-center gap-2 text-[11px]">
                <span className="w-32 truncate text-slate-300 font-medium">{s.subject}</span>
                <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.accuracy >= 75 ? "bg-emerald-500" : s.accuracy >= 55 ? "bg-amber-500" : "bg-rose-500"}`}
                    style={{ width: `${s.accuracy}%` }}
                  />
                </div>
                <span className="w-24 text-right text-slate-400 tabular-nums">
                  {s.projectedNet}/{s.maxNet} net
                </span>
                <span className="w-8 text-right text-slate-500">×{s.weight}</span>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-1.5 text-[10px] text-slate-400 pt-1 border-t border-slate-800">
            <Info className="w-3 h-3 shrink-0 mt-0.5" />
            <span>
              Tahmin, çözdüğün derslerin doğruluk oranı sınavın tamamına yansıtılarak hesaplanır
              (veri kapsamı: %{data.coverage}). Gerçek LGS puanı ülke geneli standardizasyona bağlıdır.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
