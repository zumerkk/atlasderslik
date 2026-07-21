"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface OpticFormProps {
  mode: "edit" | "view";
  questionCount: number;
  optionsCount: number;
  studentAnswers: string[];
  answerKey?: string[];
  onChange?: (index: number, answer: string) => void;
  className?: string;
}

export function OpticForm({
  mode,
  questionCount,
  optionsCount,
  studentAnswers,
  answerKey,
  onChange,
  className,
}: OpticFormProps) {
  // Generate options like A, B, C, D...
  const getOptions = (count: number) => {
    return Array.from({ length: count }).map((_, j) => String.fromCharCode(65 + j));
  };

  const options = getOptions(optionsCount);

  // Split into columns for better layout if many questions
  // For small amounts, maybe just a grid. We'll use CSS grid.
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4", className)}>
      {Array.from({ length: questionCount }).map((_, i) => {
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
                "flex items-center gap-3 p-3 rounded-xl border bg-white shadow-sm transition-all",
                mode === "view" && rowStatus === "correct" && "border-emerald-200 bg-emerald-50/50",
                mode === "view" && rowStatus === "incorrect" && "border-rose-200 bg-rose-50/50",
                mode === "view" && rowStatus === "empty" && "border-amber-200 bg-amber-50/50"
            )}
          >
            <div className="w-8 text-right text-sm font-semibold text-slate-500 shrink-0">
              {i + 1}.
            </div>
            <div className="flex gap-2 flex-1 justify-center">
              {options.map((letter) => {
                const isSelected = studentAns === letter;
                const isCorrect = correctAns === letter;
                
                let bubbleClass = "bg-white text-slate-600 border-slate-300 hover:border-slate-400";
                
                if (mode === "edit") {
                    if (isSelected) {
                        bubbleClass = "bg-slate-800 text-white border-slate-800";
                    } else {
                        bubbleClass = "bg-white text-slate-500 border-slate-200 hover:border-primary hover:text-primary";
                    }
                } else if (mode === "view") {
                    if (isCorrect && isSelected) {
                        bubbleClass = "bg-emerald-500 text-white border-emerald-500 ring-2 ring-emerald-500/20";
                    } else if (isSelected && !isCorrect) {
                        bubbleClass = "bg-rose-500 text-white border-rose-500";
                    } else if (isCorrect && !isSelected) {
                        bubbleClass = "bg-emerald-100 text-emerald-700 border-emerald-400 border-dashed";
                    } else {
                        bubbleClass = "bg-slate-50 text-slate-300 border-slate-200";
                    }
                }

                return (
                  <button
                    key={letter}
                    type="button"
                    disabled={mode === "view"}
                    onClick={() => {
                        if (mode === "edit" && onChange) {
                            // Toggle
                            onChange(i, studentAns === letter ? "" : letter);
                        }
                    }}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all",
                      mode === "edit" && "cursor-pointer active:scale-95",
                      mode === "view" && "cursor-default",
                      bubbleClass
                    )}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
            
            {/* Show status icon in view mode */}
            {mode === "view" && (
                <div className="w-6 shrink-0 flex items-center justify-center">
                    {rowStatus === "correct" && <div className="text-emerald-500 font-bold text-lg">✓</div>}
                    {rowStatus === "incorrect" && <div className="text-rose-500 font-bold text-lg">✗</div>}
                    {rowStatus === "empty" && <div className="text-amber-500 text-xs font-bold px-1 rounded bg-amber-100">Boş</div>}
                </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
