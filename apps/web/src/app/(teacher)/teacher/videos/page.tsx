"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video as VideoIcon, Plus, Trash2, ExternalLink, PlayCircle, Loader2, CheckCircle, AlertCircle, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { apiGet, apiPost, apiDelete, apiPatch } from "@/lib/api";
import { useRouter } from "next/navigation";

interface TeacherAssignment {
    _id: string;
    gradeId: { _id: string; level: number };
    subjectId: { _id: string; name: string; gradeLevel: number };
}

interface Video {
    _id: string;
    title: string;
    description: string;
    videoUrl: string;
    gradeLevel: number;
    subjectId: { _id: string; name: string };
    views: number;
}

export default function TeacherVideosPage() {
    const router = useRouter();
    const [videos, setVideos] = useState<Video[]>([]);
    const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Video | null>(null);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const [formData, setFormData] = useState({ title: "", description: "", videoUrl: "", assignmentId: "" });
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Video | null>(null);
    const [editFormData, setEditFormData] = useState({ title: "", description: "", videoUrl: "" });

    useEffect(() => { fetchVideos(); fetchAssignments(); }, []);
    useEffect(() => { if (feedback) { const t = setTimeout(() => setFeedback(null), 3000); return () => clearTimeout(t); } }, [feedback]);

    const fetchVideos = async () => {
        try {
            const userStr = localStorage.getItem("user");
            const user = userStr ? JSON.parse(userStr) : null;
            if (!user) return;
            const res = await apiGet(`/education/videos?teacherId=${user.id || user._id || user.userId}`);
            if (res.ok) setVideos(await res.json());
        } catch (error) { console.error("Error fetching videos:", error); }
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
                title: formData.title, description: formData.description, videoUrl: formData.videoUrl,
                subjectId: selectedAssignment.subjectId._id, gradeLevel: selectedAssignment.gradeId.level,
            };
            const res = await apiPost("/education/videos", payload);
            if (res.ok) {
                setIsDialogOpen(false); fetchVideos();
                setFormData({ title: "", description: "", videoUrl: "", assignmentId: "" });
                setFeedback({ type: "success", message: "Video başarıyla eklendi!" });
            } else { setFeedback({ type: "error", message: "Video eklenirken hata oluştu." }); }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSubmitting(true);
        try {
            const res = await apiDelete(`/education/videos/${deleteTarget._id}`);
            if (res.ok) { setDeleteDialogOpen(false); setDeleteTarget(null); fetchVideos(); setFeedback({ type: "success", message: "Video silindi." }); }
            else { setFeedback({ type: "error", message: "Silme başarısız." }); }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); }
        finally { setSubmitting(false); }
    };

    const openEditDialog = (vid: Video) => {
        setEditTarget(vid);
        setEditFormData({ title: vid.title, description: vid.description || "", videoUrl: vid.videoUrl });
        setEditDialogOpen(true);
    };

    const handleEdit = async () => {
        if (!editTarget) return;
        if (!editFormData.videoUrl.trim()) {
            setFeedback({ type: "error", message: "Video URL boş olamaz." });
            return;
        }
        setSubmitting(true);
        try {
            const res = await apiPatch(`/education/videos/${editTarget._id}`, editFormData);
            if (res.ok) {
                setEditDialogOpen(false);
                setEditTarget(null);
                fetchVideos();
                setFeedback({ type: "success", message: "Video güncellendi!" });
            } else {
                const err = await res.json().catch(() => ({}));
                setFeedback({ type: "error", message: err.message || "Güncelleme başarısız." });
            }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader title="Video Kütüphanesi" description="Ders anlatım videolarınızı yönetin.">
                <Button onClick={() => setIsDialogOpen(true)} disabled={assignments.length === 0}>
                    <Plus className="h-4 w-4" /> Video Ekle
                </Button>
            </PageHeader>

            {feedback && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-toast-in ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}>
                    {feedback.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {feedback.message}
                </div>
            )}

            {!loading && assignments.length === 0 && (
                <EmptyState icon={AlertCircle} title="Ders ataması yok" description="Bu işlem için önce size bir ders-sınıf ataması yapılmalı."
                    action={{ label: "Atanan Derslerimi Gör", onClick: () => router.push("/teacher/classes") }}
                />
            )}

            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton h-64 rounded-2xl" />)}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {videos.map((vid) => (
                        <Card key={vid._id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <Badge variant="secondary" className="w-fit">{vid.subjectId?.name}</Badge>
                                <CardTitle className="text-lg truncate mt-2" title={vid.title}>{vid.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="aspect-video bg-muted rounded-xl flex items-center justify-center relative group cursor-pointer" onClick={() => window.open(vid.videoUrl, '_blank')}>
                                    <PlayCircle className="h-12 w-12 text-primary opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                                </div>
                                <p className="text-sm text-muted-foreground truncate">{vid.description || "Açıklama yok"}</p>
                            </CardContent>
                            <CardFooter className="flex justify-between border-t pt-4">
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(vid)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setDeleteTarget(vid); setDeleteDialogOpen(true); }}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Button size="sm" variant="outline" asChild>
                                    <a href={vid.videoUrl} target="_blank">İzle <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></a>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                    {videos.length === 0 && assignments.length > 0 && (
                        <div className="col-span-full">
                            <EmptyState icon={VideoIcon} title="Henüz video eklenmemiş" description="Yeni bir video eklemek için yukarıdaki butonu kullanın." />
                        </div>
                    )}
                </div>
            )}

            {/* Create Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Yeni Video Ekle</DialogTitle>
                        <DialogDescription>YouTube veya başka bir platformdan video linki ekleyin.</DialogDescription>
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
                            <Label>Video Başlığı</Label>
                            <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Örn: Hücre Bölünmesi Konu Anlatımı" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Video URL</Label>
                            <Input value={formData.videoUrl} onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
                        </div>
                        <div className="grid gap-2">
                            <Label>Açıklama</Label>
                            <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Video hakkında kısa bilgi..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>İptal</Button>
                        <Button onClick={handleCreate} disabled={submitting || !formData.assignmentId || !formData.title || !formData.videoUrl}>
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Ekle
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Video Sil</DialogTitle>
                        <DialogDescription>&quot;{deleteTarget?.title}&quot; videosu silinecektir. Emin misiniz?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Sil
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Video Düzenle</DialogTitle>
                        <DialogDescription>Video bilgilerini güncelleyin.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Video Başlığı</Label>
                            <Input value={editFormData.title} onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Video URL</Label>
                            <Input value={editFormData.videoUrl} onChange={(e) => setEditFormData({ ...editFormData, videoUrl: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Açıklama</Label>
                            <Input value={editFormData.description} onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>İptal</Button>
                        <Button onClick={handleEdit} disabled={submitting || !editFormData.videoUrl.trim()}>
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Güncelle
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
