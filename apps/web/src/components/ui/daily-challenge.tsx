"use client";

import React, { useState } from "react";
import { Zap, CheckCircle2, XCircle, Sparkles, HelpCircle, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DailyChallengeProps {
  className?: string;
}

export function DailyChallenge({ className = "" }: DailyChallengeProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  // Sample Daily LGS/YKS Challenge Question
  const sampleQuestion = {
    id: "q-2026-07-27",
    subject: "Matematik (Üslü İfadeler)",
    title: "⚡ Günün Bonus Sorusu (+50 XP Puan)",
    questionText: "2^8 × 5^6 işleminin sonucu kaç basamaklı bir sayıdır?",
    options: [
      { letter: "A", text: "6 basamaklı" },
      { letter: "B", text: "7 basamaklı" },
      { letter: "C", text: "8 basamaklı", isCorrect: true },
      { letter: "D", text: "9 basamaklı" },
    ],
    explanation: "2^8 × 5^6 = (2^2 × 2^6) × 5^6 = 4 × (2×5)^6 = 4 × 10^6. Bu sayı 4'ün yanına 6 tane 0 eklenmesiyle elde edilir ve 7 basamaklıdır (4000000). İpucu: Üssü eşitleyerek 10'un kuvveti haline getirdik!",
  };

  const handleSelect = (letter: string) => {
    if (isAnswered) return;
    setSelectedOption(letter);
    setIsAnswered(true);
  };

  const correctOption = sampleQuestion.options.find((o) => o.isCorrect)?.letter;
  const isCorrectSelection = selectedOption === correctOption;

  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white shadow-xl border border-indigo-800/60 relative overflow-hidden ${className}`}>
      <div className="absolute -right-6 -top-6 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-indigo-800/40 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-400/30 flex items-center gap-1">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
          </span>
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-1.5">
              {sampleQuestion.title}
            </h4>
            <span className="text-[10px] text-indigo-300 font-medium">{sampleQuestion.subject}</span>
          </div>
        </div>

        {isAnswered && (
          <Badge className={isCorrectSelection ? "bg-emerald-500 text-white font-bold" : "bg-rose-500 text-white font-bold"}>
            {isCorrectSelection ? "🎉 +50 XP Kazanıldı!" : "Tekrar Dene"}
          </Badge>
        )}
      </div>

      {/* Question Text */}
      <p className="text-xs font-semibold text-slate-100 mb-3 bg-white/5 p-2.5 rounded-xl border border-white/10">
        {sampleQuestion.questionText}
      </p>

      {/* Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
        {sampleQuestion.options.map((opt) => {
          const isSelected = selectedOption === opt.letter;
          let btnStyle = "bg-white/5 hover:bg-white/15 text-slate-200 border-white/10";

          if (isAnswered) {
            if (opt.isCorrect) {
              btnStyle = "bg-emerald-600 text-white border-emerald-500 font-extrabold shadow-md";
            } else if (isSelected && !opt.isCorrect) {
              btnStyle = "bg-rose-600 text-white border-rose-500 font-extrabold shadow-md";
            } else {
              btnStyle = "bg-white/5 text-slate-500 border-white/5 opacity-50";
            }
          }

          return (
            <button
              key={opt.letter}
              type="button"
              disabled={isAnswered}
              onClick={() => handleSelect(opt.letter)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all duration-150 ${btnStyle}`}
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-bold text-[10px]">
                  {opt.letter}
                </span>
                <span>{opt.text}</span>
              </div>
              {isAnswered && opt.isCorrect && <CheckCircle2 className="w-4 h-4 text-white" />}
              {isAnswered && isSelected && !opt.isCorrect && <XCircle className="w-4 h-4 text-white" />}
            </button>
          );
        })}
      </div>

      {/* Explanation Banner */}
      {isAnswered && (
        <div className="mt-3 p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-700/60 text-[11px] text-indigo-200 space-y-1 animate-fade-in">
          <div className="font-bold flex items-center gap-1 text-amber-300">
            <Sparkles className="w-3.5 h-3.5" /> Detaylı Soru Çözümü:
          </div>
          <p className="leading-relaxed opacity-95">{sampleQuestion.explanation}</p>
        </div>
      )}
    </div>
  );
}
