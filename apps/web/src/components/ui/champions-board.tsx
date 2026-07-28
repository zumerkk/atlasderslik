"use client";

import React from "react";
import { Crown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface LeaderboardEntry {
  rank: number;
  name: string;
  isMe: boolean;
  tests: number;
  net: number;
  avgNet: number;
  avgScore: number;
  points: number;
}

export interface LeaderboardData {
  gradeLabel: string | null;
  weekly: LeaderboardEntry[];
  allTime: LeaderboardEntry[];
  me: LeaderboardEntry | null;
  peerCount: number;
}

interface ChampionsBoardProps {
  data?: LeaderboardData | null;
  loading?: boolean;
  className?: string;
}

const PODIUM = ["🥇", "🥈", "🥉"];

export function ChampionsBoard({ data, loading = false, className = "" }: ChampionsBoardProps) {
  const [tab, setTab] = React.useState<"weekly" | "allTime">("weekly");
  const list = tab === "weekly" ? data?.weekly ?? [] : data?.allTime ?? [];

  return (
    <div className={`p-4 rounded-2xl bg-card border border-border shadow-md space-y-3 ${className}`}>
      <div className="flex items-center justify-between border-b pb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 bg-amber-500/10 text-amber-600 rounded-xl shrink-0">
            <Crown className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-foreground truncate">🏆 Şampiyonlar Panosu</h4>
            <p className="text-[10px] text-muted-foreground truncate">
              {data?.gradeLabel ? `${data.gradeLabel} · ${data.peerCount} öğrenci` : "Sınıf arkadaşlarınla optik net sıralaması"}
            </p>
          </div>
        </div>

        <div className="flex gap-1 bg-muted/60 rounded-lg p-0.5 shrink-0">
          {(["weekly", "allTime"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${
                tab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "weekly" ? "Bu Hafta" : "Tüm Zamanlar"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Sıralama yükleniyor...
        </div>
      ) : list.length === 0 ? (
        <div className="py-6 text-center space-y-1">
          <div className="text-2xl">🏁</div>
          <p className="text-xs font-semibold text-foreground">
            {tab === "weekly" ? "Bu hafta henüz kimse test çözmedi" : "Henüz sıralama oluşmadı"}
          </p>
          <p className="text-[10px] text-muted-foreground">İlk optik testini çözen sen ol, panoda ilk sırayı kap!</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {list.map((e) => (
            <div
              key={`${e.rank}-${e.name}`}
              className={`flex items-center gap-2.5 p-2 rounded-xl border transition-colors ${
                e.isMe
                  ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20"
                  : e.rank <= 3
                    ? "bg-amber-500/5 border-amber-300/50"
                    : "bg-muted/20 border-border/60"
              }`}
            >
              <div className="w-7 text-center shrink-0 font-black text-sm">
                {e.rank <= 3 ? PODIUM[e.rank - 1] : <span className="text-muted-foreground text-xs">{e.rank}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-foreground truncate">
                  {e.name} {e.isMe && <span className="text-primary font-black">(Sen)</span>}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {e.tests} test · ort. {e.avgNet} net
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-black text-amber-600 dark:text-amber-400">{e.points}</div>
                <div className="text-[9px] text-muted-foreground">puan</div>
              </div>
            </div>
          ))}

          {/* If the student isn't in the visible top-N, pin their row below. */}
          {data?.me && !list.some((l) => l.isMe) && (
            <>
              <div className="text-center text-[10px] text-muted-foreground py-0.5">···</div>
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-primary/10 border border-primary/40">
                <div className="w-7 text-center shrink-0 text-xs font-black text-muted-foreground">{data.me.rank}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-foreground truncate">
                    {data.me.name} <span className="text-primary font-black">(Sen)</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {data.me.tests} test · ort. {data.me.avgNet} net
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-black text-amber-600 dark:text-amber-400">{data.me.points}</div>
                  <div className="text-[9px] text-muted-foreground">puan</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <p className="text-[9px] text-muted-foreground pt-1 border-t">
        Puan = (net × 10) + (çözülen test × 5). Gizlilik için soyadlar kısaltılır.
      </p>
    </div>
  );
}
