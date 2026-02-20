"use client";

import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarDays, Clock, User, Video, FileText, MapPin } from "lucide-react";

const DAYS = [
    { value: 1, label: "Pazartesi", short: "Pzt" },
    { value: 2, label: "Salı", short: "Sal" },
    { value: 3, label: "Çarşamba", short: "Çar" },
    { value: 4, label: "Perşembe", short: "Per" },
    { value: 5, label: "Cuma", short: "Cum" },
];

const TIME_SLOTS = ["09:00", "09:50", "10:40", "11:30", "13:00"];

const SUBJECT_COLORS: Record<string, string> = {
    "Matematik": "bg-blue-100 border-blue-300 text-blue-800",
    "Türkçe": "bg-rose-100 border-rose-300 text-rose-800",
    "Fen Bilimleri": "bg-emerald-100 border-emerald-300 text-emerald-800",
    "Sosyal Bilgiler": "bg-amber-100 border-amber-300 text-amber-800",
};

export default function TeacherSchedulePage() {
    const [schedules, setSchedules] = useState<any[]>([]);
    const [liveClasses, setLiveClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const todayDow = new Date().getDay(); // 0=Sun, 1=Mon...
    const todayMapped = todayDow === 0 ? 0 : todayDow; // 0 means weekend

    useEffect(() => {
        (async () => {
            try {
                const [sRes, lcRes] = await Promise.all([
                    apiGet("/education/schedules/teacher"),
                    apiGet("/education/live-classes/teacher"),
                ]);
                setSchedules(await sRes.json());
                setLiveClasses(await lcRes.json());
            } catch { } finally { setLoading(false); }
        })();
    }, []);

    const getSlot = (day: number, startTime: string) =>
        schedules.find(s => s.dayOfWeek === day && s.startTime === startTime);

    // Upcoming live classes (next 7 days)
    const now = new Date();
    const upcomingLC = liveClasses.filter(lc => new Date(lc.startTime) > now).slice(0, 5);

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader title="Ders Programım" description="Haftalık ders programınız ve yaklaşan etkinlikler." />

            {loading ? (
                <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
            ) : schedules.length === 0 ? (
                <EmptyState icon={CalendarDays} title="Program bulunamadı" description="Henüz size atanmış bir ders programı yok." />
            ) : (
                <>
                    {/* Weekly Grid */}
                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse min-w-[700px]">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="p-3 text-left text-xs font-semibold text-muted-foreground w-20 bg-muted/30">
                                                <Clock className="h-4 w-4 inline mr-1" />Saat
                                            </th>
                                            {DAYS.map(d => (
                                                <th key={d.value} className={`p-3 text-center text-xs font-semibold bg-muted/30 ${todayMapped === d.value ? "text-primary bg-primary/5" : "text-muted-foreground"}`}>
                                                    {d.label}
                                                    {todayMapped === d.value && <Badge variant="info" className="ml-1.5 text-[9px] px-1.5 py-0">Bugün</Badge>}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {TIME_SLOTS.map((startTime, si) => (
                                            <tr key={si} className="border-b last:border-b-0">
                                                <td className="p-3 text-xs font-mono text-muted-foreground bg-muted/10">{startTime}</td>
                                                {DAYS.map(day => {
                                                    const entry = getSlot(day.value, startTime);
                                                    const subjectName = entry?.subjectId?.name || "";
                                                    const colorClass = SUBJECT_COLORS[subjectName] || "bg-gray-100 border-gray-300 text-gray-800";
                                                    const isNow = todayMapped === day.value;
                                                    return (
                                                        <td key={day.value} className={`p-1.5 text-center align-top ${isNow ? "bg-primary/[0.02]" : ""}`}>
                                                            {entry ? (
                                                                <div className={`rounded-xl border p-2 transition-all hover:shadow-md ${colorClass}`}>
                                                                    <p className="text-xs font-bold">{subjectName}</p>
                                                                    <p className="text-[10px] mt-0.5 opacity-70">{(entry.gradeId as any)?.level}. Sınıf</p>
                                                                    {entry.room && <p className="text-[10px] opacity-50 flex items-center justify-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{entry.room}</p>}
                                                                </div>
                                                            ) : (
                                                                <div className="h-10" />
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Upcoming Events */}
                    {upcomingLC.length > 0 && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Video className="h-5 w-5 text-primary" /></div>
                                    <div><CardTitle className="text-base">Yaklaşan Canlı Dersler</CardTitle><CardDescription>Önümüzdeki planlanmış canlı dersleriniz</CardDescription></div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {upcomingLC.map((lc: any) => (
                                        <div key={lc._id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                                                <Video className="h-5 w-5 text-blue-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{lc.title}</p>
                                                <p className="text-xs text-muted-foreground">{lc.subjectId?.name} · {lc.gradeLevel}. Sınıf</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-xs font-medium">{new Date(lc.startTime).toLocaleDateString("tr-TR")}</p>
                                                <p className="text-xs text-muted-foreground">{new Date(lc.startTime).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Color Legend */}
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(SUBJECT_COLORS).map(([name, cls]) => (
                            <Badge key={name} className={`${cls} border text-[10px]`}>{name}</Badge>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
