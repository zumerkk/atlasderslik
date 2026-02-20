"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Plus, Calendar, Clock, Trash2, ExternalLink, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { useRouter } from "next/navigation";

interface TeacherAssignment {
    _id: string;
    gradeId: { _id: string; level: number };
    subjectId: { _id: string; name: string; gradeLevel: number };
}

interface LiveClass {
    _id: string;
    title: string;
    description: string;
    url: string;
    startTime: string;
    durationMinutes: number;
    subjectId: { _id: string; name: string };
    gradeLevel: number;
}

export default function TeacherLiveClassesPage() {
    const router = useRouter();
    const [classes, setClasses] = useState<LiveClass[]>([]);
    const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<LiveClass | null>(null);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const [formData, setFormData] = useState({
        title: "", description: "", url: "", startTime: "", durationMinutes: "40", assignmentId: "",
    });

    useEffect(() => { fetchClasses(); fetchAssignments(); }, []);
    useEffect(() => { if (feedback) { const t = setTimeout(() => setFeedback(null), 3000); return () => clearTimeout(t); } }, [feedback]);

    const fetchClasses = async () => {
        try {
            const res = await apiGet("/education/live-classes/teacher");
            if (res.ok) setClasses(await res.json());
        } catch (error) { console.error("Error fetching classes:", error); }
        finally { setLoading(false); }
    };

    const fetchAssignments = async () => {
        try {
            const res = await apiGet("/education/teacher-assignments/mine");
            if (res.ok) setAssignments(await res.json());
        } catch (error) { console.error("Error fetching assignments:", error); }
    };

    const selectedAssignment = assignments.find(a => a._id === formData.assignmentId);

    const handleCreate = async () => {
        if (!selectedAssignment) return;
        setSubmitting(true);
        try {
            const payload = {
                title: formData.title, description: formData.description, url: formData.url,
                startTime: new Date(formData.startTime), durationMinutes: Number(formData.durationMinutes),
                subjectId: selectedAssignment.subjectId._id, gradeLevel: selectedAssignment.gradeId.level,
            };
            const res = await apiPost("/education/live-classes", payload);
            if (res.ok) {
                setIsDialogOpen(false); fetchClasses();
                setFormData({ title: "", description: "", url: "", startTime: "", durationMinutes: "40", assignmentId: "" });
                setFeedback({ type: "success", message: "Canlı ders oluşturuldu!" });
            } else { setFeedback({ type: "error", message: "Ders oluşturulurken hata oluştu." }); }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSubmitting(true);
        try {
            const res = await apiDelete(`/education/live-classes/${deleteTarget._id}`);
            if (res.ok) { setDeleteDialogOpen(false); setDeleteTarget(null); fetchClasses(); setFeedback({ type: "success", message: "Ders silindi." }); }
            else { setFeedback({ type: "error", message: "Silme başarısız." }); }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader title="Canlı Derslerim" description="Oluşturduğunuz canlı dersleri yönetin.">
                <Button onClick={() => setIsDialogOpen(true)} disabled={assignments.length === 0}>
                    <Plus className="h-4 w-4" /> Yeni Canlı Ders
                </Button>
            </PageHeader>

            {/* Feedback */}
            {feedback && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-toast-in ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}>
                    {feedback.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {feedback.message}
                </div>
            )}

            {/* No-assignment warning */}
            {!loading && assignments.length === 0 && (
                <EmptyState icon={AlertCircle} title="Ders ataması yok" description="Bu işlem için önce size bir ders-sınıf ataması yapılmalı."
                    action={{ label: "Atanan Derslerimi Gör", onClick: () => router.push("/teacher/classes") }}
                />
            )}

            {/* Content */}
            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton h-56 rounded-2xl" />)}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {classes.map((cls) => (
                        <Card key={cls._id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <Badge variant="secondary">{cls.subjectId?.name}</Badge>
                                    {new Date(cls.startTime) < new Date()
                                        ? <Badge variant="destructive">Tamamlandı</Badge>
                                        : <Badge variant="success">Planlandı</Badge>
                                    }
                                </div>
                                <CardTitle className="text-lg mt-2">{cls.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>{new Date(cls.startTime).toLocaleDateString("tr-TR")}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    <span>{new Date(cls.startTime).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })} ({cls.durationMinutes} dk)</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-blue-600 truncate">
                                    <Video className="h-4 w-4 shrink-0" />
                                    <a href={cls.url} target="_blank" className="hover:underline truncate">{cls.url}</a>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between border-t pt-4">
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setDeleteTarget(cls); setDeleteDialogOpen(true); }}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button size="sm" asChild>
                                    <a href={cls.url} target="_blank">Derse Git <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></a>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                    {classes.length === 0 && assignments.length > 0 && (
                        <div className="col-span-full">
                            <EmptyState icon={Video} title="Henüz canlı ders yok" description="Yeni bir canlı ders oluşturmak için yukarıdaki butonu kullanın." />
                        </div>
                    )}
                </div>
            )}

            {/* Create Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Canlı Ders Oluştur</DialogTitle>
                        <DialogDescription>Zoom, Google Meet veya Jitsi linki ile ders oluşturun.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Atanmış Dersim</Label>
                            <Select value={formData.assignmentId} onValueChange={(val) => setFormData({ ...formData, assignmentId: val })}>
                                <SelectTrigger><SelectValue placeholder="Sınıf + Ders Seçin" /></SelectTrigger>
                                <SelectContent>
                                    {assignments.map(a => (<SelectItem key={a._id} value={a._id}>{a.gradeId?.level}. Sınıf • {a.subjectId?.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Ders Başlığı</Label>
                            <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Örn: Kareköklü İfadeler Soru Çözümü" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Ders Linki (URL)</Label>
                            <Input value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} placeholder="https://zoom.us/j/..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Başlangıç Tarihi/Saati</Label>
                                <Input type="datetime-local" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Süre (Dakika)</Label>
                                <Input type="number" value={formData.durationMinutes} onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>İptal</Button>
                        <Button onClick={handleCreate} disabled={submitting || !formData.assignmentId || !formData.title || !formData.url || !formData.startTime}>
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Oluştur
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Canlı Ders Sil</DialogTitle>
                        <DialogDescription>&quot;{deleteTarget?.title}&quot; dersi silinecektir. Emin misiniz?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Sil
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
