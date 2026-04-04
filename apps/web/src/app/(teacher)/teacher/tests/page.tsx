"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Loader2, Pencil, Trash2, ClipboardList, CheckCircle, AlertCircle, Eye, Clock, Image, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

interface Question {
    _id: string; text: string; options: string[]; correctAnswer: number; difficulty: string;
    subjectId: { _id: string; name: string }; gradeLevel: number; imageUrl?: string; type?: string;
}

interface Test {
    _id: string; title: string; description: string; gradeLevel: number;
    subjectId: { _id: string; name: string }; questionIds: Question[];
    duration: number; isActive: boolean; createdAt: string;
}

export default function TeacherTestsPage() {
    const [tests, setTests] = useState<Test[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewTest, setPreviewTest] = useState<Test | null>(null);
    const [editingTest, setEditingTest] = useState<Test | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteItem, setDeleteItem] = useState<Test | null>(null);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [subjects, setSubjects] = useState<{ _id: string; name: string; gradeLevel: number }[]>([]);
    const [formData, setFormData] = useState({ title: "", description: "", gradeLevel: "8", subjectId: "", duration: "0" });
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());

    useEffect(() => { fetchTests(); fetchQuestions(); fetchSubjects(); }, []);
    useEffect(() => { if (feedback) { const t = setTimeout(() => setFeedback(null), 3000); return () => clearTimeout(t); } }, [feedback]);

    const fetchTests = async () => { try { const res = await apiGet("/education/tests"); if (res.ok) setTests(await res.json()); } catch (e) { console.error(e); } finally { setLoading(false); } };
    const fetchQuestions = async () => { try { const res = await apiGet("/education/questions"); if (res.ok) setQuestions(await res.json()); } catch (e) { console.error(e); } };
    const fetchSubjects = async () => {
        try { const res = await apiGet("/education/teacher-assignments/mine"); if (res.ok) { const a = await res.json(); const s = a.map((x: any) => x.subjectId).filter(Boolean); setSubjects(s.filter((v: any, i: number, arr: any[]) => arr.findIndex(x => x._id === v._id) === i)); } } catch (e) { console.error(e); }
    };

    const filteredQuestions = questions.filter(q => {
        if (formData.subjectId && q.subjectId?._id !== formData.subjectId) return false;
        if (formData.gradeLevel && q.gradeLevel !== Number(formData.gradeLevel)) return false;
        return true;
    });

    const toggleQuestion = (qId: string) => {
        setSelectedQuestionIds(prev => {
            const next = new Set(prev);
            if (next.has(qId)) next.delete(qId); else next.add(qId);
            return next;
        });
    };

    const handleSubmit = async () => {
        if (selectedQuestionIds.size === 0) {
            setFeedback({ type: "error", message: "En az 1 soru seçmelisiniz." }); return;
        }
        setSubmitting(true);
        const payload = {
            title: formData.title, description: formData.description,
            gradeLevel: Number(formData.gradeLevel), subjectId: formData.subjectId,
            duration: Number(formData.duration) || 0,
            questionIds: Array.from(selectedQuestionIds),
        };
        try {
            const res = editingTest
                ? await apiPatch(`/education/tests/${editingTest._id}`, payload)
                : await apiPost("/education/tests", payload);
            if (res.ok) {
                setDialogOpen(false); setEditingTest(null); resetForm(); fetchTests();
                setFeedback({ type: "success", message: editingTest ? "Test güncellendi!" : "Test oluşturuldu!" });
            } else {
                setFeedback({ type: "error", message: "İşlem başarısız." });
            }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); } finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        if (!deleteItem) return; setSubmitting(true);
        try { const res = await apiDelete(`/education/tests/${deleteItem._id}`); if (res.ok) { setDeleteDialogOpen(false); fetchTests(); setFeedback({ type: "success", message: "Test silindi." }); } } catch (e) { console.error(e); } finally { setSubmitting(false); }
    };

    const resetForm = () => {
        setFormData({ title: "", description: "", gradeLevel: "8", subjectId: "", duration: "0" });
        setSelectedQuestionIds(new Set());
    };

    const openEdit = (t: Test) => {
        setEditingTest(t);
        setFormData({ title: t.title, description: t.description, gradeLevel: t.gradeLevel.toString(), subjectId: t.subjectId?._id || "", duration: t.duration?.toString() || "0" });
        setSelectedQuestionIds(new Set(t.questionIds?.map(q => q._id) || []));
        setDialogOpen(true);
    };

    const selectClass = "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring";

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader title="Testler" description="Soru bankasından test oluşturun ve yönetin.">
                <Button onClick={() => { resetForm(); setEditingTest(null); setDialogOpen(true); }}><Plus className="h-4 w-4" /> Yeni Test</Button>
            </PageHeader>

            {feedback && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-toast-in ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                    {feedback.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{feedback.message}
                </div>
            )}

            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
            ) : tests.length === 0 ? (
                <EmptyState icon={ClipboardList} title="Henüz test oluşturulmamış" description="Soru bankasından sorular seçerek test oluşturun." />
            ) : (
                <Table>
                    <TableHeader><TableRow>
                        <TableHead>Test Adı</TableHead><TableHead>Ders</TableHead><TableHead>Sınıf</TableHead>
                        <TableHead>Soru</TableHead><TableHead>Süre</TableHead><TableHead className="text-right">İşlemler</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                        {tests.map(t => (
                            <TableRow key={t._id}>
                                <TableCell className="font-medium">{t.title}</TableCell>
                                <TableCell>{t.subjectId?.name}</TableCell>
                                <TableCell><Badge variant="info">{t.gradeLevel}. Sınıf</Badge></TableCell>
                                <TableCell><Badge variant="secondary">{t.questionIds?.length || 0} soru</Badge></TableCell>
                                <TableCell>
                                    {t.duration > 0
                                        ? <span className="flex items-center gap-1 text-sm"><Clock className="h-3.5 w-3.5" />{t.duration} dk</span>
                                        : <span className="text-muted-foreground text-sm">Süresiz</span>
                                    }
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => { setPreviewTest(t); setPreviewOpen(true); }}><Eye className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setDeleteItem(t); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            {/* ─── Create/Edit Test Dialog ──────────────────────── */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{editingTest ? "Test Düzenle" : "Yeni Test Oluştur"}</DialogTitle>
                        <DialogDescription>Soru bankasından sorular seçerek test oluşturun.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3 overflow-y-auto flex-1 pr-1">
                        <div className="grid grid-cols-2 gap-2">
                            <div><Label>Test Adı</Label><Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Örn: 8. Sınıf Matematik Deneme 1" /></div>
                            <div><Label>Süre (dakika, 0=süresiz)</Label><Input type="number" value={formData.duration} onChange={e => setFormData({ ...formData, duration: e.target.value })} placeholder="40" /></div>
                        </div>
                        <div><Label>Açıklama</Label><Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Test hakkında açıklama..." /></div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label>Sınıf</Label>
                                <select className={selectClass} value={formData.gradeLevel} onChange={e => setFormData({ ...formData, gradeLevel: e.target.value })}>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(g => <option key={g} value={g}>{g}. Sınıf</option>)}
                                </select>
                            </div>
                            <div>
                                <Label>Ders</Label>
                                <select className={selectClass} value={formData.subjectId} onChange={e => setFormData({ ...formData, subjectId: e.target.value })}>
                                    <option value="">Tüm Dersler</option>{subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Question Selection */}
                        <div>
                            <Label className="mb-2 block">Sorular Seçin ({selectedQuestionIds.size} seçili)</Label>
                            <div className="border rounded-xl max-h-[30vh] overflow-y-auto">
                                {filteredQuestions.length === 0 ? (
                                    <p className="p-4 text-sm text-muted-foreground text-center">Bu filtrelerle eşleşen soru bulunamadı.</p>
                                ) : (
                                    filteredQuestions.map(q => (
                                        <label key={q._id} className={`flex items-center gap-3 px-4 py-3 border-b last:border-0 cursor-pointer transition-colors ${selectedQuestionIds.has(q._id) ? "bg-primary/5" : "hover:bg-muted/30"}`}>
                                            <input type="checkbox" checked={selectedQuestionIds.has(q._id)} onChange={() => toggleQuestion(q._id)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/50" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    {q.type === "IMAGE" && q.imageUrl && <img src={q.imageUrl} alt="" className="w-6 h-6 object-cover rounded" />}
                                                    <span className="text-sm truncate">{q.text}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {q.type === "IMAGE"
                                                    ? <Badge variant="info" className="text-xs gap-0.5"><Image className="h-2.5 w-2.5" />Foto</Badge>
                                                    : <Badge variant="secondary" className="text-xs gap-0.5"><FileText className="h-2.5 w-2.5" />Metin</Badge>
                                                }
                                                <Badge variant={q.difficulty === "EASY" ? "success" : q.difficulty === "HARD" ? "destructive" : "warning"} className="text-xs">
                                                    {q.difficulty === "EASY" ? "K" : q.difficulty === "HARD" ? "Z" : "O"}
                                                </Badge>
                                            </div>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
                        <Button onClick={handleSubmit} disabled={submitting}>
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {editingTest ? "Güncelle" : "Test Oluştur"} ({selectedQuestionIds.size} soru)
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Preview Dialog ──────────────────────────────── */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{previewTest?.title}</DialogTitle>
                        <DialogDescription>
                            {previewTest?.subjectId?.name} — {previewTest?.gradeLevel}. Sınıf — {previewTest?.questionIds?.length} soru
                            {previewTest?.duration ? ` — ${previewTest.duration} dakika` : ""}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {previewTest?.questionIds?.map((q: any, idx: number) => (
                            <div key={q._id} className="border rounded-xl p-4">
                                <p className="font-medium text-sm mb-2">Soru {idx + 1}</p>
                                {q.imageUrl && <img src={q.imageUrl} alt={`Soru ${idx + 1}`} className="max-h-40 rounded-lg mb-3 object-contain" />}
                                {q.type !== "IMAGE" && <p className="text-sm mb-3">{q.text}</p>}
                                <div className="grid grid-cols-2 gap-2">
                                    {q.options?.map((opt: string, oi: number) => (
                                        <div key={oi} className={`text-sm px-3 py-2 rounded-lg border ${oi === q.correctAnswer ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-medium" : "bg-muted/30"}`}>
                                            {String.fromCharCode(65 + oi)}) {opt}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* ─── Delete Dialog ───────────────────────────────── */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Test Sil</DialogTitle><DialogDescription>Bu test silinecek. Emin misiniz?</DialogDescription></DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 animate-spin" />} Sil</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
