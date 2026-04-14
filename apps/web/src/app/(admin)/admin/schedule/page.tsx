"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarDays, Plus, Trash2, Loader2, CheckCircle, AlertCircle, Clock, User } from "lucide-react";

const DAYS = [
    { value: 1, label: "Pazartesi" },
    { value: 2, label: "Salı" },
    { value: 3, label: "Çarşamba" },
    { value: 4, label: "Perşembe" },
    { value: 5, label: "Cuma" },
    { value: 6, label: "Cumartesi" },
    { value: 7, label: "Pazar" },
];

const SUBJECT_COLORS: Record<string, string> = {
    "Matematik": "bg-blue-100 border-blue-300 text-blue-800",
    "Türkçe": "bg-rose-100 border-rose-300 text-rose-800",
    "Fen Bilimleri": "bg-emerald-100 border-emerald-300 text-emerald-800",
    "Sosyal Bilgiler": "bg-amber-100 border-amber-300 text-amber-800",
    "İngilizce": "bg-violet-100 border-violet-300 text-violet-800",
    "Din Kültürü ve Ahlak Bilgisi": "bg-teal-100 border-teal-300 text-teal-800",
    "Din Kültürü": "bg-teal-100 border-teal-300 text-teal-800",
    "Hayat Bilgisi": "bg-orange-100 border-orange-300 text-orange-800",
    "T.C. İnkılap Tarihi ve Atatürkçülük": "bg-indigo-100 border-indigo-300 text-indigo-800",
    "T.C. İnkılap Tarihi": "bg-indigo-100 border-indigo-300 text-indigo-800",
    "Müzik": "bg-pink-100 border-pink-300 text-pink-800",
    "Beden Eğitimi": "bg-orange-100 border-orange-300 text-orange-800",
};

function gradeLabel(g: any) {
    return g?.label || `${g?.level}. Sınıf`;
}

