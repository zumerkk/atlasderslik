"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Loader2, CheckCircle, AlertCircle, Pencil, Trash2, FileText } from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

interface Subject { _id: string; name: string; }
interface Unit { _id: string; name: string; }
interface Topic { _id: string; name: string; order: number; objective?: string; }

export default function TopicsPage() {
    const [selectedGrade, setSelectedGrade] = useState<number>(5);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>("");
    const [units, setUnits] = useState<Unit[]>([]);
    const [selectedUnit, setSelectedUnit] = useState<string>("");
    const [topics, setTopics] = useState<Topic[]>([]);
    const [newTopicName, setNewTopicName] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const [editItem, setEditItem] = useState<Topic | null>(null);
    const [editName, setEditName] = useState("");
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteItem, setDeleteItem] = useState<Topic | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    useEffect(() => { fetchSubjects(selectedGrade); }, [selectedGrade]);
    useEffect(() => { if (selectedSubject) fetchUnits(selectedSubject); else { setUnits([]); setSelectedUnit(""); } }, [selectedSubject]);
    useEffect(() => { if (selectedUnit) fetchTopics(selectedUnit); else setTopics([]); }, [selectedUnit]);
    useEffect(() => { if (feedback) { const t = setTimeout(() => setFeedback(null), 3000); return () => clearTimeout(t); } }, [feedback]);

    const fetchSubjects = async (grade: number) => {
        try {
            const res = await apiGet(`/education/subjects?gradeLevel=${grade}`);
            if (res.ok) { const data = await res.json(); setSubjects(data); setSelectedSubject(data.length > 0 ? data[0]._id : ""); }
        } catch (error) { console.error(error); }
    };

    const fetchUnits = async (subjectId: string) => {
        try {
            const res = await apiGet(`/education/units?subjectId=${subjectId}`);
            if (res.ok) { const data = await res.json(); setUnits(data); setSelectedUnit(data.length > 0 ? data[0]._id : ""); }
        } catch (error) { console.error(error); }
    };

    const fetchTopics = async (unitId: string) => {
        setLoading(true);
        try {
            const res = await apiGet(`/education/topics?unitId=${unitId}`);
            if (res.ok) setTopics(await res.json());
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTopicName || !selectedUnit) return;
        setSubmitting(true); setFeedback(null);
        try {
            const res = await apiPost("/education/topics", { name: newTopicName, unitId: selectedUnit, order: topics.length + 1 });
            if (res.ok) { setNewTopicName(""); setFeedback({ type: "success", message: "Konu başarıyla eklendi!" }); fetchTopics(selectedUnit); }
            else { const data = await res.json().catch(() => ({})); setFeedback({ type: "error", message: data.message || "Konu eklenemedi." }); }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); } finally { setSubmitting(false); }
    };

    const handleEdit = async () => {
        if (!editItem) return;
        setSubmitting(true);
        try {
            const res = await apiPatch(`/education/topics/${editItem._id}`, { name: editName });
            if (res.ok) { setFeedback({ type: "success", message: "Konu güncellendi!" }); setEditDialogOpen(false); fetchTopics(selectedUnit); }
            else { setFeedback({ type: "error", message: "Güncelleme başarısız." }); }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); } finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        if (!deleteItem) return;
        setSubmitting(true);
        try {
            const res = await apiDelete(`/education/topics/${deleteItem._id}`);
            if (res.ok) { setFeedback({ type: "success", message: "Konu silindi!" }); setDeleteDialogOpen(false); fetchTopics(selectedUnit); }
            else { setFeedback({ type: "error", message: "Silme başarısız." }); }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); } finally { setSubmitting(false); }
    };

    const selectClass = "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring";

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader title="Konular" description="Üniteler altındaki konuları ve kazanımları yönetin." />

            {/* Filters */}
            <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                    {[5, 6, 7, 8].map((g) => (
                        <Button key={g} variant={selectedGrade === g ? "default" : "outline"} size="sm" onClick={() => setSelectedGrade(g)}>
                            {g}. Sınıf
                        </Button>
                    ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <label className="text-sm font-medium mb-1.5 block">Ders Seçimi</label>
                        <select className={selectClass} value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} disabled={subjects.length === 0}>
                            {subjects.length === 0 && <option>Bu sınıfta ders yok</option>}
                            {subjects.map(s => (<option key={s._id} value={s._id}>{s.name}</option>))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="text-sm font-medium mb-1.5 block">Ünite Seçimi</label>
                        <select className={selectClass} value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} disabled={units.length === 0 || !selectedSubject}>
                            {units.length === 0 ? <option>Ünite yok</option> : units.map(u => (<option key={u._id} value={u._id}>{u.name}</option>))}
                        </select>
                    </div>
                </div>
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
                            <label htmlFor="topic" className="text-sm font-medium">Yeni Konu Ekle</label>
                            <Input id="topic" placeholder="Örn: Mayoz bölünme evreleri" value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)} disabled={!selectedUnit} required />
                        </div>
                        <Button type="submit" disabled={!selectedUnit || submitting}>
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
                </div>
            ) : topics.length === 0 ? (
                <EmptyState icon={FileText} title="Henüz konu eklenmemiş" description="Yukarıdaki formu kullanarak konu ekleyin." />
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">Sıra</TableHead>
                            <TableHead>Konu Adı</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {topics.map((t) => (
                            <TableRow key={t._id}>
                                <TableCell className="font-semibold">{t.order}</TableCell>
                                <TableCell>{t.name}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => { setEditItem(t); setEditName(t.name); setEditDialogOpen(true); }}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setDeleteItem(t); setDeleteDialogOpen(true); }}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            {/* Dialogs */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Konu Düzenle</DialogTitle><DialogDescription>Konu adını güncelleyin.</DialogDescription></DialogHeader>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="my-4" />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>İptal</Button>
                        <Button onClick={handleEdit} disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 animate-spin" />} Kaydet</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Konu Sil</DialogTitle>
                        <DialogDescription>&quot;{deleteItem?.name}&quot; silinecek. Emin misiniz?</DialogDescription>
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
