"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Calendar, FileText, Upload, CheckCircle, AlertCircle, Loader2, Clock, AlertTriangle, Link2, Image, Sparkles } from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";
import { tr } from "date-fns/locale";
import { apiGet, apiPost } from "@/lib/api";
import { downloadDataUri, extensionFromDataUri } from "@/lib/download";
import { OpticForm } from "@/components/ui/optic-form";
import { ExamSimulator } from "@/components/ui/exam-simulator";
import { StudentStreak } from "@/components/ui/student-streak";
import { DailyChallenge } from "@/components/ui/daily-challenge";
import { PomodoroTimer } from "@/components/ui/pomodoro-timer";
import { ChampionsBoard } from "@/components/ui/champions-board";
import { AIStudyCoach } from "@/components/ui/ai-study-coach";
import { WeakSpotRadar } from "@/components/ui/weak-spot-radar";
import { is3DayTrialActive, TrialBadge } from "@/lib/feature-flags";

interface Assignment {
    _id: string;
    title: string;
    description: string;
    dueDate: string;
    dueDateISO?: string;
    isExpired?: boolean;
    canSubmit?: boolean;
    subjectId: { _id: string; name: string };
    gradeLevel: number;
    teacherId: { firstName: string; lastName: string };
    maxScore?: number;
    instructions?: string;
    attachments?: string[];
    isOpticTest?: boolean;
    opticOptionsCount?: number;
    answerKey?: string[];
    durationMinutes?: number;
}

interface Submission {
    _id: string;
    assignmentId: any;
    fileUrl: string;
    note: string;
    grade?: number;
    feedback?: string;
    submittedAt: string;
    studentAnswers?: string[];
    opticResult?: { correct: number, incorrect: number, empty: number, score: number };
}

type AssignmentStatus = {
    label: string;
    variant: "success" | "warning" | "destructive" | "info" | "secondary";
    canSubmit: boolean;
    isLate: boolean;
};

