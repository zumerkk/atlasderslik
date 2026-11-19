"use client";

import React, { useEffect, useState } from "react";
import { Bot, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiGet, apiPost } from "@/lib/api";

interface AIQuizBuilderProps {
  onGenerated?: (title: string, count: number, keys: string[]) => void;
  className?: string;
}

export function AIQuizBuilder({ onGenerated, className = "" }: AIQuizBuilderProps) {
  const [topicInput, setTopicInput] = useState("");
  const [topics, setTopics] = useState<{ id: string; name: string; subject: string; gradeLevel: number; gradeId: string }[]>([]);
  const [topicId, setTopicId] = useState("");
  const [qCount, setQCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<{ questionText: string; options: { letter: string; text: string }[]; correctLetter: string }[]>([]);

  useEffect(() => {
    let active = true;
    apiGet("/atlas-ai/curriculum/scope", { retries: 0 }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Onaylı konular alınamadı.");
      if (!active) return;
      const list = data.topics || [];
      setTopics(list); setTopicId(list[0]?.id || "");
      if (!list.length) setError("Soru üretimi için sınıf ve ders müfredatını yönetici onaylamalı.");
    }).catch(error => { if (active) setError(error.message || "Onaylı konular alınamadı."); });
    return () => { active = false; };
  }, []);

  /**
   * Generates verified questions and their matching answer key within the
   * selected approved curriculum. Credentials stay on the API server.
   */
  const handleGenerate = async () => {
    const selectedTopic = topics.find(topic => topic.id === topicId);
    if (!selectedTopic) return;
    setGenerating(true);
    setDone(false);
    setError(null);

    try {
      const res = await apiPost("/ai/quiz", { topicId, topic: `${selectedTopic.gradeLevel}. sınıf ${selectedTopic.subject}: ${selectedTopic.name}. ${topicInput}`, count: qCount }, { timeout: 210000 });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "AtlasAI servisi yanıt vermedi");
      if (!data.ok || !Array.isArray(data.answerKey) || data.answerKey.length === 0) {
        throw new Error(data.message || "AI soru üretemedi");
      }

      setDone(true);
      setQuestions(data.questions || []);
      onGenerated?.(data.title || topicInput, data.answerKey.length, data.answerKey);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Test üretilemedi. Lütfen tekrar deneyin.");
    } finally {
      setGenerating(false);
    }
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
              AtlasAI Soru ve Cevap Anahtarı
            </h4>
            <p className="text-[10px] text-purple-200">Onaylı sınıf müfredatı içinde soruları ve bunlara ait cevap anahtarını hazırlar.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div className="sm:col-span-2 grid gap-1">
          <Label className="text-[10px] text-slate-300">Onaylı Ders / Konu</Label>
          <select value={topicId} onChange={e => setTopicId(e.target.value)} className="h-9 rounded-lg border border-white/20 bg-slate-900 px-2 text-xs text-white" disabled={!topics.length}>{!topics.length && <option>Onaylı müfredat bulunamadı</option>}{topics.map(topic => <option key={`${topic.gradeId}:${topic.id}`} value={topic.id}>{topic.gradeLevel}. sınıf · {topic.subject} · {topic.name}</option>)}</select>
          <Input
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            placeholder="İsteğe bağlı: zorluk veya soru türü"
            className="h-8 text-xs bg-white/10 border-white/20 text-white font-medium placeholder:text-slate-400"
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-[10px] text-slate-300">Soru Sayısı</Label>
          <Input
            type="number"
            min={1}
            max={20}
            value={qCount}
            onChange={(e) => setQCount(Number(e.target.value))}
            className="h-8 text-xs bg-white/10 border-white/20 text-white font-medium"
          />
        </div>
      </div>

      <Button
        type="button"
        onClick={handleGenerate}
        disabled={generating || !topicId || qCount < 1 || qCount > 20}
        className="w-full h-8 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md border border-purple-400/40"
      >
        {generating ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
        )}
        {generating ? "Sorular hazırlanıyor ve müfredat uygunluğu kontrol ediliyor…" : "Soruları ve cevap anahtarını hazırla"}
      </Button>

      {done && !error && (
        <div className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1 bg-emerald-950/60 p-2 rounded-lg border border-emerald-500/40">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> AI, sorulara birebir karşılık gelen cevap anahtarını doldurdu!
        </div>
      )}
      {done && questions.length > 0 && <details className="rounded-xl border border-white/20 bg-white/5 p-3 text-xs"><summary className="cursor-pointer font-semibold">Üretilen {questions.length} soruyu incele</summary><p className="my-2 text-amber-200">Bu cevap anahtarı yalnızca aşağıdaki sorular için geçerlidir. Öğrencilere bu soruları da iletin.</p><ol className="list-decimal space-y-3 pl-5">{questions.map((question, index) => <li key={index}><p>{question.questionText}</p>{question.options.map(option => <p key={option.letter} className="mt-1 text-slate-300">{option.letter}) {option.text}</p>)}<p className="mt-1 text-emerald-300">Doğru cevap: {question.correctLetter}</p></li>)}</ol></details>}

      {error && (
        <div className="text-[11px] text-rose-300 font-semibold bg-rose-950/60 p-2 rounded-lg border border-rose-500/40">
          {error}
        </div>
      )}
    </div>
  );
}
