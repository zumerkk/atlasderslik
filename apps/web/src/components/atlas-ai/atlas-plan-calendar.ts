import type { AtlasStudyPlan } from "@repo/shared";

function escapeCalendar(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

// RFC 5545 lines are folded by UTF-8 octets, preserving Turkish characters.
function foldCalendarLine(value: string): string {
    const encoder = new TextEncoder();
    const lines: string[] = [];
    let line = "";
    let bytes = 0;
    for (const character of value) {
        const length = encoder.encode(character).length;
        if (bytes + length > 75) { lines.push(line); line = " "; bytes = 1; }
        line += character;
        bytes += length;
    }
    lines.push(line);
    return lines.join("\r\n");
}

export function atlasPlanCalendar(plan: AtlasStudyPlan): string {
    const stamp = new Date(plan.createdAt).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Atlas Derslik//AtlasAI//TR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:AtlasAI Çalışma Planı", "BEGIN:VTIMEZONE", "TZID:Europe/Istanbul", "BEGIN:STANDARD", "DTSTART:19700101T000000", "TZOFFSETFROM:+0300", "TZOFFSETTO:+0300", "TZNAME:TRT", "END:STANDARD", "END:VTIMEZONE"];
    for (const day of plan.days) for (const block of day.blocks) {
        if (block.kind === "break") continue;
        const date = day.date.replace(/-/g, "").slice(0, 8);
        const uid = `${plan.id}-${block.id}`.replace(/[^a-zA-Z0-9_-]/g, "");
        lines.push("BEGIN:VEVENT", `UID:${uid}@atlasderslik`, `DTSTAMP:${stamp}`, `DTSTART;TZID=Europe/Istanbul:${date}T${block.startTime.replace(":", "")}00`, `DTEND;TZID=Europe/Istanbul:${date}T${block.endTime.replace(":", "")}00`, `SUMMARY:${escapeCalendar(`${block.subject}: ${block.topic}`)}`, `DESCRIPTION:${escapeCalendar(`${block.activity}\n${block.reason}`)}`, "END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    return lines.map(foldCalendarLine).join("\r\n") + "\r\n";
}

export function downloadAtlasPlan(plan: AtlasStudyPlan): void {
    const url = URL.createObjectURL(new Blob([atlasPlanCalendar(plan)], { type: "text/calendar;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "AtlasAI-calisma-plani.ics";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
