"use client";

import React, { useState } from "react";
import { Bot, Sparkles, Loader2, CheckCircle2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AIQuizBuilderProps {
  onGenerated?: (title: string, count: number, keys: string[]) => void;
  className?: string;
}

export function AIQuizBuilder({ onGenerated, className = "" }: AIQuizBuilderProps) {
  const [topicInput, setTopicInput] = useState("8. Sınıf Matematik — Üslü İfadeler");
  const [qCount, setQCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const handleGenerate = () => {
    if (!topicInput.trim()) return;
    setGenerating(true);
    setDone(false);

    setTimeout(() => {
      // Generate randomized sample answer keys A, B, C, D
      const options = ["A", "B", "C", "D"];
      const generatedKeys = Array.from({ length: qCount }).map(
        () => options[Math.floor(Math.random() * options.length)]
      );

      setGenerating(false);
      setDone(true);

      if (onGenerated) {
        onGenerated(`${topicInput} — AI Optik Test`, qCount, generatedKeys);
      }
    }, 800);
  };

  return (
    <div className={`p-3.5 rounded-2xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white border border-purple-800/60 shadow-lg space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-400/30">
            <Bot className="w-4 h-4 text-purple-300" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              🤖 Yapay Zeka Test &amp; Cevap Anahtarı Üretici
            </h4>
            <p className="text-[10px] text-purple-200">5 saniyede ÖSYM / LGS uyumlu optik sınav başlığı ve cevap anahtarı üretir</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div className="sm:col-span-2 grid gap-1">
          <Label className="text-[10px] text-slate-300">Ders / Konu Başlığı</Label>
          <Input
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            placeholder="Örn: 8. Sınıf Fen — LGS Basınç Soruları"
            className="h-8 text-xs bg-white/10 border-white/20 text-white font-medium placeholder:text-slate-400"
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-[10px] text-slate-300">Soru Sayısı</Label>
          <Input
            type="number"
            min={1}
            max={50}
            value={qCount}
            onChange={(e) => setQCount(Number(e.target.value))}
            className="h-8 text-xs bg-white/10 border-white/20 text-white font-medium"
          />
        </div>
      </div>

      <Button
        type="button"
        onClick={handleGenerate}
        disabled={generating}
        className="w-full h-8 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md border border-purple-400/40"
      >
        {generating ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
        )}
        {generating ? "AI Cevap Anahtarı Üretiliyor..." : "⚡ Yapay Zeka İle Sınav Oluştur"}
      </Button>

      {done && (
        <div className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1 bg-emerald-950/60 p-2 rounded-lg border border-emerald-500/40">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {qCount} Soruluk cevap anahtarı başarıyla dolduruldu!
        </div>
      )}
    </div>
  );
}
