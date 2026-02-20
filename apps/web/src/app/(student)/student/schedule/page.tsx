"use client";

import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarDays, Clock, User, Video, FileText, MapPin, Timer } from "lucide-react";

const DAYS = [
    { value: 1, label: "Pazartesi" },
    { value: 2, label: "Salı" },
    { value: 3, label: "Çarşamba" },
    { value: 4, label: "Perşembe" },
    { value: 5, label: "Cuma" },
];

const TIME_SLOTS = ["09:00", "09:50", "10:40", "11:30", "13:00"];

const SUBJECT_COLORS: Record<string, string> = {
    "Matematik": "bg-blue-100 border-blue-300 text-blue-800",
    "Türkçe": "bg-rose-100 border-rose-300 text-rose-800",
    "Fen Bilimleri": "bg-emerald-100 border-emerald-300 text-emerald-800",
    "Sosyal Bilgiler": "bg-amber-100 border-amber-300 text-amber-800",
};

export default function StudentSchedulePage() {
    const [schedules, setSchedules] = useState<any[]>([]);
    const [events, setEvents] = useState<{ liveClasses: any[]; assignments: any[] }>({ liveClasses: [], assignments: [] });
    const [loading, setLoading] = useState(true);

    const todayDow = new Date().getDay();
    const todayMapped = todayDow === 0 ? 0 : todayDow;

    useEffect(() => {
        (async () => {
            try {
                const sRes = await apiGet("/education/schedules/student");
                const sData = await sRes.json();
                setSchedules(sData);

                // Get gradeLevel from first schedule entry
                if (sData.length > 0) {
                    const gradeLevel = sData[0].gradeId?.level || sData[0].subjectId?.gradeLevel;
                    if (gradeLevel) {
                        const evRes = await apiGet(`/education/calendar/events?gradeLevel=${gradeLevel}`);
                        setEvents(await evRes.json());
                    }
                }
            } catch { } finally { setLoading(false); }
        })();
    }, []);

    const getSlot = (day: number, startTime: string) =>
        schedules.find(s => s.dayOfWeek === day && s.startTime === startTime);

    const now = new Date();
    const upcomingLC = events.liveClasses.filter(lc => new Date(lc.startTime) > now).slice(0, 3);
    const upcomingAssignments = events.assignments.filter(a => new Date(a.dueDate) > now).slice(0, 3);

    // Find next class today
    const todaySlots = schedules
        .filter(s => s.dayOfWeek === todayMapped)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const nextClass = todaySlots.find(s => s.startTime > currentTime);

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader title="Ders Programım" description="Haftalık ders programın ve yaklaşan etkinlikler." />

            {loading ? (
                <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
            ) : schedules.length === 0 ? (
                <EmptyState icon={CalendarDays} title="Program bulunamadı" description="Henüz kayıtlı olduğun sınıfın ders programı oluşturulmamış." />
            ) : (
                <>
                    {/* Next Class Banner */}
                    {nextClass && (
                        <Card className="border-primary/30 bg-primary/5">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                    <Timer className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-primary">Sıradaki Ders</p>
                                    <p className="text-lg font-bold">{nextClass.subjectId?.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {nextClass.startTime} · {nextClass.teacherId?.firstName} {nextClass.teacherId?.lastName}
                                        {nextClass.room && ` · ${nextClass.room}`}
                                    </p>
                                </div>
                                <Badge variant="info" className="ml-auto">{nextClass.startTime}</Badge>
                            </CardContent>
                        </Card>
                    )}

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
                                                                    <p className="text-[10px] mt-0.5 opacity-70 flex items-center justify-center gap-0.5">
                                                                        <User className="h-2.5 w-2.5" />{entry.teacherId?.firstName} {entry.teacherId?.lastName}
                                                                    </p>
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

                    {/* Upcoming Events Row */}
                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Upcoming Live Classes */}
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center"><Video className="h-4 w-4 text-blue-500" /></div>
                                    <div><CardTitle className="text-sm">Yaklaşan Canlı Dersler</CardTitle></div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {upcomingLC.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-4">Yaklaşan canlı ders yok.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {upcomingLC.map((lc: any) => (
                                            <div key={lc._id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium truncate">{lc.title}</p>
                                                    <p className="text-[10px] text-muted-foreground">{lc.subjectId?.name} · {lc.teacherId?.firstName} {lc.teacherId?.lastName}</p>
                                                </div>
                                                <Badge variant="outline" className="text-[10px] shrink-0">
                                                    {new Date(lc.startTime).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Upcoming Assignments */}
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center"><FileText className="h-4 w-4 text-amber-500" /></div>
                                    <div><CardTitle className="text-sm">Yaklaşan Ödev Teslim Tarihleri</CardTitle></div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {upcomingAssignments.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-4">Yaklaşan ödev yok.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {upcomingAssignments.map((a: any) => (
                                            <div key={a._id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium truncate">{a.title}</p>
                                                    <p className="text-[10px] text-muted-foreground">{a.subjectId?.name}</p>
                                                </div>
                                                <Badge variant="warning" className="text-[10px] shrink-0">
                                                    {new Date(a.dueDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

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