export default function StudentAssignmentsPage() {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [resultDialogOpen, setResultDialogOpen] = useState(false);
    const [resultSubmission, setResultSubmission] = useState<{ assign: Assignment; sub: Submission } | null>(null);
    const [fileUrl, setFileUrl] = useState("");
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [submitMode, setSubmitMode] = useState<"LINK" | "FILE" | "OPTIC">("FILE");
    const [studentAnswers, setStudentAnswers] = useState<string[]>([]);
    const [uploadedFileData, setUploadedFileData] = useState<string>("");
    const [uploadedFileName, setUploadedFileName] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Compress image for base64 upload
    const compressImage = (file: File, maxWidth = 1200, quality = 0.7): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new window.Image();
            const objectUrl = URL.createObjectURL(file);
            
            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                const canvas = document.createElement("canvas");
                let w = img.width;
                let h = img.height;
                if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d");
                if (!ctx) { reject(new Error("Canvas error")); return; }
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL("image/jpeg", quality));
            };
            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error("Image load error"));
            };
            img.src = objectUrl;
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            setFeedback({ type: "error", message: "Dosya boyutu 10MB'dan küçük olmalıdır." });
            return;
        }
        try {
            setFeedback({ type: "success", message: "Dosya hazırlanıyor..." });
            let dataUrl: string;
            if (file.type.startsWith("image/")) {
                dataUrl = await compressImage(file);
            } else {
                // Non-image files: read as base64 directly
                dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => resolve(ev.target?.result as string);
                    reader.onerror = () => reject(new Error("Dosya okunamadı"));
                    reader.readAsDataURL(file);
                });
            }
            setUploadedFileData(dataUrl);
            setUploadedFileName(file.name);
            setFeedback(null);
        } catch {
            setFeedback({ type: "error", message: "Dosya yüklenirken hata oluştu." });
        }
    };

    useEffect(() => { fetchData(); }, []);
    useEffect(() => { if (feedback) { const t = setTimeout(() => setFeedback(null), 4000); return () => clearTimeout(t); } }, [feedback]);

    const fetchData = async () => {
        try {
            const [dashRes, subsRes] = await Promise.all([
                apiGet("/education/student/dashboard"),
                apiGet("/education/submissions/mine"),
            ]);
            if (dashRes.ok) { const d = await dashRes.json(); setAssignments(d.assignments || []); }
            if (subsRes.ok) setSubmissions(await subsRes.json());
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const openSubmitDialog = (assign: Assignment) => {
        setSelectedAssignment(assign);
        setFileUrl("");
        setNote("");
        setUploadedFileData("");
        setUploadedFileName("");
        if (assign.isOpticTest) {
            setSubmitMode("OPTIC");
            setStudentAnswers(Array(assign.answerKey?.length || 10).fill(''));
        } else {
            setSubmitMode("FILE");
        }
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!selectedAssignment) return;
        const finalFileUrl = submitMode === "FILE" ? uploadedFileData : fileUrl.trim();
        if (submitMode !== "OPTIC" && !finalFileUrl) {
            setFeedback({ type: "error", message: submitMode === "FILE" ? "Lütfen bir dosya yükleyin." : "Lütfen bir dosya linki girin." });
            return;
        }
        if (submitMode === "OPTIC" && studentAnswers.length === 0) {
            setFeedback({ type: "error", message: "Lütfen en az bir şık işaretleyin." });
            return;
        }

        setSubmitting(true);
        try {
            const payload: any = {
                assignmentId: selectedAssignment._id,
                note: note.trim() || (submitMode === "OPTIC" ? "Optik form teslimi" : "Öğrenci teslimi")
            };
            if (submitMode !== "OPTIC") payload.fileUrl = finalFileUrl;
            if (submitMode === "OPTIC") payload.studentAnswers = studentAnswers;

            const res = await apiPost("/education/assignments/submit", payload, { timeout: 30000 });
            if (res.ok) {
                setDialogOpen(false);
                setSelectedAssignment(null);
                setFileUrl("");
                setNote("");
                setUploadedFileData("");
                setUploadedFileName("");
                setFeedback({ type: "success", message: "Ödev başarıyla teslim edildi!" });
                fetchData();
            } else {
                const err = await res.json().catch(() => ({}));
                setFeedback({ type: "error", message: err.message || "Teslim sırasında hata oluştu." });
            }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu. Lütfen tekrar deneyin." }); }
        finally { setSubmitting(false); }
    };

    // Build submission lookup map
    const submissionMap = new Map<string, Submission>();
    submissions.forEach((sub) => {
        const aId = typeof sub.assignmentId === "object" ? sub.assignmentId?._id : sub.assignmentId;
        if (aId) submissionMap.set(aId.toString(), sub);
    });

    /**
     * Determines assignment status with proper deadline handling.
     * Key: dueDate is ISO 8601 from backend. isPast() handles timezone correctly.
     *
     * Status matrix:
     * - Submitted + graded:  "Not: X"   (success, no submit)
     * - Submitted:           "Teslim Edildi" (info, no submit)
     * - Not submitted + expired: "Geç Teslim" (destructive, CAN submit)
     * - Not submitted + active:  "Bekliyor" (warning, CAN submit)
     * - No valid dueDate:    "Bekliyor" (warning, CAN submit)
     */
    const getStatus = (assignmentId: string): AssignmentStatus => {
        const sub = submissionMap.get(assignmentId);

        // Already submitted
        if (sub) {
            if (sub.grade !== undefined && sub.grade !== null) {
                return { label: `Not: ${sub.grade}`, variant: "success", canSubmit: false, isLate: false };
            }
            return { label: "Teslim Edildi", variant: "info", canSubmit: false, isLate: false };
        }

        // Not submitted — check deadline using server flags if available
        const assign = assignments.find(x => x._id === assignmentId);
        if (!assign) {
            return { label: "Bekliyor", variant: "warning", canSubmit: true, isLate: false };
        }

        // Prefer server-computed isExpired flag
        let expired = false;
        if (assign.isExpired !== undefined) {
            expired = assign.isExpired;
        } else if (assign.dueDate) {
            // Client-side fallback: use end-of-day to prevent TZ issues
            const deadline = new Date(assign.dueDate);
            if (!isNaN(deadline.getTime())) {
                deadline.setHours(23, 59, 59, 999);
                expired = isPast(deadline);
            }
        }

        if (expired) {
            // Deadline passed — still allow late submission
            return { label: "Süresi Doldu", variant: "destructive", canSubmit: true, isLate: true };
        }

        // Active — can submit
        if (assign.dueDate) {
            const deadline = new Date(assign.dueDate);
            if (!isNaN(deadline.getTime())) {
                const daysLeft = differenceInDays(deadline, new Date());
                if (daysLeft <= 2) {
                    return { label: `Son ${daysLeft + 1} gün`, variant: "warning", canSubmit: true, isLate: false };
                }
            }
        }
        return { label: "Bekliyor", variant: "warning", canSubmit: true, isLate: false };
    };

    const formatDueDate = (dateStr: string) => {
        if (!dateStr) return "Belirtilmemiş";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "Geçersiz tarih";
        return format(d, "dd MMMM yyyy", { locale: tr });
    };

    const handleDownloadAttachment = (e: React.MouseEvent, att: string, index: number) => {
        e.preventDefault();
        if (att.startsWith("data:")) {
            downloadDataUri(att, `ek-dosya-${index + 1}.${extensionFromDataUri(att)}`);
        } else {
            window.open(att, "_blank");
        }
    };

    const opticSubmissions = submissions.filter(s => s.opticResult);
    const totalOpticCount = opticSubmissions.length;
    const totalCorrect = opticSubmissions.reduce((acc, s) => acc + (s.opticResult?.correct || 0), 0);
    const totalIncorrect = opticSubmissions.reduce((acc, s) => acc + (s.opticResult?.incorrect || 0), 0);
    const totalEmpty = opticSubmissions.reduce((acc, s) => acc + (s.opticResult?.empty || 0), 0);
    const totalNet = opticSubmissions.reduce((acc, s) => acc + Math.max(0, (s.opticResult?.correct || 0) - ((s.opticResult?.incorrect || 0) / 4)), 0);
    const avgNet = totalOpticCount > 0 ? (totalNet / totalOpticCount).toFixed(2) : "0.00";
    const avgScore = totalOpticCount > 0 ? Math.round(opticSubmissions.reduce((acc, s) => acc + (s.opticResult?.score || 0), 0) / totalOpticCount) : 0;

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader title="Ödevlerim" description="Yapılacak ve tamamlanan ödevleriniz." />

            {/* 3-Day Trial Feature Control Section */}
            {is3DayTrialActive() && (
                <div className="space-y-4">
                    <TrialBadge />

                    {/* AI Study Coach & Motivation Assistant */}
                    <AIStudyCoach />

                    {/* Daily Challenge Quiz Widget */}
                    <DailyChallenge />

                    {/* Student Gamification Streak & Badges Bar */}
                    <StudentStreak streakDays={5} completedCount={totalOpticCount} />

                    {/* Pomodoro Timer & Champions Board Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <PomodoroTimer />
                        <ChampionsBoard />
                    </div>

                    {/* Subject Mastery & Weak Spot Radar */}
                    <WeakSpotRadar />
                </div>
            )}

            {/* Overall Student Optic Performance Dashboard Header */}
            {totalOpticCount > 0 && (
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 shadow-lg border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-400/30">
                                <Sparkles className="w-4 h-4 text-amber-300" />
                            </span>
                            <div>
                                <h3 className="text-base font-bold">📈 Genel Optik Başarı Karnem</h3>
                                <p className="text-xs text-slate-400">Çözdüğünüz tüm optik sınavların birikimli net ve puan ortalamaları</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-400/40 text-xs px-2.5 py-1 font-bold">
                            {avgScore >= 85 ? "Mükemmel 🌟" : avgScore >= 60 ? "Başarılı 👍" : "Geliştirilebilir 💡"}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-1">
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                            <div className="text-[11px] text-slate-400 font-medium">Çözülen Optik Test</div>
                            <div className="text-lg font-black text-white">{totalOpticCount} Test</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                            <div className="text-[11px] text-slate-400 font-medium">Ortalama Net</div>
                            <div className="text-lg font-black text-amber-300">{avgNet} Net</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                            <div className="text-[11px] text-slate-400 font-medium">Ortalama Puan</div>
                            <div className="text-lg font-black text-emerald-400">{avgScore} / 100</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                            <div className="text-[11px] text-slate-400 font-medium">Doğru / Yanlış / Boş</div>
                            <div className="text-xs font-bold text-slate-200 mt-1">
                                <span className="text-emerald-400">{totalCorrect}D</span> • <span className="text-rose-400">{totalIncorrect}Y</span> • <span className="text-amber-300">{totalEmpty}B</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AI LGS/YKS Net & Target Simulator */}
            <ExamSimulator gradeLevel={8} averageNet={Number(avgNet) || 14.5} completedTestsCount={totalOpticCount} />

            {feedback && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-toast-in ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                    {feedback.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{feedback.message}
                </div>
            )}

            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-64 rounded-2xl" />)}</div>
            ) : assignments.length === 0 ? (
                <EmptyState icon={FileText} title="Aktif ödev yok" description="Şu an aktif ödeviniz bulunmamaktadır." />
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {assignments.map((assign) => {
                        const status = getStatus(assign._id);
                        const submission = submissionMap.get(assign._id);
                        return (
                            <Card key={assign._id} className={`hover:shadow-md transition-shadow ${status.isLate && !submission ? "border-red-200" : ""}`}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start gap-2">
                                        <Badge variant="secondary">{assign.subjectId?.name || "Ders"}</Badge>
                                        <Badge variant={status.variant}>{status.label}</Badge>
                                    </div>
                                    <CardTitle className="text-lg truncate mt-2">{assign.title}</CardTitle>
                                    <p className="text-sm text-muted-foreground">{assign.teacherId?.firstName} {assign.teacherId?.lastName}</p>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {assign.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-3">{assign.description}</p>
                                    )}
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                        <span>Son Tarih: <strong>{formatDueDate(assign.dueDate)}</strong></span>
                                    </div>
                                    {assign.instructions && (
                                        <p className="text-xs text-muted-foreground italic">📋 {assign.instructions}</p>
                                    )}
                                    {/* Show Teacher Attachments */}
                                    {assign.attachments && assign.attachments.length > 0 && (
                                        <div className="flex flex-col gap-1.5 mt-2">
                                            <p className="text-xs font-semibold text-muted-foreground">Ödev Ek Dosyaları ({assign.attachments.length}):</p>
                                            <div className="flex flex-wrap gap-2">
                                                {assign.attachments.map((att, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={(e) => handleDownloadAttachment(e, att, i)}
                                                        className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl font-medium transition-all border border-blue-200/80 shadow-xs"
                                                        title="Dosyayı İndir veya iPad/iPhone'da Görüntüle"
                                                    >
                                                        <FileText className="h-3.5 w-3.5 text-blue-600" /> Ek Dosya {i + 1} (İndir / Görüntüle)
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {/* Submission details */}
                                    {submission && (
                                        <div className="mt-2 p-3 rounded-xl bg-muted/40 text-xs space-y-1.5">
                                            <p className="text-muted-foreground">
                                                <Clock className="inline h-3 w-3 mr-1" />
                                                Teslim: {format(new Date(submission.submittedAt), "dd.MM.yyyy HH:mm")}
                                            </p>
                                            {submission.fileUrl && (
                                                <p className="text-blue-600 truncate">
                                                    📎 <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{submission.fileUrl}</a>
                                                </p>
                                            )}
                                            {submission.opticResult && (
                                                <div className="flex flex-col gap-1 mt-1 bg-white/50 p-2 rounded border shadow-sm">
                                                    <p className="font-semibold text-emerald-700 mb-1">Optik Form Sonucu:</p>
                                                    <div className="flex gap-3 text-[11px] font-medium">
                                                        <span className="text-emerald-600">{submission.opticResult.correct} Doğru</span>
                                                        <span className="text-rose-600">{submission.opticResult.incorrect} Yanlış</span>
                                                        <span className="text-amber-600">{submission.opticResult.empty} Boş</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-primary mt-0.5">Puan: {submission.opticResult.score}</p>
                                                </div>
                                            )}
                                            {submission.feedback && <p className="text-emerald-700 mt-1">💬 {submission.feedback}</p>}
                                        </div>
                                    )}
                                    {/* Late submission warning */}
                                    {status.isLate && status.canSubmit && (
                                        <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                            <span>Son tarih geçti. Geç teslim yapabilirsiniz.</span>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="border-t pt-4 flex gap-2">
                                    {!status.canSubmit ? (
                                        <>
                                            <Button variant="outline" className="flex-1" disabled>
                                                <CheckCircle className="h-4 w-4" /> {submission?.grade != null ? "Notlandırıldı" : "Teslim Edildi"}
                                            </Button>
                                            {assign.isOpticTest && submission && (
                                                <Button 
                                                    variant="default" 
                                                    className="flex-1"
                                                    onClick={() => {
                                                        setResultSubmission({ assign, sub: submission });
                                                        setResultDialogOpen(true);
                                                    }}
                                                >
                                                    Sonucu Gör
                                                </Button>
                                            )}
                                        </>
                                    ) : (
                                        <Button className="w-full" onClick={() => openSubmitDialog(assign)}>
                                            <Upload className="h-4 w-4" /> {status.isLate ? "Geç Teslim Yap" : "Teslim Et"}
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Submit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setSelectedAssignment(null); }}>
                <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Ödev Teslimi</DialogTitle>
                        <DialogDescription>
                            <strong>{selectedAssignment?.title}</strong> — dosya yükleyin veya link yapıştırın.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedAssignment && getStatus(selectedAssignment._id).isLate && (
                        <div className="flex items-center gap-2 bg-amber-50 text-amber-700 text-sm px-4 py-2.5 rounded-xl border border-amber-200">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            Son tarih geçmiş. Geç teslim olarak işaretlenecektir.
                        </div>
                    )}

                    {/* Mode Tabs */}
                    <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
                        {selectedAssignment?.isOpticTest && (
                            <button
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${submitMode === "OPTIC" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                                onClick={() => setSubmitMode("OPTIC")}
                            >
                                <CheckCircle className="h-4 w-4" /> Optik Form
                            </button>
                        )}
                        <button
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${submitMode === "FILE" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                            onClick={() => setSubmitMode("FILE")}
                        >
                            <Upload className="h-4 w-4" /> Dosya Yükle
                        </button>
                        <button
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${submitMode === "LINK" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                            onClick={() => setSubmitMode("LINK")}
                        >
                            <Link2 className="h-4 w-4" /> Link Yapıştır
                        </button>
                    </div>

                    <div className="grid gap-4 py-2">
                        {submitMode === "OPTIC" ? (
                            <div className="grid gap-2">
                                <OpticForm
                                    mode="edit"
                                    title={selectedAssignment?.title}
                                    questionCount={selectedAssignment?.answerKey?.length || 10}
                                    optionsCount={selectedAssignment?.opticOptionsCount || 4}
                                    studentAnswers={studentAnswers}
                                    onChange={(index, answer) => {
                                        const newAns = [...studentAnswers];
                                        newAns[index] = answer;
                                        setStudentAnswers(newAns);
                                    }}
                                    onClearAll={() => setStudentAnswers(Array(selectedAssignment?.answerKey?.length || 10).fill(''))}
                                    className="max-h-[60vh] overflow-y-auto p-2 border rounded-xl bg-muted/20 custom-scrollbar"
                                />
                                <p className="text-xs text-muted-foreground mt-1 text-center">Lütfen çözdüğünüz teste ait şıkları işaretleyiniz. Şıkkı geri almak için tekrar tıklayabilirsiniz.</p>
                            </div>
                        ) : submitMode === "FILE" ? (
                            <div className="grid gap-2">
                                <Label>Dosya Yükle <span className="text-destructive">*</span></Label>
                                <div
                                    className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {uploadedFileName ? (
                                        <div className="flex flex-col items-center gap-2">
                                            {uploadedFileData.startsWith("data:image") ? (
                                                <img src={uploadedFileData} alt="" className="max-h-32 rounded-lg object-contain" />
                                            ) : (
                                                <FileText className="h-10 w-10 text-primary opacity-60" />
                                            )}
                                            <p className="text-sm font-medium text-primary">{uploadedFileName}</p>
                                            <p className="text-xs text-muted-foreground">Değiştirmek için tıklayın</p>
                                        </div>
                                    ) : (
                                        <div className="text-muted-foreground">
                                            <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm font-medium">Dosya yüklemek için tıklayın</p>
                                            <p className="text-xs mt-1">Resim, PDF — Max 10MB</p>
                                        </div>
                                    )}
                                </div>
                                <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} />
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                <Label>Dosya Linki <span className="text-destructive">*</span></Label>
                                <Input
                                    value={fileUrl}
                                    onChange={(e) => setFileUrl(e.target.value)}
                                    placeholder="https://drive.google.com/..."
                                    autoFocus
                                />
                                <p className="text-xs text-muted-foreground">Google Drive, Dropbox veya başka bir paylaşım linki yapıştırın.</p>
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label>Not (opsiyonel)</Label>
                            <Textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Teslim hakkında eklemek istediğiniz notlar..."
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting || (submitMode === "FILE" ? !uploadedFileData : submitMode === "LINK" ? !fileUrl.trim() : studentAnswers.every(a => !a))}
                        >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                            {submitting ? "Gönderiliyor..." : "Gönder"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Result Dialog */}
            <Dialog open={resultDialogOpen} onOpenChange={(open) => { setResultDialogOpen(open); if (!open) setResultSubmission(null); }}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Optik Form Sonucu</DialogTitle>
                        <DialogDescription>
                            <strong>{resultSubmission?.assign?.title}</strong> ödevinizin optik sonuçları.
                        </DialogDescription>
                    </DialogHeader>

                    {resultSubmission && resultSubmission.sub.opticResult && (
                        <div className="flex justify-center gap-6 my-2 p-4 bg-muted/40 rounded-xl border">
                            <div className="flex flex-col items-center">
                                <span className="text-2xl font-bold text-emerald-600">{resultSubmission.sub.opticResult.correct}</span>
                                <span className="text-xs font-medium text-emerald-700">Doğru</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-2xl font-bold text-rose-600">{resultSubmission.sub.opticResult.incorrect}</span>
                                <span className="text-xs font-medium text-rose-700">Yanlış</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-2xl font-bold text-amber-600">{resultSubmission.sub.opticResult.empty}</span>
                                <span className="text-xs font-medium text-amber-700">Boş</span>
                            </div>
                            <div className="flex flex-col items-center border-l pl-6 ml-2">
                                <span className="text-2xl font-bold text-primary">{resultSubmission.sub.opticResult.score}</span>
                                <span className="text-xs font-medium text-primary">Puan</span>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-2">
                        {resultSubmission && (
                            <OpticForm
                                mode="view"
                                title={resultSubmission.assign.title}
                                questionCount={resultSubmission.assign.answerKey?.length || 10}
                                optionsCount={resultSubmission.assign.opticOptionsCount || 4}
                                studentAnswers={resultSubmission.sub.studentAnswers || []}
                                answerKey={resultSubmission.assign.answerKey || []}
                                className="max-h-[65vh] overflow-y-auto p-1 custom-scrollbar"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
