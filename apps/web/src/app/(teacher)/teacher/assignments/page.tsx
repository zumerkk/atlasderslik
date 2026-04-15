"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Plus, Calendar, Trash2, Loader2, CheckCircle, AlertCircle, Upload, File as FileIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

interface TeacherAssignment { _id: string; gradeId: { _id: string; level: number }; subjectId: { _id: string; name: string; gradeLevel: number }; }
interface Assignment { _id: string; title: string; description: string; dueDate: string; subjectId: { _id: string; name: string }; gradeLevel: number; attachments?: string[]; }

export default function TeacherAssignmentsPage() {
    const router = useRouter();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [formData, setFormData] = useState({ title: "", description: "", dueDate: "", assignmentId: "" });
    const [attachments, setAttachments] = useState<{name: string, url: string}[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { fetchAssignments(); fetchTeacherAssignments(); }, []);
    useEffect(() => { if (feedback) { const t = setTimeout(() => setFeedback(null), 3000); return () => clearTimeout(t); } }, [feedback]);

    const fetchAssignments = async () => {
        try {
            const userStr = localStorage.getItem("user");
            const user = userStr ? JSON.parse(userStr) : null;
            if (!user) return;
            const res = await apiGet(`/education/assignments?teacherId=${user.id || user._id || user.userId}`);
            if (res.ok) setAssignments(await res.json());
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const fetchTeacherAssignments = async () => {
        try { const res = await apiGet("/education/teacher-assignments/mine"); if (res.ok) setTeacherAssignments(await res.json()); } catch (error) { console.error(error); }
    };

    const selectedAssignment = teacherAssignments.find(a => a._id === formData.assignmentId);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            setFeedback({ type: "error", message: "Dosya boyutu 10MB'dan küçük olmalıdır." });
            return;
        }
        setSubmitting(true);
        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64 = event.target?.result as string;
                const res = await apiPost("/education/upload", { file: base64, filename: file.name });
                if (res.ok) {
                    const data = await res.json();
                    setAttachments(prev => [...prev, { name: file.name, url: data.url }]);
                    setFeedback({ type: "success", message: "Dosya eklendi!" });
                } else {
                    setFeedback({ type: "error", message: "Dosya yüklenemedi." });
                }
                setSubmitting(false);
            };
            reader.readAsDataURL(file);
        } catch {
            setFeedback({ type: "error", message: "Hata oluştu." });
            setSubmitting(false);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleCreate = async () => {
        if (!selectedAssignment) return;
        setSubmitting(true);
        try {
            const res = await apiPost("/education/assignments", {
                title: formData.title, 
                description: formData.description, 
                dueDate: formData.dueDate,
                subjectId: selectedAssignment.subjectId._id, 
                gradeLevel: selectedAssignment.gradeId.level,
                attachments: attachments.map(a => a.url)
            });
            if (res.ok) { 
                setIsDialogOpen(false); 
                fetchAssignments(); 
                setFormData({ title: "", description: "", dueDate: "", assignmentId: "" }); 
                setAttachments([]);
                setFeedback({ type: "success", message: "Ödev oluşturuldu!" }); 
            }
            else { setFeedback({ type: "error", message: "Ödev eklenemedi." }); }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSubmitting(true);
        try {
            const res = await apiDelete(`/education/assignments/${deleteTarget._id}`);
            if (res.ok) { setDeleteDialogOpen(false); setDeleteTarget(null); fetchAssignments(); setFeedback({ type: "success", message: "Ödev silindi." }); }
        } catch (error) { console.error(error); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader title="Ödev Yönetimi" description="Öğrencilerinize ödev verin ve takip edin.">
                <Button onClick={() => setIsDialogOpen(true)} disabled={teacherAssignments.length === 0}><Plus className="h-4 w-4" /> Ödev Oluştur</Button>
            </PageHeader>

            {feedback && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-toast-in ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                    {feedback.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{feedback.message}
                </div>
            )}

            {!loading && teacherAssignments.length === 0 && (
                <EmptyState icon={AlertCircle} title="Ders ataması yok" description="Önce size ders-sınıf ataması yapılmalı."
                    action={{ label: "Atanan Derslerimi Gör", onClick: () => router.push("/teacher/classes") }} />
            )}

            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-52 rounded-2xl" />)}</div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {assignments.map((a) => (
                        <Card key={a._id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <Badge variant="outline">{a.subjectId?.name}</Badge>
                                    <Badge variant={new Date(a.dueDate) < new Date() ? "destructive" : "success"}>{new Date(a.dueDate) < new Date() ? "Süresi Doldu" : "Aktif"}</Badge>
                                </div>
                                <CardTitle className="text-lg truncate mt-2" title={a.title}>{a.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-sm text-muted-foreground line-clamp-3">{a.description}</p>
                                {a.attachments && a.attachments.length > 0 && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="secondary" className="text-[10px]"><FileIcon className="h-3 w-3 mr-1" /> {a.attachments.length} Ek</Badge>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4" />Son Teslim: {format(new Date(a.dueDate), "dd.MM.yyyy")}</div>
                            </CardContent>
                            <CardFooter className="flex justify-between border-t pt-4">
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setDeleteTarget(a); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                                <Button size="sm" variant="outline">Teslimleri Gör</Button>
                            </CardFooter>
                        </Card>
                    ))}
                    {assignments.length === 0 && teacherAssignments.length > 0 && (
                        <div className="col-span-full"><EmptyState icon={BookOpen} title="Henüz ödev yok" description="Yeni ödev oluşturmak için butonu kullanın." /></div>
                    )}
                </div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Yeni Ödev Ver</DialogTitle><DialogDescription>Ödev detaylarını giriniz.</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2"><Label>Atanmış Dersim</Label>
                            <Select value={formData.assignmentId} onValueChange={(val) => setFormData({ ...formData, assignmentId: val })}>
                                <SelectTrigger><SelectValue placeholder="Sınıf + Ders Seçin" /></SelectTrigger>
                                <SelectContent>{teacherAssignments.map(a => (<SelectItem key={a._id} value={a._id}>{a.gradeId?.level}. Sınıf • {a.subjectId?.name}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2"><Label>Başlık</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Örn: Hafta Sonu Çalışması" /></div>
                        <div className="grid gap-2"><Label>Son Teslim Tarihi</Label><Input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} /></div>
                        <div className="grid gap-2"><Label>Açıklama</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Ödev içeriği..." /></div>
                        
                        {/* Attachments Section */}
                        <div className="grid gap-2 border-t pt-4">
                            <Label className="flex items-center justify-between">
                                Dosya Ekleri (Opsiyonel)
                                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={submitting} className="h-8">
                                    {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                                    Dosya Yükle
                                </Button>
                            </Label>
                            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                            
                            {attachments.length > 0 ? (
                                <div className="space-y-2 mt-2">
                                    {attachments.map((file, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 rounded-lg border bg-muted/20 text-sm">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <FileIcon className="h-4 w-4 text-blue-500 shrink-0" />
                                                <span className="truncate">{file.name}</span>
                                            </div>
                                            <button 
                                                onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                                                className="text-destructive hover:bg-destructive/10 p-1 rounded-md shrink-0 transition-colors"
                                                type="button"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground text-center py-2 bg-muted/20 rounded-lg border border-dashed">
                                    Henüz dosya eklenmedi
                                </p>
                            )}
                        </div>

                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>İptal</Button>
                        <Button onClick={handleCreate} disabled={submitting || !formData.assignmentId || !formData.title || !formData.dueDate}>{submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Oluştur</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Ödev Sil</DialogTitle><DialogDescription>&quot;{deleteTarget?.title}&quot; silinecek. Emin misiniz?</DialogDescription></DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 animate-spin" />} Sil</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