export default function AdminSchedulePage() {
    const [grades, setGrades] = useState<any[]>([]);
    const [selectedGrade, setSelectedGrade] = useState<string>("");
    const [schedules, setSchedules] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [form, setForm] = useState({ subjectId: "", teacherId: "", dayOfWeek: "", startTime: "", endTime: "", room: "" });

    useEffect(() => { if (feedback) { const t = setTimeout(() => setFeedback(null), 3000); return () => clearTimeout(t); } }, [feedback]);

    // Load grades on mount
    useEffect(() => {
        (async () => {
            try {
                const [gRes, tRes] = await Promise.all([
                    apiGet("/education/grades"),
                    apiGet("/education/teacher-assignments"),
                ]);
                const gData = await gRes.json();
                const tData = await tRes.json();
                setGrades(gData);
                // Extract unique teachers from teacher assignments
                const uniqueTeachers = new Map();
                tData.forEach((ta: any) => {
                    if (ta.teacherId) uniqueTeachers.set(ta.teacherId._id, ta.teacherId);
                });
                setTeachers(Array.from(uniqueTeachers.values()));
                if (gData.length > 0) setSelectedGrade(gData[0]._id);
            } catch { } finally { setLoading(false); }
        })();
    }, []);

    // Load schedules + subjects when grade changes
    const fetchSchedules = useCallback(async () => {
        if (!selectedGrade) return;
        try {
            const [sRes, subRes] = await Promise.all([
                apiGet(`/education/schedules?gradeId=${selectedGrade}`),
                apiGet(`/education/subjects/all`),
            ]);
            setSchedules(await sRes.json());
            setSubjects(await subRes.json());
        } catch { }
    }, [selectedGrade]);

    useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

    const gradeLevel = grades.find(g => g._id === selectedGrade)?.level;

    // ─── Dynamic time slots: derive from existing schedules + allow adding new ───
    const timeSlots: { startTime: string; endTime: string }[] = [];
    const seenSlots = new Set<string>();
    schedules.forEach(s => {
        const key = `${s.startTime}-${s.endTime}`;
        if (!seenSlots.has(key)) {
            seenSlots.add(key);
            timeSlots.push({ startTime: s.startTime, endTime: s.endTime });
        }
    });
    // Sort by startTime
    timeSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

    const getSlot = (day: number, startTime: string) =>
        schedules.find(s => s.dayOfWeek === day && s.startTime === startTime);

    const handleAddClick = (day?: number, slot?: { startTime: string; endTime: string }) => {
        setForm({
            subjectId: "", teacherId: "",
            dayOfWeek: day ? String(day) : "",
            startTime: slot?.startTime || "",
            endTime: slot?.endTime || "",
            room: ""
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.subjectId || !form.teacherId || !form.dayOfWeek || !form.startTime || !form.endTime) return;
        setSaving(true);
        try {
            const res = await apiPost("/education/schedules", {
                gradeId: selectedGrade,
                subjectId: form.subjectId,
                teacherId: form.teacherId,
                dayOfWeek: Number(form.dayOfWeek),
                startTime: form.startTime,
                endTime: form.endTime,
                room: form.room,
            });
            if (res.ok) {
                setFeedback({ type: "success", message: "Ders slotu eklendi!" });
                setDialogOpen(false);
                fetchSchedules();
            } else {
                const err = await res.json();
                setFeedback({ type: "error", message: err.message || "Ekleme başarısız." });
            }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await apiDelete(`/education/schedules/${id}`);
            if (res.ok) {
                setFeedback({ type: "success", message: "Ders slotu silindi." });
                fetchSchedules();
            }
        } catch { setFeedback({ type: "error", message: "Silme başarısız." }); }
    };

    const gradeSubjects = subjects.filter(s => s.gradeLevel === gradeLevel);

    // Determine which days have schedules (filter empty weekend columns)
    const activeDays = DAYS.filter(d =>
        d.value <= 5 || schedules.some(s => s.dayOfWeek === d.value)
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader
                title="Ders Programı"
                description="Sınıflara göre haftalık ders programını yönetin."
            >
                <div className="flex items-center gap-3">
                    <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                        <SelectTrigger className="w-48"><SelectValue placeholder="Sınıf Seç" /></SelectTrigger>
                        <SelectContent>
                            {grades.map(g => (
                                <SelectItem key={g._id} value={g._id}>{gradeLabel(g)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedGrade && (
                        <Button onClick={() => handleAddClick()} size="sm">
                            <Plus className="h-4 w-4" /> Ders Ekle
                        </Button>
                    )}
                </div>
            </PageHeader>

            {feedback && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-toast-in ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                    {feedback.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{feedback.message}
                </div>
            )}

            {loading ? (
                <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
            ) : !selectedGrade ? (
                <EmptyState icon={CalendarDays} title="Sınıf Seçin" description="Haftalık ders programını görüntülemek için bir sınıf seçin." />
            ) : timeSlots.length === 0 ? (
                <EmptyState icon={CalendarDays} title="Henüz ders eklenmemiş" description="'Ders Ekle' butonunu kullanarak ilk dersi ekleyin. Saatleri siz belirlersiniz." />
            ) : (
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="border-b">
                                        <th className="p-3 text-left text-xs font-semibold text-muted-foreground w-24 bg-muted/30">
                                            <Clock className="h-4 w-4 inline mr-1" />Saat
                                        </th>
                                        {activeDays.map(d => (
                                            <th key={d.value} className="p-3 text-center text-xs font-semibold text-muted-foreground bg-muted/30">
                                                {d.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {timeSlots.map((slot, si) => (
                                        <tr key={si} className="border-b last:border-b-0">
                                            <td className="p-3 text-xs font-mono text-muted-foreground whitespace-nowrap bg-muted/10">
                                                {slot.startTime}
                                                <br />
                                                <span className="text-[10px]">{slot.endTime}</span>
                                            </td>
                                            {activeDays.map(day => {
                                                const entry = getSlot(day.value, slot.startTime);
                                                const subjectName = entry?.subjectId?.name || "";
                                                const colorClass = SUBJECT_COLORS[subjectName] || "bg-gray-100 border-gray-300 text-gray-800";
                                                return (
                                                    <td key={day.value} className="p-1.5 text-center align-top min-w-[140px]">
                                                        {entry ? (
                                                            <div className={`group relative rounded-xl border p-2.5 transition-all duration-200 hover:shadow-md cursor-default ${colorClass}`}>
                                                                <p className="text-xs font-bold">{subjectName}</p>
                                                                <p className="text-[10px] mt-0.5 opacity-70 flex items-center justify-center gap-1">
                                                                    <User className="h-3 w-3" />
                                                                    {entry.teacherId?.firstName} {entry.teacherId?.lastName}
                                                                </p>
                                                                {entry.room && <p className="text-[10px] opacity-50 mt-0.5">{entry.room}</p>}
                                                                <button
                                                                    onClick={() => handleDelete(entry._id)}
                                                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-white/60"
                                                                    title="Sil"
                                                                >
                                                                    <Trash2 className="h-3 w-3 text-red-500" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleAddClick(day.value, slot)}
                                                                className="w-full rounded-xl border border-dashed border-muted-foreground/20 p-2.5 text-muted-foreground/40 hover:border-primary/40 hover:text-primary/60 hover:bg-primary/5 transition-all duration-200"
                                                            >
                                                                <Plus className="h-4 w-4 mx-auto" />
                                                            </button>
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
            )}

            {/* Color Legend */}
            <div className="flex flex-wrap gap-3">
                {Object.entries(SUBJECT_COLORS).map(([name, cls]) => (
                    <Badge key={name} className={`${cls} border text-xs`}>{name}</Badge>
                ))}
            </div>

            {/* Add Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ders Slotu Ekle</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Gün</Label>
                                <Select value={form.dayOfWeek} onValueChange={v => setForm({ ...form, dayOfWeek: v })}>
                                    <SelectTrigger><SelectValue placeholder="Gün seçin" /></SelectTrigger>
                                    <SelectContent>
                                        {DAYS.map(d => (
                                            <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Sınıf/Salon (opsiyonel)</Label>
                                <Input value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} placeholder="Örn: A-101" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Başlangıç Saati</Label>
                                <Input
                                    type="time"
                                    value={form.startTime}
                                    onChange={e => setForm({ ...form, startTime: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Bitiş Saati</Label>
                                <Input
                                    type="time"
                                    value={form.endTime}
                                    onChange={e => setForm({ ...form, endTime: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Ders</Label>
                            <Select value={form.subjectId} onValueChange={v => setForm({ ...form, subjectId: v })}>
                                <SelectTrigger><SelectValue placeholder="Ders seçin" /></SelectTrigger>
                                <SelectContent>
                                    {gradeSubjects.map(s => (
                                        <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Öğretmen</Label>
                            <Select value={form.teacherId} onValueChange={v => setForm({ ...form, teacherId: v })}>
                                <SelectTrigger><SelectValue placeholder="Öğretmen seçin" /></SelectTrigger>
                                <SelectContent>
                                    {teachers.map(t => (
                                        <SelectItem key={t._id} value={t._id}>{t.firstName} {t.lastName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
                        <Button onClick={handleSave} disabled={saving || !form.subjectId || !form.teacherId || !form.dayOfWeek || !form.startTime || !form.endTime}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Ekle
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
