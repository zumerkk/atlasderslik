"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Loader2, CheckCircle, AlertCircle, Pencil, Trash2, BookOpen } from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

interface Subject { _id: string; name: string; gradeLevel: number; isActive: boolean; }

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState("");
    const [selectedGrade, setSelectedGrade] = useState<number>(5);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const [editItem, setEditItem] = useState<Subject | null>(null);
    const [editName, setEditName] = useState("");
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteItem, setDeleteItem] = useState<Subject | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    useEffect(() => { fetchSubjects(selectedGrade); }, [selectedGrade]);
    useEffect(() => { if (feedback) { const t = setTimeout(() => setFeedback(null), 3000); return () => clearTimeout(t); } }, [feedback]);

    const fetchSubjects = async (grade: number) => {
        setLoading(true);
        try {
            const res = await apiGet(`/education/subjects?gradeLevel=${grade}`);
            if (res.ok) setSubjects(await res.json());
        } catch (error) { console.error("Failed to fetch subjects", error); }
        finally { setLoading(false); }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubjectName) return;
        setSubmitting(true); setFeedback(null);
        try {
            const res = await apiPost("/education/subjects", { name: newSubjectName, gradeLevel: selectedGrade });
            if (res.ok) { setNewSubjectName(""); setFeedback({ type: "success", message: "Ders başarıyla eklendi!" }); fetchSubjects(selectedGrade); }
            else { const data = await res.json().catch(() => ({})); setFeedback({ type: "error", message: data.message || "Ders eklenemedi." }); }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); }
        finally { setSubmitting(false); }
    };

    const handleEdit = async () => {
        if (!editItem) return;
        setSubmitting(true);
        try {
            const res = await apiPatch(`/education/subjects/${editItem._id}`, { name: editName });
            if (res.ok) { setFeedback({ type: "success", message: "Ders güncellendi!" }); setEditDialogOpen(false); fetchSubjects(selectedGrade); }
            else { setFeedback({ type: "error", message: "Güncelleme başarısız." }); }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        if (!deleteItem) return;
        setSubmitting(true);
        try {
            const res = await apiDelete(`/education/subjects/${deleteItem._id}`);
            if (res.ok) { setFeedback({ type: "success", message: "Ders silindi!" }); setDeleteDialogOpen(false); fetchSubjects(selectedGrade); }
            else { setFeedback({ type: "error", message: "Silme başarısız." }); }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader
                title="Dersler"
                description="Sınıf müfredatındaki dersleri yönetin."
            />

            {/* Grade Tabs */}
            <div className="flex gap-2">
                {[5, 6, 7, 8].map((g) => (
                    <Button key={g} variant={selectedGrade === g ? "default" : "outline"} size="sm" onClick={() => setSelectedGrade(g)}>
                        {g}. Sınıf
                    </Button>
                ))}
            </div>

            {/* Feedback */}
            {feedback && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-toast-in ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}>
                    {feedback.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {feedback.message}
                </div>
            )}

            {/* Create Form */}
            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={handleCreate} className="flex gap-4 items-end">
                        <div className="grid gap-2 flex-1">
                            <label htmlFor="subject" className="text-sm font-medium">Yeni Ders Ekle ({selectedGrade}. Sınıf)</label>
                            <Input id="subject" placeholder="Örn: Matematik" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} required />
                        </div>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            Ekle
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
            ) : subjects.length === 0 ? (
                <EmptyState icon={BookOpen} title="Bu sınıfta henüz ders yok" description="Yukarıdaki formu kullanarak ders ekleyin." />
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ders Adı</TableHead>
                            <TableHead>Sınıf</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {subjects.map((s) => (
                            <TableRow key={s._id}>
                                <TableCell className="font-semibold">{s.name}</TableCell>
                                <TableCell>{s.gradeLevel}. Sınıf</TableCell>
                                <TableCell>
                                    <Badge variant={s.isActive !== false ? "success" : "destructive"}>
                                        {s.isActive !== false ? "Aktif" : "Pasif"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => { setEditItem(s); setEditName(s.name); setEditDialogOpen(true); }}>
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
                    <DialogHeader><DialogTitle>Ders Düzenle</DialogTitle><DialogDescription>Ders adını güncelleyin.</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>İptal</Button>
                        <Button onClick={handleEdit} disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 animate-spin" />} Kaydet</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Ders Sil</DialogTitle>
                        <DialogDescription>&quot;{deleteItem?.name}&quot; silinecek. Bu işlem geri alınamaz.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 animate-spin" />} Sil</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
