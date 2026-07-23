"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Loader2, CheckCircle, AlertCircle, Pencil, Trash2, BookOpen } from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

interface Grade {
    _id: string;
    level: number;
    label?: string;
}

interface Subject {
    _id: string;
    name: string;
    gradeLevel: number;
    gradeId?: Grade | string;
    isActive: boolean;
    zoomUrl?: string;
    zoomMeetingId?: string;
    zoomPasscode?: string;
}

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    const [newSubjectName, setNewSubjectName] = useState("");
    const [selectedCreateGradeId, setSelectedCreateGradeId] = useState<string>("");
    const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>("ALL");
    
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const [editItem, setEditItem] = useState<Subject | null>(null);
    const [editGradeId, setEditGradeId] = useState("");
    const [editName, setEditName] = useState("");
    const [editZoomUrl, setEditZoomUrl] = useState("");
    const [editZoomMeetingId, setEditZoomMeetingId] = useState("");
    const [editZoomPasscode, setEditZoomPasscode] = useState("");
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    const [deleteItem, setDeleteItem] = useState<Subject | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (feedback) {
            const t = setTimeout(() => setFeedback(null), 3000);
            return () => clearTimeout(t);
        }
    }, [feedback]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [gRes, sRes] = await Promise.all([
                apiGet("/education/grades"),
                apiGet("/education/subjects/all")
            ]);
            if (gRes.ok) {
                const gData: Grade[] = await gRes.json();
                setGrades(gData);
                if (gData.length > 0) {
                    setSelectedCreateGradeId(gData[0]._id);
                }
            }
            if (sRes.ok) {
                setSubjects(await sRes.json());
            }
        } catch (error) {
            console.error("Failed to fetch initial data", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjects = async () => {
        try {
            const res = await apiGet("/education/subjects/all");
            if (res.ok) setSubjects(await res.json());
        } catch (error) {
            console.error("Failed to fetch subjects", error);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubjectName || !selectedCreateGradeId) return;
        setSubmitting(true);
        setFeedback(null);
        try {
            const res = await apiPost("/education/subjects", {
                name: newSubjectName,
                gradeId: selectedCreateGradeId
            });
            if (res.ok) {
                setNewSubjectName("");
                setFeedback({ type: "success", message: "Ders başarıyla eklendi!" });
                fetchSubjects();
            } else {
                const data = await res.json().catch(() => ({}));
                setFeedback({ type: "error", message: data.message || "Ders eklenemedi." });
            }
        } catch {
            setFeedback({ type: "error", message: "Bir hata oluştu." });
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = async () => {
        if (!editItem) return;
        setSubmitting(true);
        try {
            const res = await apiPatch(`/education/subjects/${editItem._id}`, {
                name: editName,
                gradeId: editGradeId,
                zoomUrl: editZoomUrl,
                zoomMeetingId: editZoomMeetingId,
                zoomPasscode: editZoomPasscode
            });
            if (res.ok) {
                setFeedback({ type: "success", message: "Ders güncellendi!" });
                setEditDialogOpen(false);
                fetchSubjects();
            } else {
                setFeedback({ type: "error", message: "Güncelleme başarısız." });
            }
        } catch {
            setFeedback({ type: "error", message: "Bir hata oluştu." });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteItem) return;
        setSubmitting(true);
        try {
            const res = await apiDelete(`/education/subjects/${deleteItem._id}`);
            if (res.ok) {
                setFeedback({ type: "success", message: "Ders silindi!" });
                setDeleteDialogOpen(false);
                fetchSubjects();
            } else {
                setFeedback({ type: "error", message: "Silme başarısız." });
            }
        } catch {
            setFeedback({ type: "error", message: "Bir hata oluştu." });
        } finally {
            setSubmitting(false);
        }
    };

    const getGradeLabel = (s: Subject) => {
        if (typeof s.gradeId === 'object' && s.gradeId !== null) {
            return s.gradeId.label || `${s.gradeId.level}. Sınıf`;
        }
        if (typeof s.gradeId === 'string') {
            const g = grades.find(item => item._id === s.gradeId);
            if (g) return g.label || `${g.level}. Sınıf`;
        }
        return `${s.gradeLevel}. Sınıf`;
    };

    const filteredSubjects = subjects.filter(s => {
        if (selectedGradeFilter === "ALL") return true;
        const gId = typeof s.gradeId === 'object' ? s.gradeId?._id : s.gradeId;
        return gId === selectedGradeFilter;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader
                title="Dersler"
                description="Oluşturduğunuz sınıflara ait müfredat derslerini ve Zoom linklerini yönetin."
            />

            {/* Dynamic Grade Tabs */}
            <div className="flex flex-wrap gap-2">
                <Button
                    variant={selectedGradeFilter === "ALL" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedGradeFilter("ALL")}
                >
                    Tüm Sınıflar
                </Button>
                {grades.map((g) => (
                    <Button
                        key={g._id}
                        variant={selectedGradeFilter === g._id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedGradeFilter(g._id)}
                    >
                        {g.label || `${g.level}. Sınıf`}
                    </Button>
                ))}
            </div>

            {/* Feedback Notification */}
            {feedback && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-toast-in ${
                    feedback.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}>
                    {feedback.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {feedback.message}
                </div>
            )}

            {/* Create Form */}
            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={handleCreate} className="grid md:grid-cols-3 gap-4 items-end">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Hedef Sınıf</label>
                            <Select value={selectedCreateGradeId} onValueChange={setSelectedCreateGradeId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sınıf Seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                    {grades.map((g) => (
                                        <SelectItem key={g._id} value={g._id}>
                                            {g.label || `${g.level}. Sınıf`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="subject" className="text-sm font-medium">Ders Adı</label>
                            <Input
                                id="subject"
                                placeholder="Örn: Fen Bilimleri"
                                value={newSubjectName}
                                onChange={(e) => setNewSubjectName(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" disabled={submitting || !selectedCreateGradeId}>
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                            Ders Ekle
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Table */}
            {loading ? (
                <div className="space-y-3">
                    <div className="skeleton h-12 rounded-xl" />
                    <div className="skeleton h-12 rounded-xl" />
                    <div className="skeleton h-12 rounded-xl" />
                </div>
            ) : filteredSubjects.length === 0 ? (
                <EmptyState icon={BookOpen} title="Henüz ders yok" description="Seçili sınıfa ait ders eklemek için yukarıdaki formu kullanın." />
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ders Adı</TableHead>
                            <TableHead>Atandığı Sınıf</TableHead>
                            <TableHead>Zoom</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSubjects.map((s) => (
                            <TableRow key={s._id}>
                                <TableCell className="font-semibold">{s.name}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{getGradeLabel(s)}</Badge>
                                </TableCell>
                                <TableCell>
                                    {s.zoomUrl ? (
                                        <a href={s.zoomUrl} target="_blank" rel="noopener noreferrer">
                                            <Badge variant="info" className="cursor-pointer">🔗 Zoom</Badge>
                                        </a>
                                    ) : (
                                        <Badge variant="warning">Link Yok</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={s.isActive !== false ? "success" : "destructive"}>
                                        {s.isActive !== false ? "Aktif" : "Pasif"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => {
                                            setEditItem(s);
                                            setEditName(s.name);
                                            const gId = typeof s.gradeId === 'object' ? s.gradeId?._id : s.gradeId;
                                            setEditGradeId(gId || grades[0]?._id || "");
                                            setEditZoomUrl(s.zoomUrl || "");
                                            setEditZoomMeetingId(s.zoomMeetingId || "");
                                            setEditZoomPasscode(s.zoomPasscode || "");
                                            setEditDialogOpen(true);
                                        }}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setDeleteItem(s); setDeleteDialogOpen(true); }}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ders Düzenle</DialogTitle>
                        <DialogDescription>Ders bilgilerini, atandığı sınıfı ve Zoom linkini güncelleyin.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Sınıf</label>
                            <Select value={editGradeId} onValueChange={setEditGradeId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sınıf Seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                    {grades.map((g) => (
                                        <SelectItem key={g._id} value={g._id}>
                                            {g.label || `${g.level}. Sınıf`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Ders Adı</label>
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Zoom Link URL</label>
                            <Input placeholder="https://zoom.us/j/..." value={editZoomUrl} onChange={(e) => setEditZoomUrl(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Toplantı Kimliği</label>
                                <Input placeholder="914 188 8169" value={editZoomMeetingId} onChange={(e) => setEditZoomMeetingId(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Şifre</label>
                                <Input placeholder="123456" value={editZoomPasscode} onChange={(e) => setEditZoomPasscode(e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>İptal</Button>
                        <Button onClick={handleEdit} disabled={submitting}>
                            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Kaydet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ders Sil</DialogTitle>
                        <DialogDescription>&quot;{deleteItem?.name}&quot; silinecek. Bu işlem geri alınamaz.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Sil
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

