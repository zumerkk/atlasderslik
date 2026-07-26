"use client";

import React, { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Timer, Coffee, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PomodoroTimerProps {
  className?: string;
}

export function PomodoroTimer({ className = "" }: PomodoroTimerProps) {
  const STUDY_TIME = 25 * 60; // 25 minutes
  const BREAK_TIME = 5 * 60;  // 5 minutes

  const [mode, setMode] = useState<"STUDY" | "BREAK">("STUDY");
  const [secondsLeft, setSecondsLeft] = useState<number>(STUDY_TIME);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedSessions, setCompletedSessions] = useState<number>(0);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isRunning && secondsLeft > 0) {
      timer = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      if (mode === "STUDY") {
        setCompletedSessions((prev) => prev + 1);
        setMode("BREAK");
        setSecondsLeft(BREAK_TIME);
      } else {
        setMode("STUDY");
        setSecondsLeft(STUDY_TIME);
      }
      setIsRunning(false);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, secondsLeft, mode]);

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(mode === "STUDY" ? STUDY_TIME : BREAK_TIME);
  };

  const switchMode = (newMode: "STUDY" | "BREAK") => {
    setIsRunning(false);
    setMode(newMode);
    setSecondsLeft(newMode === "STUDY" ? STUDY_TIME : BREAK_TIME);
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const totalModeSec = mode === "STUDY" ? STUDY_TIME : BREAK_TIME;
  const progressPct = Math.round(((totalModeSec - secondsLeft) / totalModeSec) * 100);

  return (
    <div className={`p-4 rounded-2xl bg-card border border-border shadow-md space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
            {mode === "STUDY" ? <Timer className="w-4 h-4" /> : <Coffee className="w-4 h-4 text-emerald-600" />}
          </span>
          <div>
            <h4 className="text-xs font-bold text-foreground">
              {mode === "STUDY" ? "Ders Çalışma Odak Sayacı (Pomodoro)" : "Mola Süresi"}
            </h4>
            <p className="text-[10px] text-muted-foreground">Odağınızı artırmak için 25dk ders / 5dk mola tekniği</p>
          </div>
        </div>

        <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5">
          🏆 {completedSessions} Oturum Tamamlandı
        </Badge>
      </div>

      {/* Main Timer Display */}
      <div className="flex items-center justify-between bg-muted/30 p-3 rounded-xl border border-muted">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTimer}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all shadow-sm ${
              isRunning ? "bg-amber-500 hover:bg-amber-600" : "bg-primary hover:bg-primary/90"
            }`}
          >
            {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <div>
            <div className="text-2xl font-black font-mono tracking-wider text-foreground">
              {formatTime(secondsLeft)}
            </div>
            <div className="text-[10px] text-muted-foreground font-semibold">
              {isRunning ? "Süre İşliyor..." : "Duraklatıldı"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => switchMode(mode === "STUDY" ? "BREAK" : "STUDY")}
            className="h-7 text-xs px-2"
          >
            {mode === "STUDY" ? "Mola Modu" : "Ders Modu"}
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={resetTimer} className="h-7 w-7" title="Sıfırla">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${mode === "STUDY" ? "bg-primary" : "bg-emerald-500"}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}
