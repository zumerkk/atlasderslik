"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Loader2, Pencil, Trash2, Database, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

interface Question { _id: string; text: string; options: string[]; correctAnswer: number; difficulty: string; subjectId: { _id: string; name: string }; gradeLevel: number; }

export default function TeacherQuestionsPage() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteItem, setDeleteItem] = useState<Question | null>(null);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [formData, setFormData] = useState({ text: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "0", difficulty: "MEDIUM", gradeLevel: "8", subjectId: "" });
    const [subjects, setSubjects] = useState<{ _id: string; name: string; gradeLevel: number }[]>([]);

    useEffect(() => { fetchQuestions(); fetchSubjects(); }, []);
    useEffect(() => { if (feedback) { const t = setTimeout(() => setFeedback(null), 3000); return () => clearTimeout(t); } }, [feedback]);

    const fetchQuestions = async () => { try { const res = await apiGet("/education/questions"); if (res.ok) setQuestions(await res.json()); } catch (e) { console.error(e); } finally { setLoading(false); } };
    const fetchSubjects = async () => {
        try { const res = await apiGet("/education/teacher-assignments/mine"); if (res.ok) { const a = await res.json(); const s = a.map((x: any) => x.subjectId).filter(Boolean); setSubjects(s.filter((v: any, i: number, arr: any[]) => arr.findIndex(x => x._id === v._id) === i)); } } catch (e) { console.error(e); }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        const options = [formData.optionA, formData.optionB, formData.optionC, formData.optionD];
        const payload = { text: formData.text, options, correctAnswer: Number(formData.correctAnswer), difficulty: formData.difficulty, gradeLevel: Number(formData.gradeLevel), subjectId: formData.subjectId };
        try {
            const res = editingQuestion ? await apiPatch(`/education/questions/${editingQuestion._id}`, payload) : await apiPost("/education/questions", payload);
            if (res.ok) { setDialogOpen(false); setEditingQuestion(null); resetForm(); fetchQuestions(); setFeedback({ type: "success", message: editingQuestion ? "Soru güncellendi!" : "Soru eklendi!" }); }
            else { setFeedback({ type: "error", message: "İşlem başarısız." }); }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); } finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        if (!deleteItem) return; setSubmitting(true);
        try { const res = await apiDelete(`/education/questions/${deleteItem._id}`); if (res.ok) { setDeleteDialogOpen(false); fetchQuestions(); setFeedback({ type: "success", message: "Soru silindi." }); } } catch (e) { console.error(e); } finally { setSubmitting(false); }
    };

    const resetForm = () => setFormData({ text: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "0", difficulty: "MEDIUM", gradeLevel: "8", subjectId: "" });
    const openEdit = (q: Question) => { setEditingQuestion(q); setFormData({ text: q.text, optionA: q.options[0] || "", optionB: q.options[1] || "", optionC: q.options[2] || "", optionD: q.options[3] || "", correctAnswer: q.correctAnswer.toString(), difficulty: q.difficulty, gradeLevel: q.gradeLevel.toString(), subjectId: q.subjectId?._id || "" }); setDialogOpen(true); };
    const difficultyBadge = (d: string) => d === "EASY" ? <Badge variant="success">Kolay</Badge> : d === "MEDIUM" ? <Badge variant="warning">Orta</Badge> : <Badge variant="destructive">Zor</Badge>;
    const selectClass = "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring";

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader title="Soru Bankası" description="Sorularınızı oluşturun, düzenleyin ve yönetin.">
                <Button onClick={() => { resetForm(); setEditingQuestion(null); setDialogOpen(true); }}><Plus className="h-4 w-4" /> Yeni Soru</Button>
            </PageHeader>

            {feedback && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-toast-in ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                    {feedback.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{feedback.message}
                </div>
            )}

            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
            ) : questions.length === 0 ? (
                <EmptyState icon={Database} title="Henüz soru eklenmemiş" description="Yeni bir soru ekleyerek soru bankasını oluşturun." />
            ) : (
                <Table>
                    <TableHeader><TableRow><TableHead>Soru</TableHead><TableHead>Ders</TableHead><TableHead>Sınıf</TableHead><TableHead>Zorluk</TableHead><TableHead className="text-right">İşlemler</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {questions.map(q => (
                            <TableRow key={q._id}>
                                <TableCell className="font-medium max-w-[300px] truncate">{q.text}</TableCell>
                                <TableCell>{q.subjectId?.name}</TableCell>
                                <TableCell><Badge variant="info">{q.gradeLevel}. Sınıf</Badge></TableCell>
                                <TableCell>{difficultyBadge(q.difficulty)}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => openEdit(q)}><Pencil className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setDeleteItem(q); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>{editingQuestion ? "Soru Düzenle" : "Yeni Soru Ekle"}</DialogTitle><DialogDescription>Çoktan seçmeli soru oluşturun.</DialogDescription></DialogHeader>
                    <div className="grid gap-3 py-2 max-h-[60vh] overflow-y-auto">
                        <div className="grid gap-1"><Label>Soru Metni</Label><Input value={formData.text} onChange={e => setFormData({ ...formData, text: e.target.value })} placeholder="Soru metnini yazın..." /></div>
                        <div className="grid grid-cols-2 gap-2">
                            <div><Label>A) Şık</Label><Input value={formData.optionA} onChange={e => setFormData({ ...formData, optionA: e.target.value })} /></div>
                            <div><Label>B) Şık</Label><Input value={formData.optionB} onChange={e => setFormData({ ...formData, optionB: e.target.value })} /></div>
                            <div><Label>C) Şık</Label><Input value={formData.optionC} onChange={e => setFormData({ ...formData, optionC: e.target.value })} /></div>
                            <div><Label>D) Şık</Label><Input value={formData.optionD} onChange={e => setFormData({ ...formData, optionD: e.target.value })} /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div><Label>Doğru Cevap</Label><select className={selectClass} value={formData.correctAnswer} onChange={e => setFormData({ ...formData, correctAnswer: e.target.value })}><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></select></div>
                            <div><Label>Zorluk</Label><select className={selectClass} value={formData.difficulty} onChange={e => setFormData({ ...formData, difficulty: e.target.value })}><option value="EASY">Kolay</option><option value="MEDIUM">Orta</option><option value="HARD">Zor</option></select></div>
                            <div><Label>Sınıf</Label><select className={selectClass} value={formData.gradeLevel} onChange={e => setFormData({ ...formData, gradeLevel: e.target.value })}>{[5, 6, 7, 8].map(g => <option key={g} value={g}>{g}. Sınıf</option>)}</select></div>
                        </div>
                        <div><Label>Ders</Label><select className={selectClass} value={formData.subjectId} onChange={e => setFormData({ ...formData, subjectId: e.target.value })}><option value="">Ders Seçin</option>{subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}</select></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
                        <Button onClick={handleSubmit} disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 animate-spin" />}{editingQuestion ? "Güncelle" : "Ekle"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Soru Sil</DialogTitle><DialogDescription>Bu soru silinecek. Emin misiniz?</DialogDescription></DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 animate-spin" />} Sil</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
