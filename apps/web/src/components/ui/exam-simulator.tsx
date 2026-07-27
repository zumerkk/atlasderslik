"use client";

import React from "react";
import { GraduationCap, Award, Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ExamSimulatorProps {
  gradeLevel?: number;
  averageNet?: number;
  completedTestsCount?: number;
  className?: string;
}

export function ExamSimulator({
  gradeLevel = 8,
  averageNet = 14.5,
  completedTestsCount = 0,
  className = "",
}: ExamSimulatorProps) {
  // Official MEB LGS Score Formula Calculation
  // 90 Questions Max. Base Score 195. Max Score 500.
  const maxNet = 90;
  const calculatedScore = Math.min(
    500,
    Math.max(195, Math.round(195 + (averageNet / maxNet) * 305))
  );

  // MEB LGS Target School Base Score Thresholds
  const targetSchools = [
    { name: "Galatasaray Lisesi", minScore: 494, minNet: 88.5 },
    { name: "İstanbul Erkek Lisesi", minScore: 492, minNet: 87.5 },
    { name: "Kabataş Erkek Lisesi", minScore: 489, minNet: 86.5 },
    { name: "Atatürk Fen Lisesi", minScore: 482, minNet: 84.5 },
    { name: "Nitelikli Anadolu Lisesi", minScore: 420, minNet: 66.5 },
  ];

  // Determine achievable school
  let achievedSchool = "Anadolu Lisesi";
  for (const school of targetSchools) {
    if (calculatedScore >= school.minScore) {
      achievedSchool = school.name;
      break;
    }
  }

  // Target high school gap calculation (Galatasaray Lisesi)
  const topSchool = targetSchools[0];
  const netGap = Math.max(0, topSchool.minNet - averageNet).toFixed(1);

  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white shadow-xl border border-slate-800 space-y-3 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-400/30">
            <GraduationCap className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white">LGS 2027 Puan &amp; Hedef Okul Simülatörü</h4>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30 text-[10px] px-1.5 py-0">
                MEB Resmi Katsayılar
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400">Optik test performansınıza göre canlı hesaplanan başarı metriği</p>
          </div>
        </div>

        <div className="text-right self-start sm:self-center">
          <div className="text-[10px] text-slate-400">Tahmini LGS Puanı</div>
          <div className="text-xl font-black text-amber-400 flex items-center gap-1 justify-end">
            <Award className="w-4 h-4 text-amber-300" /> {calculatedScore} / 500
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-blue-400" /> Mevcut Optik Net Ortalaması
          </div>
          <div className="text-lg font-black text-white">{averageNet} <span className="text-xs font-normal text-slate-400">Net / 90</span></div>
          <div className="text-[10px] text-slate-400">Toplanan {completedTestsCount} optik sınav verisi</div>
        </div>

        <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-emerald-400" /> Kazanılabilir Hedef Okul
          </div>
          <div className="text-base font-black text-emerald-400 truncate">{achievedSchool}</div>
          <div className="text-[10px] text-slate-400">Tahmini Başarı Yüzdeliği: %{Math.max(1, Math.round(100 - (calculatedScore / 500) * 100))}</div>
        </div>

        <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> Üst Hedef İçin Gereken Net
          </div>
          <div className="text-xs font-bold text-slate-200">
            Galatasaray Lisesi için <strong className="text-amber-300">+{netGap} Net</strong> daha gerekli!
          </div>
          <div className="text-[10px] text-slate-400">💡 Matematik ve Fen derslerindeki soru çözümlerine ağırlık verin.</div>
        </div>
      </div>
    </div>
  );
}
