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
import { Plus, Loader2, CheckCircle, AlertCircle, Pencil, Trash2, GraduationCap } from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

interface Grade { _id: string; level: number; label: string; isActive: boolean; }

export default function GradesPage() {
    const [grades, setGrades] = useState<Grade[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [newLevel, setNewLevel] = useState("");
    const [newLabel, setNewLabel] = useState("");
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const [editItem, setEditItem] = useState<Grade | null>(null);
    const [editLabel, setEditLabel] = useState("");
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteItem, setDeleteItem] = useState<Grade | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    useEffect(() => { fetchGrades(); }, []);
    useEffect(() => { if (feedback) { const t = setTimeout(() => setFeedback(null), 3000); return () => clearTimeout(t); } }, [feedback]);

    const fetchGrades = async () => {
        setLoading(true);
        try {
            const res = await apiGet("/education/grades");
            if (res.ok) setGrades(await res.json());
        } catch (error) { console.error("Failed to fetch grades", error); }
        finally { setLoading(false); }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLevel || !newLabel) return;
        setSubmitting(true); setFeedback(null);
        try {
            const res = await apiPost("/education/grades", { level: Number(newLevel), label: newLabel });
            if (res.ok) { setNewLevel(""); setNewLabel(""); setFeedback({ type: "success", message: "Sınıf başarıyla eklendi!" }); fetchGrades(); }
            else { const data = await res.json().catch(() => ({})); setFeedback({ type: "error", message: data.message || "Sınıf eklenemedi." }); }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); }
        finally { setSubmitting(false); }
    };

    const handleEdit = async () => {
        if (!editItem) return;
        setSubmitting(true);
        try {
            const res = await apiPatch(`/education/grades/${editItem._id}`, { label: editLabel });
            if (res.ok) { setFeedback({ type: "success", message: "Sınıf güncellendi!" }); setEditDialogOpen(false); fetchGrades(); }
            else { setFeedback({ type: "error", message: "Güncelleme başarısız." }); }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        if (!deleteItem) return;
        setSubmitting(true);
        try {
            const res = await apiDelete(`/education/grades/${deleteItem._id}`);
            if (res.ok) { setFeedback({ type: "success", message: "Sınıf silindi!" }); setDeleteDialogOpen(false); fetchGrades(); }
            else { setFeedback({ type: "error", message: "Silme başarısız." }); }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader
                title="Sınıflar"
                description="Eğitim seviyelerini (sınıfları) yönetin."
            />

            {/* Feedback */}
            {feedback && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-toast-in ${feedback.type === "success"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}>
                    {feedback.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {feedback.message}
                </div>
            )}

            {/* Create Form */}
            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="grid gap-2 flex-1">
                            <label htmlFor="level" className="text-sm font-medium">Seviye</label>
                            <Input id="level" type="number" placeholder="Örn: 5" value={newLevel} onChange={(e) => setNewLevel(e.target.value)} required />
                        </div>
                        <div className="grid gap-2 flex-1">
                            <label htmlFor="label" className="text-sm font-medium">Etiket</label>
                            <Input id="label" placeholder="Örn: 5. Sınıf" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} required />
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
            ) : grades.length === 0 ? (
                <EmptyState
                    icon={GraduationCap}
                    title="Henüz sınıf eklenmemiş"
                    description="Yukarıdaki formu kullanarak ilk sınıfı ekleyin."
                />
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Seviye</TableHead>
                            <TableHead>Etiket</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {grades.map((g) => (
                            <TableRow key={g._id}>
                                <TableCell className="font-semibold">{g.level}</TableCell>
                                <TableCell>{g.label}</TableCell>
                                <TableCell>
                                    <Badge variant={g.isActive !== false ? "success" : "destructive"}>
                                        {g.isActive !== false ? "Aktif" : "Pasif"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => { setEditItem(g); setEditLabel(g.label); setEditDialogOpen(true); }}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setDeleteItem(g); setDeleteDialogOpen(true); }}>
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
                        <DialogTitle>Sınıf Düzenle</DialogTitle>
                        <DialogDescription>Sınıf etiketini güncelleyin.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>İptal</Button>
                        <Button onClick={handleEdit} disabled={submitting}>
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            Kaydet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Sınıf Sil</DialogTitle>
                        <DialogDescription>
                            &quot;{deleteItem?.label}&quot; silinecek. Bu işlem geri alınamaz. Emin misiniz?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            Sil
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
