"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, HelpCircle, RotateCcw, Award, Check, Sparkles, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface OpticFormProps {
  mode: "edit" | "view";
  questionCount: number;
  optionsCount: number;
  studentAnswers: string[];
  answerKey?: string[];
  title?: string;
  studentName?: string;
  onChange?: (index: number, answer: string) => void;
  onClearAll?: () => void;
  className?: string;
}

export function OpticForm({
  mode,
  questionCount,
  optionsCount,
  studentAnswers,
  answerKey,
  title,
  studentName,
  onChange,
  onClearAll,
  className,
}: OpticFormProps) {
  const [activeFilter, setActiveFilter] = useState<"ALL" | "CORRECT" | "INCORRECT" | "EMPTY">("ALL");

  // Options A, B, C, D, E...
  const options = Array.from({ length: optionsCount }).map((_, j) => String.fromCharCode(65 + j));

  // Compute Statistics
  let correctCount = 0;
  let incorrectCount = 0;
  let emptyCount = 0;

  Array.from({ length: questionCount }).forEach((_, i) => {
    const studentAns = studentAnswers[i] || "";
    const correctAns = answerKey?.[i] || "";

    if (!studentAns || studentAns === "") {
      emptyCount++;
    } else if (correctAns && studentAns === correctAns) {
      correctCount++;
    } else if (correctAns && studentAns !== correctAns) {
      incorrectCount++;
    }
  });

  const answeredCount = questionCount - emptyCount;
  const completionPct = Math.round((answeredCount / Math.max(1, questionCount)) * 100);

  // Calculate Net score (4 yanlış 1 doğruyu götürür, 3 şıklıysa 3)
  const penaltyDivider = optionsCount >= 4 ? 4 : 3;
  const netScore = Math.max(0, parseFloat((correctCount - (incorrectCount / penaltyDivider)).toFixed(2)));
  const accuracyPct = Math.round((correctCount / Math.max(1, questionCount)) * 100);

  // Performance Rating Label
  const getPerformanceBadge = (pct: number) => {
    if (pct >= 90) return { label: "Mükemmel", color: "bg-emerald-500/15 text-emerald-700 border-emerald-300" };
    if (pct >= 75) return { label: "Çok İyi", color: "bg-blue-500/15 text-blue-700 border-blue-300" };
    if (pct >= 50) return { label: "Başarılı", color: "bg-indigo-500/15 text-indigo-700 border-indigo-300" };
    if (pct >= 30) return { label: "Geliştirilebilir", color: "bg-amber-500/15 text-amber-700 border-amber-300" };
    return { label: "Tekrar Yapılmalı", color: "bg-rose-500/15 text-rose-700 border-rose-300" };
  };

  const perfRating = getPerformanceBadge(accuracyPct);

  // Filtered Questions Index List
  const questionIndices = Array.from({ length: questionCount }).map((_, i) => i).filter((i) => {
    if (mode === "edit" || activeFilter === "ALL") return true;
    const studentAns = studentAnswers[i] || "";
    const correctAns = answerKey?.[i] || "";
    if (activeFilter === "CORRECT") return studentAns !== "" && correctAns !== "" && studentAns === correctAns;
    if (activeFilter === "INCORRECT") return studentAns !== "" && correctAns !== "" && studentAns !== correctAns;
    if (activeFilter === "EMPTY") return !studentAns || studentAns === "";
    return true;
  });

  return (
    <div className={cn("space-y-4 font-sans select-none", className)}>
      {/* ─── OPTIC HEADER BANNER ────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-primary/20 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-2.5 py-0.5 rounded-full border border-indigo-400/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                {mode === "edit" ? "ÖSYM / LGS Optik Form" : "Optik Sınav Analiz Raporu"}
              </span>
              {studentName && (
                <span className="text-xs text-slate-300 font-medium border-l border-slate-700 pl-2">
                  👤 {studentName}
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mt-1 tracking-tight">
              {title || "Optik Cevap Anahtarı"}
            </h3>
          </div>

          {/* Edit Mode Header Actions & Progress */}
          {mode === "edit" && (
            <div className="flex items-center gap-3 self-end sm:self-center">
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-300">
                  <span className="text-white font-extrabold text-sm">{answeredCount}</span> / {questionCount} Soru
                </div>
                <div className="text-[10px] text-indigo-300 font-medium">%{completionPct} Dolduruldu</div>
              </div>
              {onClearAll && answeredCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  className="h-8 text-xs text-rose-300 hover:text-rose-100 hover:bg-rose-500/20 px-2.5 border border-rose-500/30"
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Temizle
                </Button>
              )}
            </div>
          )}

          {/* View Mode Summary Scorecard Header */}
          {mode === "view" && (
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-inner">
              <div className="text-center">
                <div className="text-xs text-slate-300 font-medium">Net Score</div>
                <div className="text-lg font-black text-amber-300">{netScore}</div>
              </div>
              <div className="h-7 w-[1px] bg-white/20" />
              <div className="text-center">
                <div className="text-xs text-slate-300 font-medium">Başarı</div>
                <div className="text-lg font-black text-emerald-400">%{accuracyPct}</div>
              </div>
              <Badge variant="outline" className={cn("text-xs font-bold px-2 py-0.5 ml-1 border shadow-sm", perfRating.color)}>
                {perfRating.label}
              </Badge>
            </div>
          )}
        </div>

        {/* Progress Bar for Edit Mode */}
        {mode === "edit" && (
          <div className="mt-3 w-full bg-slate-800/80 rounded-full h-2 p-0.5 border border-slate-700/50">
            <div
              className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-1.5 rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        )}
      </div>

      {/* ─── REVIEW FILTER BAR (VIEW MODE ONLY) ───────────────────────────── */}
      {mode === "view" && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border">
          <div className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 pl-2">
            <Filter className="w-3.5 h-3.5 text-primary" /> Soruları Filtrele:
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setActiveFilter("ALL")}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1",
                activeFilter === "ALL"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              )}
            >
              Tümü <Badge variant="secondary" className="h-4 px-1.5 text-[10px] ml-1">{questionCount}</Badge>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("CORRECT")}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1",
                activeFilter === "CORRECT"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-emerald-700 hover:bg-emerald-100/60"
              )}
            >
              ✓ Doğrular <Badge className="h-4 px-1.5 text-[10px] ml-1 bg-emerald-700 text-white">{correctCount}</Badge>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("INCORRECT")}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1",
                activeFilter === "INCORRECT"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-rose-700 hover:bg-rose-100/60"
              )}
            >
              ✗ Yanlışlar <Badge className="h-4 px-1.5 text-[10px] ml-1 bg-rose-700 text-white">{incorrectCount}</Badge>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("EMPTY")}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1",
                activeFilter === "EMPTY"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-amber-700 hover:bg-amber-100/60"
              )}
            >
              ○ Boşlar <Badge className="h-4 px-1.5 text-[10px] ml-1 bg-amber-700 text-white">{emptyCount}</Badge>
            </button>
          </div>
        </div>
      )}

      {/* ─── OPTICAL QUESTION GRID ────────────────────────────────────────── */}
      {questionIndices.length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-500 bg-slate-50 rounded-2xl border border-dashed">
          Seçilen filtreye ait soru bulunamadı.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
          {questionIndices.map((i) => {
            const studentAns = studentAnswers[i] || "";
            const correctAns = answerKey?.[i] || "";

            let rowStatus: "correct" | "incorrect" | "empty" | "none" = "none";
            if (mode === "view" && correctAns) {
              if (studentAns === correctAns) rowStatus = "correct";
              else if (studentAns === "") rowStatus = "empty";
              else rowStatus = "incorrect";
            }

            return (
              <div
                key={i}
                className={cn(
                  "relative flex flex-col gap-2 p-3 rounded-2xl border transition-all duration-200 shadow-sm min-w-0 group",
                  mode === "edit" && studentAns !== "" && "border-slate-400 bg-slate-50/80 shadow-md ring-1 ring-slate-400/30",
                  mode === "edit" && studentAns === "" && "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md",
                  mode === "view" && rowStatus === "correct" && "border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50/70",
                  mode === "view" && rowStatus === "incorrect" && "border-rose-300 bg-rose-50/40 hover:bg-rose-50/70",
                  mode === "view" && rowStatus === "empty" && "border-amber-300 bg-amber-50/40 hover:bg-amber-50/70"
                )}
              >
                {/* Top Question Bar */}
                <div className="flex items-center justify-between border-b pb-1.5 border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center text-[11px]">
                      {i + 1}
                    </span>
                    Soru
                  </span>

                  {/* Status Indicator Badges in View Mode */}
                  {mode === "view" && (
                    <div>
                      {rowStatus === "correct" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Doğru
                        </span>
                      )}
                      {rowStatus === "incorrect" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3 text-rose-600" /> Yanlış
                        </span>
                      )}
                      {rowStatus === "empty" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          <HelpCircle className="w-3 h-3 text-amber-600" /> Boş
                        </span>
                      )}
                    </div>
                  )}

                  {/* Clear Button for Individual Question in Edit Mode */}
                  {mode === "edit" && studentAns !== "" && (
                    <button
                      type="button"
                      onClick={() => onChange && onChange(i, "")}
                      className="text-[10px] text-slate-400 hover:text-rose-600 transition-colors font-medium px-1"
                      title="İşareti Temizle"
                    >
                      Sil
                    </button>
                  )}
                </div>

                {/* Option Bubbles Grid */}
                <div className="flex items-center justify-around py-1">
                  {options.map((letter) => {
                    const isSelected = studentAns === letter;
                    const isCorrect = correctAns === letter;

                    let bubbleClass = "bg-white text-slate-600 border-slate-300 hover:border-slate-500 hover:bg-slate-50";

                    if (mode === "edit") {
                      if (isSelected) {
                        bubbleClass = "bg-slate-900 text-white border-slate-900 shadow-md scale-105 ring-2 ring-slate-900/20";
                      } else {
                        bubbleClass = "bg-white text-slate-600 border-slate-300 hover:border-slate-900 hover:text-slate-900 hover:scale-105";
                      }
                    } else if (mode === "view") {
                      if (isCorrect && isSelected) {
                        // Student selected the correct answer
                        bubbleClass = "bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-500/30 shadow-md scale-105 font-black";
                      } else if (isSelected && !isCorrect) {
                        // Student selected wrong answer
                        bubbleClass = "bg-rose-600 text-white border-rose-600 ring-2 ring-rose-500/30 shadow-md scale-105 font-black";
                      } else if (isCorrect && !isSelected) {
                        // Correct answer key (student missed it)
                        bubbleClass = "bg-emerald-100 text-emerald-800 border-2 border-emerald-500 border-dashed font-black scale-105 animate-pulse";
                      } else {
                        bubbleClass = "bg-slate-50 text-slate-300 border-slate-200 opacity-60";
                      }
                    }

                    return (
                      <button
                        key={letter}
                        type="button"
                        disabled={mode === "view"}
                        onClick={() => {
                          if (mode === "edit" && onChange) {
                            onChange(i, isSelected ? "" : letter);
                          }
                        }}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all duration-150 shrink-0 select-none relative",
                          mode === "edit" && "cursor-pointer active:scale-95",
                          mode === "view" && "cursor-default",
                          bubbleClass
                        )}
                      >
                        {letter}

                        {/* Extra Indicator Icon Badges for View Mode */}
                        {mode === "view" && isCorrect && isSelected && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[9px] shadow">
                            ✓
                          </span>
                        )}
                        {mode === "view" && isSelected && !isCorrect && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] shadow">
                            ✕
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Correct Answer Tooltip Banner for Incorrect/Empty in View Mode */}
                {mode === "view" && rowStatus !== "correct" && correctAns && (
                  <div className="mt-1 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                    <span className="text-slate-500">Doğru Cevap:</span>
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold px-2 py-0">
                      {correctAns}
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
