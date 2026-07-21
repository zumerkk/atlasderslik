"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Plus, Calendar, Trash2, Loader2, CheckCircle, AlertCircle, Upload, File as FileIcon, Eye, Star, MessageSquare, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiDelete, apiPatch } from "@/lib/api";
import { downloadDataUri, extensionFromDataUri } from "@/lib/download";
import { OpticForm } from "@/components/ui/optic-form";

interface TeacherAssignment { _id: string; gradeId: { _id: string; level: number; label?: string }; subjectId: { _id: string; name: string; gradeLevel: number }; }
interface Assignment { _id: string; title: string; description: string; dueDate: string; subjectId: { _id: string; name: string }; gradeLevel: number; gradeId?: { _id: string; level: number; label?: string }; attachments?: string[]; isOpticTest?: boolean; opticOptionsCount?: number; answerKey?: string[]; }
interface SubmissionItem { _id: string; studentId: { _id: string; firstName: string; lastName: string }; fileUrl?: string; note?: string; grade?: number; feedback?: string; isLate?: boolean; submittedAt: string; opticResult?: { correct: number; incorrect: number; empty: number; score: number }; studentAnswers?: string[]; }

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
    const [submissionsDialogOpen, setSubmissionsDialogOpen] = useState(false);
    const [submissionsTarget, setSubmissionsTarget] = useState<Assignment | null>(null);
    const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
    const [submissionsLoading, setSubmissionsLoading] = useState(false);
    const [gradingId, setGradingId] = useState<string | null>(null);
    const [gradeInput, setGradeInput] = useState("");
    const [feedbackInput, setFeedbackInput] = useState("");

    const [isOpticTest, setIsOpticTest] = useState(false);
    const [opticOptionsCount, setOpticOptionsCount] = useState<number>(4);
    const [questionCount, setQuestionCount] = useState<number>(10);
    const [answerKey, setAnswerKey] = useState<string[]>(Array(10).fill(''));
    const [formData, setFormData] = useState({ title: "", description: "", dueDate: "", assignmentId: "" });
    const [attachments, setAttachments] = useState<{name: string, url: string}[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { fetchAssignments(); fetchTeacherAssignments(); }, []);
    useEffect(() => { if (feedback) { const t = setTimeout(() => setFeedback(null), 3000); return () => clearTimeout(t); } }, [feedback]);

    const handleQuestionCountChange = (count: number) => {
        setQuestionCount(count);
        setAnswerKey(prev => {
            const newArr = [...prev];
            if (count > prev.length) {
                return [...newArr, ...Array(count - prev.length).fill('')];
            }
            return newArr.slice(0, count);
        });
    };

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

    const openSubmissions = async (assignment: Assignment) => {
        setSubmissionsTarget(assignment);
        setSubmissionsDialogOpen(true);
        setSubmissionsLoading(true);
        setGradingId(null);
        try {
            const res = await apiGet(`/education/assignments/${assignment._id}/submissions`);
            if (res.ok) setSubmissions(await res.json());
            else setSubmissions([]);
        } catch { setSubmissions([]); }
        finally { setSubmissionsLoading(false); }
    };

    const handleGrade = async (subId: string) => {
        if (!gradeInput) return;
        setSubmitting(true);
        try {
            const res = await apiPatch(`/education/submissions/${subId}/grade`, {
                grade: Number(gradeInput),
                feedback: feedbackInput.trim(),
            });
            if (res.ok) {
                setFeedback({ type: "success", message: "Not verildi!" });
                setGradingId(null); setGradeInput(""); setFeedbackInput("");
                if (submissionsTarget) openSubmissions(submissionsTarget);
            } else { setFeedback({ type: "error", message: "Not verilemedi." }); }
        } catch { setFeedback({ type: "error", message: "Hata oluştu." }); }
        finally { setSubmitting(false); }
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
                gradeId: selectedAssignment.gradeId._id,
                attachments: attachments.map(a => a.url),
                isOpticTest,
                opticOptionsCount,
                answerKey: isOpticTest ? answerKey : []
            });
            if (res.ok) { 
                setIsDialogOpen(false); 
                fetchAssignments(); 
                setFormData({ title: "", description: "", dueDate: "", assignmentId: "" }); 
                setAttachments([]);
                setIsOpticTest(false);
                setQuestionCount(10);
                setOpticOptionsCount(4);
                setAnswerKey(Array(10).fill(''));
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
                                    <Badge variant="outline">
                                        {a.gradeId ? `${a.gradeId.level}. Sınıf ${a.gradeId.label ? `(${a.gradeId.label}) ` : ''}• ` : ''}
                                        {a.subjectId?.name}
                                    </Badge>
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
                                <Button size="sm" variant="outline" onClick={() => openSubmissions(a)}><Eye className="h-4 w-4 mr-1" />Teslimleri Gör</Button>
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
                                <SelectContent>{teacherAssignments.map(a => (<SelectItem key={a._id} value={a._id}>{a.gradeId?.level}. Sınıf {a.gradeId?.label ? `(${a.gradeId.label}) ` : ''}• {a.subjectId?.name}</SelectItem>))}</SelectContent>
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

                        {/* Optic Form Section */}
                        <div className="grid gap-2 border-t pt-4">
                            <Label className="flex items-center gap-2 cursor-pointer w-fit">
                                <input type="checkbox" checked={isOpticTest} onChange={e => setIsOpticTest(e.target.checked)} className="rounded border-gray-300 w-4 h-4 text-primary" />
                                Optik Form (Cevap Anahtarı) Ekle
                            </Label>
                        </div>
                        {isOpticTest && (
                            <div className="grid gap-4 bg-muted/30 p-4 rounded-xl border border-muted mt-1">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Soru Sayısı</Label>
                                        <Input type="number" min={1} max={100} value={questionCount} onChange={e => handleQuestionCountChange(Number(e.target.value))} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Şık Sayısı</Label>
                                        <Select value={opticOptionsCount.toString()} onValueChange={v => setOpticOptionsCount(Number(v))}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="4">4 Şık (A, B, C, D)</SelectItem>
                                                <SelectItem value="5">5 Şık (A, B, C, D, E)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Cevap Anahtarı</Label>
                                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1 pr-2 custom-scrollbar">
                                        {Array.from({ length: questionCount }).map((_, i) => (
                                            <div key={i} className="flex items-center gap-1.5 text-sm">
                                                <span className="w-6 text-right font-medium text-muted-foreground shrink-0">{i + 1}.</span>
                                                <Select value={answerKey[i]} onValueChange={v => setAnswerKey(prev => { const n = [...prev]; n[i] = v; return n; })}>
                                                    <SelectTrigger className="h-8 px-2"><SelectValue placeholder="-" /></SelectTrigger>
                                                    <SelectContent>
                                                        {Array.from({ length: opticOptionsCount }).map((_, j) => {
                                                            const letter = String.fromCharCode(65 + j);
                                                            return <SelectItem key={letter} value={letter}>{letter}</SelectItem>
                                                        })}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>İptal</Button>
                        <Button onClick={handleCreate} disabled={submitting || !formData.assignmentId || !formData.title || !formData.dueDate || (isOpticTest && answerKey.some(k => !k))}>{submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Oluştur</Button>
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

            {/* Submissions Dialog */}
            <Dialog open={submissionsDialogOpen} onOpenChange={setSubmissionsDialogOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Teslimler — {submissionsTarget?.title}</DialogTitle>
                        <DialogDescription>Bu ödeve yapılan öğrenci teslimlerini görüntüleyin ve notlandırın.</DialogDescription>
                    </DialogHeader>
                    {submissionsLoading ? (
                        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : submissions.length === 0 ? (
                        <div className="text-center py-10">
                            <EmptyState icon={BookOpen} title="Henüz teslim yok" description="Bu ödeve henüz hiçbir öğrenci teslim yapmamış." />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">{submissions.length} öğrenci teslim etmiş</p>
                            {submissions.map((sub) => (
                                <div key={sub._id} className={`p-4 rounded-xl border ${sub.isLate ? 'border-amber-200 bg-amber-50/30' : 'border-border bg-muted/20'} space-y-2`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm">{sub.studentId?.firstName} {sub.studentId?.lastName}</span>
                                            {sub.isLate && <Badge variant="warning" className="text-[10px]">Geç</Badge>}
                                        </div>
                                        <span className="text-xs text-muted-foreground">{format(new Date(sub.submittedAt), "dd.MM.yyyy HH:mm")}</span>
                                    </div>
                                    {sub.note && <p className="text-sm text-muted-foreground">📝 {sub.note}</p>}
                                    {sub.fileUrl && (
                                        <div>
                                            {sub.fileUrl.startsWith('data:image') ? (
                                                <img src={sub.fileUrl} alt="Teslim" className="max-h-40 rounded-lg border object-contain" />
                                            ) : sub.fileUrl.startsWith('data:') ? (
                                                <button type="button" onClick={() => downloadDataUri(sub.fileUrl!, `teslim-${sub.studentId?.lastName || 'ogrenci'}.${extensionFromDataUri(sub.fileUrl!)}`)} className="inline-flex items-center gap-1.5 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 border border-blue-100">
                                                    <Download className="h-3.5 w-3.5" />Dosyayı İndir
                                                </button>
                                            ) : (
                                                <a href={sub.fileUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"><FileIcon className="h-3.5 w-3.5" />Dosya Linki</a>
                                            )}
                                        </div>
                                    )}
                                    {sub.opticResult && (
                                        <div className="flex flex-col gap-3 mt-2 mb-2 p-3 rounded-xl border bg-muted/20">
                                            <div className="flex items-center gap-4 text-sm font-medium">
                                                <span className="text-emerald-600">✓ {sub.opticResult.correct} Doğru</span>
                                                <span className="text-rose-600">✗ {sub.opticResult.incorrect} Yanlış</span>
                                                <span className="text-amber-600">○ {sub.opticResult.empty} Boş</span>
                                                <span className="font-bold text-primary ml-auto">Puan: {sub.opticResult.score}</span>
                                            </div>
                                            <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                                <OpticForm
                                                    mode="view"
                                                    questionCount={submissionsTarget?.answerKey?.length || 10}
                                                    optionsCount={submissionsTarget?.opticOptionsCount || 4}
                                                    studentAnswers={sub.studentAnswers || []}
                                                    answerKey={submissionsTarget?.answerKey || []}
                                                    className="p-2"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                                        {sub.grade != null ? (
                                            <div className="flex items-center gap-2">
                                                <Badge variant="success"><Star className="h-3 w-3 mr-1" />Not: {sub.grade}</Badge>
                                                {sub.feedback && <span className="text-xs text-muted-foreground">💬 {sub.feedback}</span>}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">Henüz notlandırılmadı</span>
                                        )}
                                        {gradingId === sub._id ? (
                                            <div className="flex items-center gap-2">
                                                <Input type="number" min={0} max={100} placeholder="Not" value={gradeInput} onChange={e => setGradeInput(e.target.value)} className="w-20 h-8 text-sm" />
                                                <Input placeholder="Geri bildirim" value={feedbackInput} onChange={e => setFeedbackInput(e.target.value)} className="w-36 h-8 text-sm" />
                                                <Button size="sm" className="h-8" onClick={() => handleGrade(sub._id)} disabled={submitting || !gradeInput}>
                                                    {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                                </Button>
                                                <Button size="sm" variant="ghost" className="h-8" onClick={() => setGradingId(null)}>İptal</Button>
                                            </div>
                                        ) : (
                                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setGradingId(sub._id); setGradeInput(sub.grade?.toString() || ""); setFeedbackInput(sub.feedback || ""); }}>
                                                <MessageSquare className="h-3 w-3 mr-1" />{sub.grade != null ? "Notu Düzenle" : "Notla"}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
