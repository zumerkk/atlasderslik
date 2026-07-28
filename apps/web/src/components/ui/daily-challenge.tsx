"use client";

import React, { useState } from "react";
import { Zap, CheckCircle2, XCircle, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiGet, apiPost } from "@/lib/api";

export interface DailyChallengeData {
  id?: string;
  subject: string;
  questionText: string;
  options: { letter: string; text: string }[];
  alreadyAnswered: boolean;
  correctLetter?: string;
  explanation?: string;
  wasCorrect?: boolean;
}

interface DailyChallengeProps {
  data?: DailyChallengeData | null;
  loading?: boolean;
  onAnswered?: () => void;
  className?: string;
}

export function DailyChallenge({ data, loading = false, onAnswered, className = "" }: DailyChallengeProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Result comes back from the server — the correct answer is never in the page
  // before the student answers, so it can't be read out of the network payload.
  const [result, setResult] = useState<{ correct: boolean; correctLetter: string; explanation: string; xpAwarded: number } | null>(null);

  const answered = !!result || !!data?.alreadyAnswered;
  const correctLetter = result?.correctLetter ?? data?.correctLetter;
  const explanation = result?.explanation ?? data?.explanation;
  const wasCorrect = result?.correct ?? data?.wasCorrect;

  const handleSelect = async (letter: string) => {
    if (answered || submitting) return;
    setSelected(letter);
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiPost("/gamification/daily-challenge/answer", { letter });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Cevap gönderilemedi");
      }
      setResult(await res.json());
      onAnswered?.();
    } catch (e: any) {
      setError(e?.message || "Cevap gönderilirken hata oluştu.");
      setSelected(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !data) {
    return (
      <div className={`p-4 rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white shadow-xl border border-indigo-800/60 ${className}`}>
        <div className="flex items-center gap-2 text-xs text-indigo-200">
          <Loader2 className="w-4 h-4 animate-spin" /> Günün sorusu hazırlanıyor...
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white shadow-xl border border-indigo-800/60 relative overflow-hidden ${className}`}>
      <div className="absolute -right-6 -top-6 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between border-b border-indigo-800/40 pb-2.5 mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-400/30 shrink-0">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
          </span>
          <div className="min-w-0">
            <h4 className="text-sm font-black text-white truncate">⚡ Günün Bonus Sorusu (+50 XP)</h4>
            <span className="text-[10px] text-indigo-300 font-medium">{data.subject} · her gün yenilenir</span>
          </div>
        </div>

        {answered && (
          <Badge className={`shrink-0 font-bold ${wasCorrect ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
            {wasCorrect ? `🎉 +${result?.xpAwarded ?? 50} XP` : "Yarın tekrar dene"}
          </Badge>
        )}
      </div>

      <p className="text-xs font-semibold text-slate-100 mb-3 bg-white/5 p-2.5 rounded-xl border border-white/10 leading-relaxed">
        {data.questionText}
      </p>

      {error && (
        <div className="mb-2 text-[11px] text-rose-200 bg-rose-950/60 border border-rose-700/60 rounded-lg px-2.5 py-1.5">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
        {data.options.map((opt) => {
          const isSelected = selected === opt.letter;
          const isCorrect = answered && correctLetter === opt.letter;
          const isWrongPick = answered && isSelected && correctLetter !== opt.letter;

          let style = "bg-white/5 hover:bg-white/15 text-slate-200 border-white/10";
          if (isCorrect) style = "bg-emerald-600 text-white border-emerald-500 font-extrabold shadow-md";
          else if (isWrongPick) style = "bg-rose-600 text-white border-rose-500 font-extrabold shadow-md";
          else if (answered) style = "bg-white/5 text-slate-500 border-white/5 opacity-50";

          return (
            <button
              key={opt.letter}
              type="button"
              disabled={answered || submitting}
              onClick={() => handleSelect(opt.letter)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 transition-all duration-150 text-left ${style}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-bold text-[10px] shrink-0">
                  {opt.letter}
                </span>
                <span className="truncate">{opt.text}</span>
              </div>
              {submitting && isSelected && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
              {isCorrect && <CheckCircle2 className="w-4 h-4 shrink-0" />}
              {isWrongPick && <XCircle className="w-4 h-4 shrink-0" />}
            </button>
          );
        })}
      </div>

      {answered && explanation && (
        <div className="mt-3 p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-700/60 text-[11px] text-indigo-200 space-y-1 animate-fade-in">
          <div className="font-bold flex items-center gap-1 text-amber-300">
            <Sparkles className="w-3.5 h-3.5" /> Detaylı Çözüm:
          </div>
          <p className="leading-relaxed opacity-95">{explanation}</p>
        </div>
      )}

      {answered && !explanation && (
        <p className="text-[11px] text-indigo-300 text-center pt-1">Bugünün sorusunu tamamladın. Yarın yeni soru seni bekliyor!</p>
      )}
    </div>
  );
}
