"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Bot, Sparkles, Lightbulb, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiGet } from "@/lib/api";

interface AIStudyCoachProps {
  /** Refetch the tip when the student's stats change (e.g. after a submission). */
  refreshKey?: number;
  className?: string;
}

/**
 * All model calls go through the API (`/gamification/ai/*`). The Groq key stays
 * server-side — it used to be inlined here, which shipped it to every visitor.
 */
export function AIStudyCoach({ refreshKey = 0, className = "" }: AIStudyCoachProps) {
  const [tip, setTip] = useState<string>("");
  const [aiGenerated, setAiGenerated] = useState(false);
  const [fetchingTip, setFetchingTip] = useState(true);
  const [plan, setPlan] = useState<string | null>(null);
  const [planFocus, setPlanFocus] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTip = useCallback(async () => {
    setFetchingTip(true);
    setError(null);
    try {
      const res = await apiGet("/gamification/ai/coach-tip", { timeout: 25000 });
      if (!res.ok) throw new Error("Tavsiye alınamadı");
      const data = await res.json();
      setTip(data.tip);
      setAiGenerated(!!data.aiGenerated);
    } catch {
      setError("AI koçuna şu an ulaşılamıyor. Verilerin güvende, birazdan tekrar dene.");
    } finally {
      setFetchingTip(false);
    }
  }, []);

  useEffect(() => { fetchTip(); }, [fetchTip, refreshKey]);

  const generatePlan = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await apiGet("/gamification/ai/study-plan", { timeout: 30000 });
      if (!res.ok) throw new Error("Plan oluşturulamadı");
      const data = await res.json();
      setPlan(data.plan);
      setPlanFocus(data.focusSubjects || []);
    } catch {
      setError("Çalışma planı oluşturulamadı. Lütfen tekrar dene.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-800/60 relative overflow-hidden ${className}`}>
      <div className="absolute -right-6 -top-6 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-800/40 pb-2.5 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/30 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 text-indigo-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-black text-white">Atlas AI Çalışma Koçu</h4>
              {aiGenerated && (
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px] px-1.5 py-0">
                  ⚡ Canlı AI
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-indigo-200">Gerçek optik netlerine göre kişisel koçluk</p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={fetchingTip}
          onClick={fetchTip}
          className="h-7 text-xs bg-white/10 hover:bg-white/20 text-white border-white/20 shrink-0 self-start sm:self-center"
        >
          {fetchingTip ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />} Yenile
        </Button>
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 p-2.5 rounded-xl bg-amber-950/60 border border-amber-700/60 text-[11px] text-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs space-y-2 mb-3">
        <div className="flex items-center gap-1 text-amber-300 font-bold text-[11px]">
          <Lightbulb className="w-3.5 h-3.5" /> Koçunun tavsiyesi:
        </div>
        {fetchingTip && !tip ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verilerin analiz ediliyor...
          </div>
        ) : (
          <p className="text-slate-200 leading-relaxed font-medium">{tip}</p>
        )}
      </div>

      {plan ? (
        <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 space-y-2 animate-fade-in">
          {planFocus.length > 0 && (
            <div className="text-[10px] text-emerald-400 font-bold">
              Odak dersler: {planFocus.join(", ")}
            </div>
          )}
          <p className="font-semibold whitespace-pre-line leading-relaxed">{plan}</p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={generatePlan} disabled={generating}
              className="h-6 text-[10px] text-emerald-300 hover:text-white">
              {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : "Yeni plan"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPlan(null)}
              className="h-6 text-[10px] text-emerald-300 hover:text-white">
              Kapat
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          onClick={generatePlan}
          disabled={generating}
          className="w-full h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md border border-indigo-400/40"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300" />}
          {generating ? "Plan hazırlanıyor..." : "⚡ Bugünün akıllı çalışma planını oluştur"}
        </Button>
      )}
    </div>
  );
}
