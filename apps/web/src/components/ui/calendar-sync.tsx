"use client";

import React from "react";
import { Calendar, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendarSyncProps {
  title?: string;
  dueDate?: string;
  className?: string;
}

export function CalendarSync({
  title = "Ödev & Ders Etkinliği",
  dueDate = "2026-07-30",
  className = "",
}: CalendarSyncProps) {
  const handleGoogleCalendar = () => {
    const gUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      title
    )}&details=${encodeURIComponent("Atlas Derslik Etkinlik & Ödev Hatırlatıcısı")}`;
    window.open(gUrl, "_blank");
  };

  const handleDownloadICS = () => {
    const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Atlas Derslik//LMS Calendar//TR
BEGIN:VEVENT
SUMMARY:${title}
DESCRIPTION:Atlas Derslik Ödev Hatırlatıcısı
DTSTART:${dueDate.replace(/-/g, "")}T090000Z
DTEND:${dueDate.replace(/-/g, "")}T100000Z
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsData], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atlas-derslik-${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGoogleCalendar}
        className="h-7 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 font-semibold gap-1"
        title="Google Takvime Ekle"
      >
        <Calendar className="w-3.5 h-3.5 text-blue-600" /> Google Takvim
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleDownloadICS}
        className="h-7 text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-semibold gap-1"
        title="Apple / Outlook Takvime Ekle (.ics)"
      >
        <Download className="w-3.5 h-3.5 text-slate-600" /> Apple/iCal (.ics)
      </Button>
    </div>
  );
}
