"use client";

import React from "react";
import { MessageSquare, ExternalLink, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhatsAppSenderProps {
  studentName?: string;
  testTitle?: string;
  score?: number;
  correct?: number;
  incorrect?: number;
  empty?: number;
  net?: number;
  className?: string;
}

export function WhatsAppSender({
  studentName = "Öğrenci",
  testTitle = "Optik Sınav",
  score = 100,
  correct = 10,
  incorrect = 0,
  empty = 0,
  net = 10,
  className = "",
}: WhatsAppSenderProps) {
  const message = `Sayın Velimiz, Atlas Derslik üzerinden öğrencimiz ${studentName}'nin "${testTitle}" isimli sınav sonuç karne özeti:\n\n📊 Net: ${net}\n⭐ Puan: ${score}/100\n✅ Doğru: ${correct}\n❌ Yanlış: ${incorrect}\n⚪ Boş: ${empty}\n\nİyi çalışmalar dileriz.`;
  const encodedMsg = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/?text=${encodedMsg}`;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => window.open(whatsappUrl, "_blank")}
      className={`h-7 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 font-semibold gap-1.5 shadow-xs ${className}`}
      title="Veliye WhatsApp Karnesi Gönder"
    >
      <Send className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp Karnesi Gönder
    </Button>
  );
}
