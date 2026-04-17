"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Loader2, Pencil, Trash2, Database, CheckCircle, AlertCircle, Image as ImageIcon, FileText, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

interface Question {
    _id: string; text: string; options: string[]; correctAnswer: number; difficulty: string;
    subjectId: { _id: string; name: string }; gradeLevel: number; imageUrl?: string;
    type?: string; optionImages?: string[]; objective?: string;
}

export default function TeacherQuestionsPage() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteItem, setDeleteItem] = useState<Question | null>(null);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [subjects, setSubjects] = useState<{ _id: string; name: string; gradeLevel: number }[]>([]);

    // ─── Form State ─────────────────────────────────────────
    const [questionMode, setQuestionMode] = useState<"TEST" | "OPEN_ENDED">("TEST");
    const [formData, setFormData] = useState({
        text: "", optionA: "", optionB: "", optionC: "", optionD: "",
        correctAnswer: "0", difficulty: "MEDIUM", gradeLevel: "8", subjectId: "",
        imageUrl: "", optionImageA: "", optionImageB: "", optionImageC: "", optionImageD: "", objective: ""
    });
    
    // We use a single file input and track which field we are uploading for
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadTarget, setUploadTarget] = useState<"QUESTION" | "A" | "B" | "C" | "D" | null>(null);

    useEffect(() => { fetchQuestions(); fetchSubjects(); }, []);
    useEffect(() => { if (feedback) { const t = setTimeout(() => setFeedback(null), 3000); return () => clearTimeout(t); } }, [feedback]);

    const fetchQuestions = async () => { 
        try { 
            const res = await apiGet("/education/questions", { timeout: 30000 }); 
            if (res.ok) {
                const data = await res.json();
                // Safety: never overwrite existing questions with empty array
                // unless we truly have no questions (first load)
                if (Array.isArray(data) && (data.length > 0 || questions.length === 0)) {
                    setQuestions(data);
                } else if (Array.isArray(data) && data.length === 0 && questions.length > 0) {
                    // Don't blindly clear - refetch to confirm
                    console.warn("fetchQuestions returned empty but we had questions. Keeping existing state.");
                    const confirmRes = await apiGet("/education/questions", { timeout: 30000 });
                    if (confirmRes.ok) {
                        const confirmData = await confirmRes.json();
                        setQuestions(Array.isArray(confirmData) ? confirmData : []);
                    }
                }
            } else {
                console.error("fetchQuestions failed with status:", res.status);
            }
        } catch (e) { 
            console.error("fetchQuestions error:", e);
            // Don't clear questions on error - keep existing state
        } finally { 
            setLoading(false); 
        } 
    };
    
    const fetchSubjects = async () => {
        try { 
            const res = await apiGet("/education/teacher-assignments/mine"); 
            if (res.ok) { 
                const a = await res.json(); 
                const s = a.map((x: any) => x.subjectId).filter(Boolean); 
                setSubjects(s.filter((v: any, i: number, arr: any[]) => arr.findIndex(x => x._id === v._id) === i)); 
            } 
        } catch (e) { 
            console.error(e); 
        }
    };

    const compressImage = (file: File, maxWidth = 1200, quality = 0.7): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new window.Image();
            const objectUrl = URL.createObjectURL(file);
            
            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                const canvas = document.createElement("canvas");
                let w = img.width;
                let h = img.height;
                if (w > maxWidth) {
                    h = Math.round((h * maxWidth) / w);
                    w = maxWidth;
                }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d");
                if (!ctx) { reject(new Error("Canvas context error")); return; }
                ctx.drawImage(img, 0, 0, w, h);
                const dataUrl = canvas.toDataURL("image/jpeg", quality);
                resolve(dataUrl);
            };
            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error("Image load error"));
            };
            img.src = objectUrl;
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uploadTarget) return;
        if (file.size > 10 * 1024 * 1024) {
            setFeedback({ type: "error", message: "Dosya boyutu 10MB'dan küçük olmalıdır." });
            return;
        }
        try {
            setFeedback({ type: "success", message: "Fotoğraf yükleniyor..." });
            const compressed = await compressImage(file);
            
            if (uploadTarget === "QUESTION") {
                setFormData(prev => ({ ...prev, imageUrl: compressed }));
            } else if (uploadTarget === "A") {
                setFormData(prev => ({ ...prev, optionImageA: compressed }));
            } else if (uploadTarget === "B") {
                setFormData(prev => ({ ...prev, optionImageB: compressed }));
            } else if (uploadTarget === "C") {
                setFormData(prev => ({ ...prev, optionImageC: compressed }));
            } else if (uploadTarget === "D") {
                setFormData(prev => ({ ...prev, optionImageD: compressed }));
            }
            setFeedback(null);
        } catch {
            setFeedback({ type: "error", message: "Fotoğraf yüklenirken hata oluştu." });
        } finally {
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = "";
            setUploadTarget(null);
        }
    };

    const triggerUpload = (target: "QUESTION" | "A" | "B" | "C" | "D") => {
        setUploadTarget(target);
        fileInputRef.current?.click();
    };

    const handleSubmit = async () => {
        if (!formData.subjectId) {
            setFeedback({ type: "error", message: "Lütfen bir ders seçin!" });
            return;
        }
        if (!formData.text && !formData.imageUrl) {
            setFeedback({ type: "error", message: "Lütfen soru metni veya görseli ekleyin!" });
            return;
        }

        setSubmitting(true);
        const isTestMode = questionMode === "TEST";
        
        const options = isTestMode
            ? [formData.optionA, formData.optionB, formData.optionC, formData.optionD]
            : [];
            
        const optionImages = isTestMode
            ? [formData.optionImageA, formData.optionImageB, formData.optionImageC, formData.optionImageD]
            : [];

        const payload: any = {
            text: formData.text,
            options,
            optionImages,
            correctAnswer: isTestMode ? Number(formData.correctAnswer) : 0,
            difficulty: formData.difficulty,
            gradeLevel: Number(formData.gradeLevel),
            subjectId: formData.subjectId,
            type: questionMode,
            imageUrl: formData.imageUrl || "",
            objective: formData.objective || "",
        };

        try {
            const res = editingQuestion
                ? await apiPatch(`/education/questions/${editingQuestion._id}`, payload, { timeout: 30000 })
                : await apiPost("/education/questions", payload, { timeout: 30000 });
            if (res.ok) {
                const savedQuestion = await res.json();
                
                if (editingQuestion) {
                    // Optimistic update: replace the edited question in local state
                    setQuestions(prev => prev.map(q => q._id === editingQuestion._id ? savedQuestion : q));
                } else {
                    // Optimistic update: add the new question to local state immediately
                    setQuestions(prev => [savedQuestion, ...prev]);
                }
                
                setDialogOpen(false); setEditingQuestion(null); resetForm();
                setFeedback({ type: "success", message: editingQuestion ? "Soru güncellendi!" : "Soru eklendi!" });
                
                // Background refresh to get fully populated data (subjectId.name etc.)
                setTimeout(() => fetchQuestions(), 1000);
            } else {
                const errData = await res.json().catch(() => ({}));
                setFeedback({ type: "error", message: errData.message || "İşlem başarısız." });
            }
        } catch (err: any) { 
            setFeedback({ type: "error", message: err?.message || "Bir hata oluştu. Lütfen tekrar deneyin." }); 
        } finally { 
            setSubmitting(false); 
        }
    };

    const handleDelete = async () => {
        if (!deleteItem) return; setSubmitting(true);
        try { 
            const res = await apiDelete(`/education/questions/${deleteItem._id}`); 
            if (res.ok) { 
                setDeleteDialogOpen(false);
                setQuestions(prev => prev.filter(q => q._id !== deleteItem._id));
                setFeedback({ type: "success", message: "Soru silindi." }); 
            } 
        } catch (e) { 
            console.error(e); 
        } finally { 
            setSubmitting(false); 
        }
    };

    const resetForm = () => {
        setFormData({ 
            text: "", optionA: "", optionB: "", optionC: "", optionD: "", 
            correctAnswer: "0", difficulty: "MEDIUM", gradeLevel: "8", subjectId: "", 
            imageUrl: "", optionImageA: "", optionImageB: "", optionImageC: "", optionImageD: "", objective: "" 
        });
        setQuestionMode("TEST");
    };

    const openEdit = (q: any) => {
        setEditingQuestion(q);
        
        // Handle old schema types gracefully
        const mappedType = q.type === "IMAGE" || q.type === "TEXT" ? "TEST" : (q.type as "TEST" | "OPEN_ENDED" || "TEST");
        
        setQuestionMode(mappedType);
        
        setFormData({
            text: q.text, 
            optionA: q.options[0] || "", optionB: q.options[1] || "",
            optionC: q.options[2] || "", optionD: q.options[3] || "", 
            correctAnswer: q.correctAnswer.toString(),
            difficulty: q.difficulty, 
            gradeLevel: q.gradeLevel.toString(), 
            subjectId: q.subjectId?._id || "",
            imageUrl: q.imageUrl || "",
            optionImageA: q.optionImages?.[0] || "",
            optionImageB: q.optionImages?.[1] || "",
            optionImageC: q.optionImages?.[2] || "",
            optionImageD: q.optionImages?.[3] || "",
            objective: q.objective || "",
        });
        setDialogOpen(true);
    };

    const difficultyBadge = (d: string) => d === "EASY" ? <Badge variant="success">Kolay</Badge> : d === "MEDIUM" ? <Badge variant="warning">Orta</Badge> : <Badge variant="destructive">Zor</Badge>;
    const selectClass = "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring";
    const tabClass = (active: boolean) => `flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`;

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
                    <TableHeader><TableRow>
                        <TableHead>Soru</TableHead><TableHead>Tür</TableHead><TableHead>Ders</TableHead>
                        <TableHead>Sınıf</TableHead><TableHead>Zorluk</TableHead><TableHead className="text-right">İşlemler</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                        {questions.map(q => (
                            <TableRow key={q._id}>
                                <TableCell className="font-medium max-w-[250px] truncate">
                                    <div className="flex items-center gap-2">
                                        {q.imageUrl && (
                                            <img src={q.imageUrl} alt="" className="w-8 h-8 object-cover rounded" />
                                        )}
                                        <div className="flex flex-col">
                                            <span>{q.text || "Görsel Soru"}</span>
                                            {q.objective && <span className="text-[10px] text-muted-foreground mt-0.5" title={q.objective}>🎯 {q.objective}</span>}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {q.type === "OPEN_ENDED"
                                        ? <Badge variant="secondary" className="gap-1"><FileText className="h-3 w-3" />Açık Uçlu</Badge>
                                        : <Badge variant="info" className="gap-1"><CheckCircle className="h-3 w-3" />Test</Badge>
                                    }
                                </TableCell>
                                <TableCell>{q.subjectId?.name || "Bilinmiyor"}</TableCell>
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

            {/* ─── Create/Edit Dialog ──────────────────────────── */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingQuestion ? "Soru Düzenle" : "Yeni Soru Ekle"}</DialogTitle>
                        <DialogDescription>Soru tipi seçin ve içeriğini belirleyin.</DialogDescription>
                    </DialogHeader>

                    {/* ─── Mode Tabs ─────────────────────────────── */}
                    <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
                        <button className={tabClass(questionMode === "TEST")} onClick={() => setQuestionMode("TEST")}>
                            <CheckCircle className="h-4 w-4" /> Çoktan Seçmeli (Test)
                        </button>
                        <button className={tabClass(questionMode === "OPEN_ENDED")} onClick={() => setQuestionMode("OPEN_ENDED")}>
                            <FileText className="h-4 w-4" /> Açık Uçlu
                        </button>
                    </div>

                    <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto px-1">
                        {/* ─── Question Text & Image ─────────────────────────────── */}
                        <div className="grid gap-2 p-3 border rounded-xl bg-slate-50/50">
                            <Label className="text-base font-semibold">Soru İçeriği</Label>
                            <Input value={formData.text} onChange={e => setFormData({ ...formData, text: e.target.value })} placeholder="Soru metnini yazın..." />
                            
                            <Label className="text-sm font-semibold mt-2">Kazanım (Opsiyonel)</Label>
                            <Input value={formData.objective} onChange={e => setFormData({ ...formData, objective: e.target.value })} placeholder="Örn: Kalıtımla ilgili problemleri çözer (Mendel Genetiği)" />

                            <div className="flex items-start gap-3 mt-4">
                                <Button type="button" variant="outline" size="sm" onClick={() => triggerUpload("QUESTION")} className="gap-1 shrink-0">
                                    <Upload className="h-3.5 w-3.5" /> Soru Görseli Ekle
                                </Button>
                                {formData.imageUrl && (
                                    <div className="relative group">
                                        <img src={formData.imageUrl} alt="Soru" className="h-20 w-auto rounded border bg-white object-contain" />
                                        <button onClick={() => setFormData(prev => ({ ...prev, imageUrl: "" }))} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ─── Test Options ─────────────────────────────── */}
                        {questionMode === "TEST" && (
                            <div className="grid gap-3 p-3 border rounded-xl">
                                <Label className="text-base font-semibold">Şıklar</Label>
                                
                                {/* Option A */}
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="w-8 justify-center shrink-0">A</Badge>
                                    <Input value={formData.optionA} onChange={e => setFormData({ ...formData, optionA: e.target.value })} placeholder="A şıkkı metni..." />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => triggerUpload("A")} className="shrink-0" title="Resim Ekle">
                                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                    {formData.optionImageA && (
                                        <div className="relative">
                                            <img src={formData.optionImageA} alt="A" className="h-10 w-10 object-cover rounded border" />
                                            <button onClick={() => setFormData(prev => ({ ...prev, optionImageA: "" }))} className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5"><Trash2 className="h-2 w-2" /></button>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Option B */}
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="w-8 justify-center shrink-0">B</Badge>
                                    <Input value={formData.optionB} onChange={e => setFormData({ ...formData, optionB: e.target.value })} placeholder="B şıkkı metni..." />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => triggerUpload("B")} className="shrink-0" title="Resim Ekle">
                                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                    {formData.optionImageB && (
                                        <div className="relative">
                                            <img src={formData.optionImageB} alt="B" className="h-10 w-10 object-cover rounded border" />
                                            <button onClick={() => setFormData(prev => ({ ...prev, optionImageB: "" }))} className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5"><Trash2 className="h-2 w-2" /></button>
                                        </div>
                                    )}
                                </div>

                                {/* Option C */}
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="w-8 justify-center shrink-0">C</Badge>
                                    <Input value={formData.optionC} onChange={e => setFormData({ ...formData, optionC: e.target.value })} placeholder="C şıkkı metni..." />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => triggerUpload("C")} className="shrink-0" title="Resim Ekle">
                                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                    {formData.optionImageC && (
                                        <div className="relative">
                                            <img src={formData.optionImageC} alt="C" className="h-10 w-10 object-cover rounded border" />
                                            <button onClick={() => setFormData(prev => ({ ...prev, optionImageC: "" }))} className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5"><Trash2 className="h-2 w-2" /></button>
                                        </div>
                                    )}
                                </div>

                                {/* Option D */}
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="w-8 justify-center shrink-0">D</Badge>
                                    <Input value={formData.optionD} onChange={e => setFormData({ ...formData, optionD: e.target.value })} placeholder="D şıkkı metni..." />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => triggerUpload("D")} className="shrink-0" title="Resim Ekle">
                                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                    {formData.optionImageD && (
                                        <div className="relative">
                                            <img src={formData.optionImageD} alt="D" className="h-10 w-10 object-cover rounded border" />
                                            <button onClick={() => setFormData(prev => ({ ...prev, optionImageD: "" }))} className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5"><Trash2 className="h-2 w-2" /></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Common Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                            {questionMode === "TEST" && (
                                <div>
                                    <Label>Doğru Cevap</Label>
                                    <select className={selectClass} value={formData.correctAnswer} onChange={e => setFormData({ ...formData, correctAnswer: e.target.value })}>
                                        <option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option>
                                    </select>
                                </div>
                            )}
                            <div>
                                <Label>Zorluk</Label>
                                <select className={selectClass} value={formData.difficulty} onChange={e => setFormData({ ...formData, difficulty: e.target.value })}>
                                    <option value="EASY">Kolay</option><option value="MEDIUM">Orta</option><option value="HARD">Zor</option>
                                </select>
                            </div>
                            <div>
                                <Label>Sınıf</Label>
                                <select className={selectClass} value={formData.gradeLevel} onChange={e => setFormData({ ...formData, gradeLevel: e.target.value })}>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(g => <option key={g} value={g}>{g}. Sınıf</option>)}
                                </select>
                            </div>
                            <div>
                                <Label>Ders <span className="text-destructive">*</span></Label>
                                <select className={selectClass} value={formData.subjectId} onChange={e => setFormData({ ...formData, subjectId: e.target.value })}>
                                    <option value="">Ders Seçin</option>{subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

                    <DialogFooter className="pt-4 border-t">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
                        <Button onClick={handleSubmit} disabled={submitting}>
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {editingQuestion ? "Güncelle" : "Kaydet"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Delete Dialog ───────────────────────────────── */}
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
