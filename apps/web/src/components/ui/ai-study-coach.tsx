"use client";

import React, { useState } from "react";
import { Bot, Sparkles, Lightbulb, RefreshCw, Calendar, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AIStudyCoachProps {
  studentName?: string;
  className?: string;
}

export function AIStudyCoach({ studentName = "Öğrenci", className = "" }: AIStudyCoachProps) {
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const tips = [
    "🚀 Harika bir başlangıç! Matematik dersindeki net ortalaman son 3 testtir yükselişte.",
    "💡 İpucu: Fen Bilimleri sorularında çeldirici şıklara dikkat et. Sorunun kökündeki 'değildir' kelimelerinin altını çiz!",
    "🎯 LGS Hedefin için Türkçe paragraf sorularında günlük 20 soru çözme rutini oluşturman çok faydalı olacaktır.",
  ];

  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const nextTip = () => {
    setCurrentTipIndex((prev) => (prev + 1) % tips.length);
  };

  const generatePlan = () => {
    setGenerating(true);
    setTimeout(() => {
      setActivePlan("📚 Bugünün AI Çalışma Programı: 1) Matematik Üslü İfadeler 20 Soru (25dk) -> 2) 5dk Mola -> 3) Fen Bilimleri Basınç 15 Soru (20dk)");
      setGenerating(false);
    }, 600);
  };

  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-800/60 relative overflow-hidden ${className}`}>
      <div className="absolute -right-6 -top-6 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-800/40 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/30 flex items-center justify-center">
            <Bot className="w-5 h-5 text-indigo-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-white">Atlas AI Öğrenci Çalışma Koçu</h4>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px] px-1.5 py-0">
                🟢 Canlı Koçluk
              </Badge>
            </div>
            <p className="text-[11px] text-indigo-200">Kişiselleştirilmiş yapay zeka öğrenme tavsiyeleri</p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={nextTip}
          className="h-7 text-xs bg-white/10 hover:bg-white/20 text-white border-white/20 shrink-0 self-start sm:self-center"
        >
          <RefreshCw className="w-3 h-3 mr-1" /> Değiştir
        </Button>
      </div>

      {/* Main Tip Box */}
      <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs space-y-2 mb-3">
        <div className="flex items-center gap-1 text-amber-300 font-bold text-[11px]">
          <Lightbulb className="w-3.5 h-3.5" /> Koçunuzun Günlük Tavsiyesi:
        </div>
        <p className="text-slate-200 leading-relaxed font-medium">
          {tips[currentTipIndex]}
        </p>
      </div>

      {/* Interactive Study Schedule Generator */}
      {activePlan ? (
        <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between gap-2 animate-fade-in">
          <span className="font-semibold">{activePlan}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setActivePlan(null)} className="h-6 text-[10px] text-emerald-300 hover:text-white">
            Kapat
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          onClick={generatePlan}
          disabled={generating}
          className="w-full h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md border border-indigo-400/40"
        >
          {generating ? (
            <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
          )}
          {generating ? "AI Program Hazırlanıyor..." : "⚡ Bugünün 15 Dakikalık Akıllı Çalışma Planını Oluştur"}
        </Button>
      )}
    </div>
  );
}
