"use client";

import React, { useState, useEffect } from "react";
import { ShoppingBag, Sparkles, Check, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Item {
  id: string;
  title: string;
  cost: number;
  unlocked: boolean;
  icon: string;
}

interface GamificationStoreProps {
  completedCount?: number;
  totalCorrect?: number;
  streakDays?: number;
  className?: string;
}

export function GamificationStore({
  completedCount = 0,
  totalCorrect = 0,
  streakDays = 1,
  className = "",
}: GamificationStoreProps) {
  // Real XP formula: 50 XP per completed test + 10 XP per correct answer + 25 XP per streak day
  const realXP = Math.max(50, completedCount * 50 + totalCorrect * 10 + streakDays * 25);
  const [xp, setXp] = useState(realXP);

  const [items, setItems] = useState<Item[]>([
    { id: "1", title: "Matematik Profesörü", cost: 100, unlocked: false, icon: "🎓" },
    { id: "2", title: "Sınav Dâhisi", cost: 200, unlocked: false, icon: "⚡" },
    { id: "3", title: "LGS Şampiyonu", cost: 300, unlocked: false, icon: "🏆" },
    { id: "4", title: "Fen Bilimi Üstadı", cost: 500, unlocked: false, icon: "🔬" },
  ]);

  useEffect(() => {
    // Load unlocked items from localStorage
    try {
      const saved = localStorage.getItem("atlas_unlocked_titles");
      if (saved) {
        const unlockedIds: string[] = JSON.parse(saved);
        setItems((prev) =>
          prev.map((it) => ({
            ...it,
            unlocked: unlockedIds.includes(it.id) || (it.id === "1" && realXP >= 100),
          }))
        );
      } else {
        setItems((prev) =>
          prev.map((it) => ({
            ...it,
            unlocked: it.id === "1" && realXP >= 100,
          }))
        );
      }
    } catch {}
  }, [realXP]);

  const handleBuy = (item: Item) => {
    if (xp < item.cost || item.unlocked) return;
    const newXp = xp - item.cost;
    setXp(newXp);

    const updated = items.map((i) => (i.id === item.id ? { ...i, unlocked: true } : i));
    setItems(updated);

    try {
      const unlockedIds = updated.filter((i) => i.unlocked).map((i) => i.id);
      localStorage.setItem("atlas_unlocked_titles", JSON.stringify(unlockedIds));
    } catch {}
  };

  return (
    <div className={`p-4 rounded-2xl bg-card border border-border shadow-md space-y-3 ${className}`}>
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-amber-500/10 text-amber-600 rounded-xl">
            <ShoppingBag className="w-5 h-5" />
          </span>
          <div>
            <h4 className="text-sm font-bold text-foreground">🛍️ XP Ödül &amp; Unvan Mağazası</h4>
            <p className="text-[10px] text-muted-foreground">Optik netleriniz ve soru çözümlerinizle kazandığınız gerçek XP puanları</p>
          </div>
        </div>

        <Badge variant="outline" className="bg-amber-500 text-white border-amber-600 font-black text-xs px-2.5 py-0.5">
          <Sparkles className="w-3.5 h-3.5 mr-1" /> {xp} XP (Canlı)
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {items.map((it) => (
          <div
            key={it.id}
            className={`p-2.5 rounded-xl border text-center space-y-1.5 transition-all ${
              it.unlocked ? "bg-amber-500/10 border-amber-300 dark:border-amber-900/60" : "bg-muted/30 border-border opacity-70"
            }`}
          >
            <div className="text-2xl">{it.icon}</div>
            <div className="text-xs font-bold text-foreground truncate" title={it.title}>
              {it.title}
            </div>
            {it.unlocked ? (
              <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0">
                <Check className="w-3 h-3 mr-0.5" /> Açıldı
              </Badge>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={xp < it.cost}
                onClick={() => handleBuy(it)}
                className="h-6 text-[10px] px-2 w-full font-bold"
              >
                <Lock className="w-2.5 h-2.5 mr-1" /> {it.cost} XP
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
