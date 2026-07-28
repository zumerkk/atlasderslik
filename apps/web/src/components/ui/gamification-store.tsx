"use client";

import React, { useState } from "react";
import { ShoppingBag, Sparkles, Check, Lock, Loader2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api";

export interface StoreItem {
  id: string;
  title: string;
  cost: number;
  icon: string;
  unlocked: boolean;
  affordable: boolean;
}

export interface StoreData {
  availableXp: number;
  earnedXp: number;
  spentXp: number;
  activeTitle: string | null;
  items: StoreItem[];
}

export interface XpBreakdownRow {
  label: string;
  count: number;
  xp: number;
}

interface GamificationStoreProps {
  data?: StoreData | null;
  breakdown?: XpBreakdownRow[];
  loading?: boolean;
  onChange?: () => void;
  className?: string;
}

export function GamificationStore({ data, breakdown = [], loading = false, onChange, className = "" }: GamificationStoreProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const act = async (endpoint: string, body: any, id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await apiPost(endpoint, body);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "İşlem başarısız");
      }
      onChange?.();
    } catch (e: any) {
      setError(e?.message || "İşlem sırasında hata oluştu.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={`p-4 rounded-2xl bg-card border border-border shadow-md space-y-3 ${className}`}>
      <div className="flex items-center justify-between border-b pb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 bg-amber-500/10 text-amber-600 rounded-xl shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-foreground truncate">🛍️ XP Ödül &amp; Unvan Mağazası</h4>
            <button
              type="button"
              onClick={() => setShowBreakdown((s) => !s)}
              className="text-[10px] text-muted-foreground hover:text-foreground underline truncate"
            >
              {showBreakdown ? "Detayı gizle" : "XP'yi nasıl kazandım?"}
            </button>
          </div>
        </div>

        <Badge variant="outline" className="bg-amber-500 text-white border-amber-600 font-black text-xs px-2.5 py-0.5 shrink-0">
          <Sparkles className="w-3.5 h-3.5 mr-1" /> {loading ? "..." : data?.availableXp ?? 0} XP
        </Badge>
      </div>

      {showBreakdown && (
        <div className="rounded-xl bg-muted/30 border border-border/60 p-2.5 space-y-1 text-[11px]">
          {breakdown.length === 0 ? (
            <p className="text-muted-foreground">Henüz XP kazandıran bir etkinlik yok.</p>
          ) : (
            <>
              {breakdown.map((b) => (
                <div key={b.label} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{b.label} <span className="opacity-60">×{b.count}</span></span>
                  <span className="font-bold text-foreground">+{b.xp}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t pt-1 mt-1">
                <span className="font-bold text-foreground">Toplam kazanılan</span>
                <span className="font-black text-emerald-600">{data?.earnedXp ?? 0} XP</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Harcanan</span>
                <span className="font-bold text-rose-600">−{data?.spentXp ?? 0} XP</span>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Mağaza yükleniyor...
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {(data?.items ?? []).map((it) => {
            const isActive = data?.activeTitle === it.id;
            return (
              <div
                key={it.id}
                className={`p-2.5 rounded-xl border text-center space-y-1.5 transition-all ${
                  isActive
                    ? "bg-amber-500/15 border-amber-400 ring-1 ring-amber-400/50"
                    : it.unlocked
                      ? "bg-amber-500/5 border-amber-300/60 dark:border-amber-900/60"
                      : "bg-muted/30 border-border"
                }`}
              >
                <div className={`text-2xl ${it.unlocked ? "" : "grayscale opacity-60"}`}>{it.icon}</div>
                <div className="text-xs font-bold text-foreground truncate" title={it.title}>
                  {it.title}
                </div>

                {it.unlocked ? (
                  isActive ? (
                    <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0 w-full justify-center">
                      <Star className="w-3 h-3 mr-0.5 fill-white" /> Aktif
                    </Badge>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busyId === it.id}
                      onClick={() => act("/gamification/store/active-title", { itemId: it.id }, it.id)}
                      className="h-6 text-[10px] px-2 w-full font-bold"
                    >
                      {busyId === it.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-2.5 h-2.5 mr-1" /> Kullan</>}
                    </Button>
                  )
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!it.affordable || busyId === it.id}
                    onClick={() => act("/gamification/store/buy", { itemId: it.id }, it.id)}
                    className="h-6 text-[10px] px-2 w-full font-bold"
                    title={it.affordable ? "Satın al" : `${it.cost} XP gerekli`}
                  >
                    {busyId === it.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Lock className="w-2.5 h-2.5 mr-1" /> {it.cost} XP</>}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
