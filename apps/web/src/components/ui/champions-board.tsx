"use client";

import React from "react";
import { Trophy, Medal, Award, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Champion {
  rank: number;
  name: string;
  net: number;
  score: number;
  badge: string;
}

interface ChampionsBoardProps {
  className?: string;
}

export function ChampionsBoard({ className = "" }: ChampionsBoardProps) {
  const champions: Champion[] = [
    { rank: 1, name: "Ahmet Yılmaz", net: 18.5, score: 492, badge: "🥇 Haftanın Şampiyonu" },
    { rank: 2, name: "Zeynep Kaya", net: 17.2, score: 485, badge: "🥈 2. Derece" },
    { rank: 3, name: "Mehmet Demir", net: 16.8, score: 478, badge: "🥉 3. Derece" },
  ];

  return (
    <div className={`p-4 rounded-2xl bg-card border border-border shadow-md space-y-3 ${className}`}>
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-amber-500/10 text-amber-600 rounded-xl">
            <Crown className="w-5 h-5" />
          </span>
          <div>
            <h4 className="text-sm font-bold text-foreground">🏆 Haftalık Okul &amp; Sınıf Şampiyonlar Panosu</h4>
            <p className="text-[10px] text-muted-foreground">Optik test netlerine göre haftanın derece yapan ilk 3 öğrencisi</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] font-bold">
          Haftalık Güncel
        </Badge>
      </div>

      {/* Podium Grid */}
      <div className="grid grid-cols-3 gap-2 text-center pt-1">
        {/* 2nd Place */}
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-end">
          <div className="text-2xl mb-1">🥈</div>
          <div className="text-xs font-bold text-foreground truncate">{champions[1].name}</div>
          <div className="text-[11px] font-black text-blue-600 dark:text-blue-400">{champions[1].net} Net</div>
          <div className="text-[9px] text-muted-foreground">{champions[1].score} Puan</div>
        </div>

        {/* 1st Place - Gold Podium */}
        <div className="p-3 rounded-xl bg-gradient-to-b from-amber-500/20 via-amber-400/10 to-amber-500/20 border-2 border-amber-400 shadow-md flex flex-col justify-end scale-105 z-10">
          <div className="text-3xl mb-1 animate-pulse">🥇</div>
          <div className="text-xs font-black text-amber-950 dark:text-amber-300 truncate">{champions[0].name}</div>
          <div className="text-xs font-black text-amber-600 dark:text-amber-400">{champions[0].net} Net</div>
          <div className="text-[10px] font-bold text-amber-800 dark:text-amber-500">{champions[0].score} Puan</div>
        </div>

        {/* 3rd Place */}
        <div className="p-3 rounded-xl bg-amber-900/10 border border-amber-800/30 flex flex-col justify-end">
          <div className="text-2xl mb-1">🥉</div>
          <div className="text-xs font-bold text-foreground truncate">{champions[2].name}</div>
          <div className="text-[11px] font-black text-amber-700 dark:text-amber-400">{champions[2].net} Net</div>
          <div className="text-[9px] text-muted-foreground">{champions[2].score} Puan</div>
        </div>
      </div>
    </div>
  );
}
