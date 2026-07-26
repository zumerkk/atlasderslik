"use client";

import React, { useState } from "react";
import { Sparkles, Trophy, Target, ArrowUpRight, GraduationCap, Clock, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ExamSimulatorProps {
  gradeLevel?: number;
  averageNet?: number;
  completedTestsCount?: number;
  className?: string;
}

export function ExamSimulator({
  gradeLevel = 8,
  averageNet = 14.5,
  completedTestsCount = 5,
  className = "",
}: ExamSimulatorProps) {
  const isLGS = gradeLevel <= 8;

  // Estimate Scores
  // LGS max net: 90 net -> 500 score
  // YKS max net: 120 net (TYT) -> 500 score
  const maxNet = isLGS ? 90 : 120;
  const estimatedScore = Math.min(500, Math.round(300 + (averageNet / Math.max(1, maxNet / 3)) * 200));

  // Target Schools Presets
  const targetSchools = isLGS
    ? [
        { name: "Galatasaray Lisesi", minScore: 492, requiredNet: 88 },
        { name: "Kabataş Erkek Lisesi", minScore: 486, requiredNet: 85 },
        { name: "Ankara Fen Lisesi", minScore: 482, requiredNet: 83 },
        { name: "Nitelikli Anadolu Lisesi", minScore: 420, requiredNet: 65 },
      ]
    : [
        { name: "İTÜ Bilgisayar Mühendisliği", minScore: 495, requiredNet: 110 },
        { name: "ODTÜ Elektrik-Elektronik", minScore: 490, requiredNet: 106 },
        { name: "Hacettepe Tıp Fakültesi", minScore: 488, requiredNet: 104 },
        { name: "Marmara Hukuk Fakültesi", minScore: 430, requiredNet: 80 },
      ];

  const targetSchool = targetSchools.find((s) => estimatedScore >= s.minScore) || targetSchools[targetSchools.length - 1];
  const nextTargetSchool = targetSchools.find((s) => s.minScore > estimatedScore) || targetSchools[0];
  const scoreGap = Math.max(0, nextTargetSchool.minScore - estimatedScore);
  const netGap = Math.max(0, parseFloat(((scoreGap / 200) * (maxNet / 3)).toFixed(1)));

  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-slate-800 relative overflow-hidden ${className}`}>
      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30 text-amber-300">
            <GraduationCap className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-white tracking-tight">
                {isLGS ? "LGS 2027 Puan & Hedef Okul Simülatörü" : "YKS / TYT 2027 Puan & Sıralama Simülatörü"}
              </h3>
              <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-400/40 text-[10px] px-1.5 py-0">
                AI Destekli
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400">Optik test performansınıza göre tahmini başarı metriği</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs px-2.5 py-1">
            <Trophy className="w-3.5 h-3.5 mr-1 text-amber-400" /> Tahmini Puan: <strong className="ml-1 text-sm">{estimatedScore}</strong> / 500
          </Badge>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
        {/* Card 1: Mevcut Seviye */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Target className="w-3 h-3 text-indigo-400" /> Mevcut Optik Net Ortalama
          </span>
          <div className="text-xl font-black text-amber-300">
            {averageNet} <span className="text-xs font-normal text-slate-400">Net / {maxNet}</span>
          </div>
          <p className="text-[10px] text-slate-300">Toplanan {completedTestsCount} optik sınav verisi</p>
        </div>

        {/* Card 2: Tahmini Hedef Okul */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Award className="w-3 h-3 text-emerald-400" /> Kazanılabilir Hedef Okul
          </span>
          <div className="text-sm font-extrabold text-emerald-300 truncate" title={targetSchool.name}>
            {targetSchool.name}
          </div>
          <p className="text-[10px] text-slate-300">Baraj Puanı: {targetSchool.minScore} ({targetSchool.requiredNet} Net)</p>
        </div>

        {/* Card 3: Akıllı Gelişim Tavsiyesi */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-500/30 space-y-1">
          <span className="text-[10px] text-indigo-200 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-300" /> Üst Hedef İçin Gereken Net
          </span>
          {scoreGap > 0 ? (
            <div>
              <div className="text-xs font-bold text-white">
                {nextTargetSchool.name} için <span className="text-amber-300">+{netGap} Net</span> daha gerekli!
              </div>
              <p className="text-[10px] text-indigo-200 mt-0.5">💡 Matematik ve Fen derslerindeki soru çözümlerine ağırlık verin.</p>
            </div>
          ) : (
            <div className="text-xs font-bold text-emerald-300">
              🌟 Zirvedesiniz! Galatasaray &amp; Derece Liseleri hedefinize ulaştınız.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
