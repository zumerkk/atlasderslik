"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import {
    Calendar, FileText, Upload, CheckCircle, AlertCircle, Loader2, Clock,
    AlertTriangle, Link2, Sparkles, History, ListChecks, Gamepad2,
} from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";
import { tr } from "date-fns/locale";
import { apiGet, apiPost } from "@/lib/api";
import { downloadDataUri, extensionFromDataUri } from "@/lib/download";
import { OpticForm } from "@/components/ui/optic-form";
import { ExamSimulator, LgsData } from "@/components/ui/exam-simulator";
import { StudentStreak, StreakData } from "@/components/ui/student-streak";
import { DailyChallenge, DailyChallengeData } from "@/components/ui/daily-challenge";
import { PomodoroTimer } from "@/components/ui/pomodoro-timer";
import { ChampionsBoard, LeaderboardData } from "@/components/ui/champions-board";
import { AIStudyCoach } from "@/components/ui/ai-study-coach";
import { WeakSpotRadar, WeakSpotData } from "@/components/ui/weak-spot-radar";
import { GamificationStore, StoreData, XpBreakdownRow } from "@/components/ui/gamification-store";
import { CalendarSync } from "@/components/ui/calendar-sync";
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
    attachmentCount?: number;
    isOpticTest?: boolean;
    opticOptionsCount?: number;
    answerKey?: string[];
    durationMinutes?: number;
}

interface Submission {
    _id: string;
    assignmentId: any;
    fileUrl: string;
    hasFile?: boolean;
    note: string;
    grade?: number;
    feedback?: string;
    submittedAt: string;
    studentAnswers?: string[];
    opticResult?: { correct: number; incorrect: number; empty: number; score: number };
}

interface GamificationOverview {
    xp: {
        earnedXp: number;
        spentXp: number;
        availableXp: number;
        breakdown: XpBreakdownRow[];
        streak: StreakData;
        stats: { opticCount: number; totalCorrect: number; submissionCount: number; challengeCorrect: number };
    };
    leaderboard: LeaderboardData;
    weakSpots: WeakSpotData;
    lgs: LgsData;
    challenge: DailyChallengeData;
    store: StoreData;
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
    const [fileUrl, setFileUrl] = useState("");
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [submitMode, setSubmitMode] = useState<"LINK" | "FILE" | "OPTIC">("FILE");
    const [studentAnswers, setStudentAnswers] = useState<string[]>([]);
    const [uploadedFileData, setUploadedFileData] = useState<string>("");
    const [uploadedFileName, setUploadedFileName] = useState<string>("");
    const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Gamification comes from one consolidated request instead of six.
    const [gami, setGami] = useState<GamificationOverview | null>(null);
    const [gamiLoading, setGamiLoading] = useState(true);
    const [coachKey, setCoachKey] = useState(0);

    const trialActive = is3DayTrialActive();

    // ─── data ───────────────────────────────────────────

    const fetchData = useCallback(async () => {
        try {
            const [assignRes, subsRes] = await Promise.all([
                apiGet("/education/student/assignments").catch(() => null),
                apiGet("/education/submissions/mine").catch(() => null),
            ]);

            if (assignRes && assignRes.ok) {
                const data = await assignRes.json();
                setAssignments(Array.isArray(data) ? data : (data.assignments || []));
            } else {
                const dashRes = await apiGet("/education/student/dashboard").catch(() => null);
                if (dashRes && dashRes.ok) {
                    const d = await dashRes.json();
                    setAssignments(d.assignments || []);
                }
            }

            if (subsRes && subsRes.ok) setSubmissions(await subsRes.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchGamification = useCallback(async () => {
        if (!trialActive) { setGamiLoading(false); return; }
        setGamiLoading(true);
        try {
            const res = await apiGet("/gamification/overview", { timeout: 30000 });
            if (res.ok) setGami(await res.json());
        } catch (e) {
            console.error("gamification overview failed", e);
        } finally {
            setGamiLoading(false);
        }
    }, [trialActive]);

    useEffect(() => { fetchData(); fetchGamification(); }, [fetchData, fetchGamification]);
    useEffect(() => { if (feedback) { const t = setTimeout(() => setFeedback(null), 4000); return () => clearTimeout(t); } }, [feedback]);

    const refreshAll = useCallback(() => {
        fetchGamification();
        setCoachKey((k) => k + 1);
    }, [fetchGamification]);

    // ─── file handling ──────────────────────────────────

    const compressImage = (file: File, maxWidth = 1200, quality = 0.7): Promise<string> =>
        new Promise((resolve, reject) => {
            const img = new window.Image();
            const objectUrl = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                const canvas = document.createElement("canvas");
                let w = img.width, h = img.height;
                if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext("2d");
                if (!ctx) { reject(new Error("Canvas error")); return; }
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL("image/jpeg", quality));
            };
            img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Image load error")); };
            img.src = objectUrl;
        });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            setFeedback({ type: "error", message: "Dosya boyutu 10MB'dan küçük olmalıdır." });
            return;
        }
        try {
            setFeedback({ type: "success", message: "Dosya hazırlanıyor..." });
            const dataUrl = file.type.startsWith("image/")
                ? await compressImage(file)
                : await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => resolve(ev.target?.result as string);
                    reader.onerror = () => reject(new Error("Dosya okunamadı"));
                    reader.readAsDataURL(file);
                });
            setUploadedFileData(dataUrl);
            setUploadedFileName(file.name);
            setFeedback(null);
        } catch {
            setFeedback({ type: "error", message: "Dosya yüklenirken hata oluştu." });
        }
    };

    const handleDownloadAttachment = async (e: React.MouseEvent, assignmentId: string, index: number) => {
        e.preventDefault();
        const key = `${assignmentId}:${index}`;
        setDownloadingKey(key);
        try {
            const res = await apiGet(`/education/assignments/${assignmentId}/attachment/${index}`, { timeout: 60000 });
            if (!res.ok) throw new Error("fetch failed");
            const { dataUri } = await res.json();
            if (!dataUri) throw new Error("empty");
            if (dataUri.startsWith("data:")) {
                downloadDataUri(dataUri, `ek-dosya-${index + 1}.${extensionFromDataUri(dataUri)}`);
            } else {
                window.open(dataUri, "_blank");
            }
        } catch {
            setFeedback({ type: "error", message: "Ek dosya indirilemedi. Lütfen tekrar deneyin." });
        } finally {
            setDownloadingKey(null);
        }
    };

    const handleViewSubmissionFile = async (e: React.MouseEvent, submissionId: string) => {
        e.preventDefault();
        setDownloadingKey(`sub:${submissionId}`);
        try {
            const res = await apiGet(`/education/submissions/${submissionId}/file`, { timeout: 60000 });
            if (!res.ok) throw new Error("fetch failed");
            const { fileUrl: url } = await res.json();
            if (!url) throw new Error("empty");
            if (url.startsWith("data:")) {
                downloadDataUri(url, `teslim-dosyasi.${extensionFromDataUri(url)}`);
            } else {
                window.open(url, "_blank");
            }
        } catch {
            setFeedback({ type: "error", message: "Teslim dosyası açılamadı. Lütfen tekrar deneyin." });
        } finally {
            setDownloadingKey(null);
        }
    };

    // ─── submit ─────────────────────────────────────────

    const openSubmitDialog = (assign: Assignment) => {
        setSelectedAssignment(assign);
        setFileUrl(""); setNote(""); setUploadedFileData(""); setUploadedFileName("");
        if (assign.isOpticTest) {
            setSubmitMode("OPTIC");
            setStudentAnswers(Array(assign.answerKey?.length || 10).fill(""));
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
                note: note.trim() || (submitMode === "OPTIC" ? "Optik form teslimi" : "Öğrenci teslimi"),
            };
            if (submitMode !== "OPTIC") payload.fileUrl = finalFileUrl;
            if (submitMode === "OPTIC") payload.studentAnswers = studentAnswers;

            const res = await apiPost("/education/assignments/submit", payload, { timeout: 60000 });
            if (res.ok) {
                setDialogOpen(false);
                setSelectedAssignment(null);
                setFileUrl(""); setNote(""); setUploadedFileData(""); setUploadedFileName("");
                setFeedback({ type: "success", message: "Ödev başarıyla teslim edildi!" });
                fetchData();
                refreshAll();
            } else {
                const err = await res.json().catch(() => ({}));
                setFeedback({ type: "error", message: err.message || "Teslim sırasında hata oluştu." });
            }
        } catch {
            setFeedback({ type: "error", message: "Bir hata oluştu. Lütfen tekrar deneyin." });
        } finally {
            setSubmitting(false);
        }
    };

    // ─── derived ────────────────────────────────────────

    const submissionMap = new Map<string, Submission>();
    submissions.forEach((sub) => {
        const aId = typeof sub.assignmentId === "object" ? sub.assignmentId?._id : sub.assignmentId;
        if (aId) submissionMap.set(aId.toString(), sub);
    });

    const getStatus = (assignmentId: string): AssignmentStatus => {
        const sub = submissionMap.get(assignmentId);
        if (sub) {
            if (sub.grade !== undefined && sub.grade !== null) {
                return { label: `Not: ${sub.grade}`, variant: "success", canSubmit: false, isLate: false };
            }
            return { label: "Teslim Edildi", variant: "info", canSubmit: false, isLate: false };
        }

        const assign = assignments.find((x) => x._id === assignmentId);
        if (!assign) return { label: "Bekliyor", variant: "warning", canSubmit: true, isLate: false };

        let expired = false;
        if (assign.isExpired !== undefined) {
            expired = assign.isExpired;
        } else if (assign.dueDate) {
            const deadline = new Date(assign.dueDate);
            if (!isNaN(deadline.getTime())) {
                deadline.setHours(23, 59, 59, 999);
                expired = isPast(deadline);
            }
        }

        if (expired) return { label: "Süresi Doldu", variant: "destructive", canSubmit: true, isLate: true };

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

    const isExpired = (a: Assignment) => {
        if (a.isExpired !== undefined) return a.isExpired;
        if (!a.dueDate) return false;
        const d = new Date(a.dueDate);
        if (isNaN(d.getTime())) return false;
        d.setHours(23, 59, 59, 999);
        return isPast(d);
    };

    const submitted = assignments.filter((a) => submissionMap.has(a._id));
    const pending = assignments.filter((a) => !submissionMap.has(a._id));
    const activeAssignments = pending.filter((a) => !isExpired(a));
    const expiredAssignments = pending.filter((a) => isExpired(a));

    const formatDueDate = (dateStr: string) => {
        if (!dateStr) return "Belirtilmemiş";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "Geçersiz tarih";
        return format(d, "dd MMMM yyyy", { locale: tr });
    };

    // Optic performance summary (local, from the student's own submissions).
    const opticSubmissions = submissions.filter((s) => s.opticResult);
    const totalOpticCount = opticSubmissions.length;
    const totalCorrect = opticSubmissions.reduce((a, s) => a + (s.opticResult?.correct || 0), 0);
    const totalIncorrect = opticSubmissions.reduce((a, s) => a + (s.opticResult?.incorrect || 0), 0);
    const totalEmpty = opticSubmissions.reduce((a, s) => a + (s.opticResult?.empty || 0), 0);
    const totalNet = opticSubmissions.reduce((a, s) => a + Math.max(0, (s.opticResult?.correct || 0) - ((s.opticResult?.incorrect || 0) / 4)), 0);
    const avgNet = totalOpticCount > 0 ? totalNet / totalOpticCount : 0;
    const avgScore = totalOpticCount > 0 ? Math.round(opticSubmissions.reduce((a, s) => a + (s.opticResult?.score || 0), 0) / totalOpticCount) : 0;

    // ─── card renderer ──────────────────────────────────

    const renderCard = (assign: Assignment) => {
        const status = getStatus(assign._id);
        const submission = submissionMap.get(assign._id);
        const attCount = assign.attachmentCount ?? assign.attachments?.length ?? 0;

        return (
            <Card key={assign._id} className={`hover:shadow-md transition-shadow ${status.isLate && !submission ? "border-red-200" : ""}`}>
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                        <Badge variant="secondary">{assign.subjectId?.name || "Ders"}</Badge>
                        <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <CardTitle className="text-lg truncate mt-2">{assign.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        {assign.teacherId?.firstName} {assign.teacherId?.lastName}
                    </p>
                </CardHeader>
                <CardContent className="space-y-3">
                    {assign.description && <p className="text-sm text-muted-foreground line-clamp-3">{assign.description}</p>}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Son Tarih: <strong>{formatDueDate(assign.dueDate)}</strong></span>
                    </div>

                    {assign.instructions && <p className="text-xs text-muted-foreground italic">📋 {assign.instructions}</p>}

                    {attCount > 0 && (
                        <div className="flex flex-col gap-1.5 mt-2">
                            <p className="text-xs font-semibold text-muted-foreground">Ödev Ek Dosyaları ({attCount}):</p>
                            <div className="flex flex-wrap gap-2">
                                {Array.from({ length: attCount }).map((_, i) => {
                                    const busy = downloadingKey === `${assign._id}:${i}`;
                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            disabled={busy}
                                            onClick={(e) => handleDownloadAttachment(e, assign._id, i)}
                                            className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl font-medium transition-all border border-blue-200/80 shadow-xs disabled:opacity-60"
                                            title="Dosyayı İndir veya iPad/iPhone'da Görüntüle"
                                        >
                                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5 text-blue-600" />}
                                            Ek Dosya {i + 1}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {submission && (
                        <div className="mt-2 p-3 rounded-xl bg-muted/40 text-xs space-y-1.5">
                            <p className="text-muted-foreground">
                                <Clock className="inline h-3 w-3 mr-1" />
                                Teslim: {format(new Date(submission.submittedAt), "dd.MM.yyyy HH:mm")}
                            </p>
                            {submission.opticResult && (
                                <div className="flex gap-3 font-semibold">
                                    <span className="text-emerald-600">{submission.opticResult.correct}D</span>
                                    <span className="text-rose-600">{submission.opticResult.incorrect}Y</span>
                                    <span className="text-amber-600">{submission.opticResult.empty}B</span>
                                    <span className="text-primary">{submission.opticResult.score} puan</span>
                                </div>
                            )}
                            {(submission.fileUrl || submission.hasFile) && (
                                <p className="text-blue-600 truncate">
                                    📁 Teslim Dosyası:{" "}
                                    {submission.fileUrl ? (
                                        <a href={submission.fileUrl} target="_blank" rel="noreferrer" className="underline font-semibold">Görüntüle</a>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={downloadingKey === `sub:${submission._id}`}
                                            onClick={(e) => handleViewSubmissionFile(e, submission._id)}
                                            className="underline font-semibold disabled:opacity-60"
                                        >
                                            {downloadingKey === `sub:${submission._id}` ? "Yükleniyor..." : "Görüntüle"}
                                        </button>
                                    )}
                                </p>
                            )}
                            {submission.note && <p className="italic text-muted-foreground">&quot;{submission.note}&quot;</p>}
                            {submission.feedback && (
                                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 font-medium">
                                    💬 Öğretmen Notu: {submission.feedback}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="pt-2">
                        {status.canSubmit ? (
                            <Button className="w-full" onClick={() => openSubmitDialog(assign)}>
                                {assign.isOpticTest ? "📝 Optik Formu Doldur & Teslim Et" : "Ödevi Teslim Et"}
                            </Button>
                        ) : (
                            <Button variant="outline" className="w-full" disabled>Teslim Edildi</Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    };

    const grid = (list: Assignment[]) => (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{list.map(renderCard)}</div>
    );

    const skeleton = (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-64 rounded-2xl" />)}
        </div>
    );

    return (
        <div className="space-y-4 animate-fade-in">
            <PageHeader title="Ödevlerim" description="Yapılacak ve tamamlanan ödevleriniz." />

            {feedback && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-toast-in ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                    {feedback.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {feedback.message}
                </div>
            )}

            {loading ? (
                skeleton
            ) : assignments.length === 0 ? (
                <EmptyState icon={FileText} title="Aktif ödev yok" description="Şu an size atanmış bir ödev bulunmamaktadır." />
            ) : (
                <div className="space-y-3">
                    <CollapsibleSection
                        title="Aktif Ödevlerim & Optik Testlerim"
                        description="Teslim süresi devam eden ödevler"
                        icon={<ListChecks className="w-5 h-5 text-primary" />}
                        count={activeAssignments.length}
                        countLabel="ödev"
                        defaultOpen
                    >
                        {activeAssignments.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">
                                🎉 Bekleyen aktif ödevin yok. Harika iş!
                            </p>
                        ) : grid(activeAssignments)}
                    </CollapsibleSection>

                    <CollapsibleSection
                        title="Süresi Geçen Ödevler"
                        description="Son tarihi geçmiş, hâlâ geç teslim edilebilir"
                        icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
                        count={expiredAssignments.length}
                        countLabel="ödev"
                        tone="warning"
                    >
                        {expiredAssignments.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">Süresi geçmiş ödevin yok.</p>
                        ) : grid(expiredAssignments)}
                    </CollapsibleSection>

                    <CollapsibleSection
                        title="Teslim Ettiklerim"
                        description="Tamamlanan ödevler, notlar ve öğretmen geri bildirimleri"
                        icon={<History className="w-5 h-5 text-emerald-600" />}
                        count={submitted.length}
                        countLabel="teslim"
                        tone="muted"
                    >
                        {submitted.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">Henüz teslim ettiğin ödev yok.</p>
                        ) : grid(submitted)}
                    </CollapsibleSection>
                </div>
            )}

            {/* Optic performance summary */}
            {totalOpticCount > 0 && (
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 shadow-lg border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-400/30 shrink-0">
                                <Sparkles className="w-4 h-4 text-amber-300" />
                            </span>
                            <div className="min-w-0">
                                <h3 className="text-base font-bold truncate">📈 Genel Optik Başarı Karnem</h3>
                                <p className="text-xs text-slate-400 truncate">Tüm optik sınavlarının birikimli ortalaması</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-400/40 text-xs px-2.5 py-1 font-bold shrink-0">
                            {avgScore >= 85 ? "Mükemmel 🌟" : avgScore >= 60 ? "Başarılı 👍" : "Geliştirilebilir 💡"}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-1">
                        <SummaryTile label="Çözülen Optik Test" value={`${totalOpticCount} Test`} />
                        <SummaryTile label="Ortalama Net" value={`${avgNet.toFixed(2)} Net`} valueClass="text-amber-300" />
                        <SummaryTile label="Ortalama Puan" value={`${avgScore} / 100`} valueClass="text-emerald-400" />
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                            <div className="text-[11px] text-slate-400 font-medium">Doğru / Yanlış / Boş</div>
                            <div className="text-xs font-bold text-slate-200 mt-1">
                                <span className="text-emerald-400">{totalCorrect}D</span> ·{" "}
                                <span className="text-rose-400">{totalIncorrect}Y</span> ·{" "}
                                <span className="text-amber-300">{totalEmpty}B</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Gamification / AI features */}
            {trialActive && (
                <div className="space-y-3 pt-2 border-t border-border/80">
                    <TrialBadge />

                    <CollapsibleSection
                        title="Kişisel Gelişim & Ödül Merkezi"
                        description="AI koçun, günün sorusu, sıralaman, XP mağazan ve LGS tahminin"
                        icon={<Gamepad2 className="w-5 h-5 text-indigo-500" />}
                        defaultOpen
                    >
                        <div className="space-y-4">
                            <AIStudyCoach refreshKey={coachKey} />

                            <DailyChallenge
                                data={gami?.challenge}
                                loading={gamiLoading}
                                onAnswered={refreshAll}
                            />

                            <StudentStreak
                                streak={gami?.xp?.streak}
                                opticCount={gami?.xp?.stats?.opticCount ?? totalOpticCount}
                                avgNet={avgNet}
                                avgScore={avgScore}
                                loading={gamiLoading}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <PomodoroTimer />
                                <ChampionsBoard data={gami?.leaderboard} loading={gamiLoading} />
                            </div>

                            <WeakSpotRadar data={gami?.weakSpots} loading={gamiLoading} />

                            <GamificationStore
                                data={gami?.store}
                                breakdown={gami?.xp?.breakdown ?? []}
                                loading={gamiLoading}
                                onChange={refreshAll}
                            />

                            <ExamSimulator data={gami?.lgs} loading={gamiLoading} />

                            <div className="p-3 rounded-2xl bg-card border border-border flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-xs font-semibold text-foreground min-w-0">
                                    <CalendarSync title="Ödev & Sınav Takvimi" />
                                </div>
                                <span className="text-[10px] text-muted-foreground text-right shrink-0">
                                    Etkinlikleri telefon takvimine tek tıkla aktar
                                </span>
                            </div>
                        </div>
                    </CollapsibleSection>
                </div>
            )}

            {/* Submit dialog */}
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

                    <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
                        {selectedAssignment?.isOpticTest && (
                            <ModeTab active={submitMode === "OPTIC"} onClick={() => setSubmitMode("OPTIC")} icon={<CheckCircle className="h-4 w-4" />} label="Optik Form" />
                        )}
                        <ModeTab active={submitMode === "FILE"} onClick={() => setSubmitMode("FILE")} icon={<Upload className="h-4 w-4" />} label="Dosya Yükle" />
                        <ModeTab active={submitMode === "LINK"} onClick={() => setSubmitMode("LINK")} icon={<Link2 className="h-4 w-4" />} label="Link Yapıştır" />
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
                                        const next = [...studentAnswers];
                                        next[index] = answer;
                                        setStudentAnswers(next);
                                    }}
                                    onClearAll={() => setStudentAnswers(Array(selectedAssignment?.answerKey?.length || 10).fill(""))}
                                    className="max-h-[60vh] overflow-y-auto p-2 border rounded-xl bg-muted/20 custom-scrollbar"
                                />
                                <p className="text-xs text-muted-foreground mt-1 text-center">
                                    Çözdüğün teste ait şıkları işaretle. Geri almak için tekrar tıkla.
                                </p>
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
                                <Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://drive.google.com/..." autoFocus />
                                <p className="text-xs text-muted-foreground">Google Drive, Dropbox veya başka bir paylaşım linki yapıştır.</p>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label>Not (opsiyonel)</Label>
                            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Teslim hakkında eklemek istediğin notlar..." rows={2} />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting || (submitMode === "FILE" ? !uploadedFileData : submitMode === "LINK" ? !fileUrl.trim() : studentAnswers.every((a) => !a))}
                        >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                            {submitting ? "Gönderiliyor..." : "Gönder"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function SummaryTile({ label, value, valueClass = "text-white" }: { label: string; value: string; valueClass?: string }) {
    return (
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
            <div className="text-[11px] text-slate-400 font-medium">{label}</div>
            <div className={`text-lg font-black ${valueClass}`}>{value}</div>
        </div>
    );
}

function ModeTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
                active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
        >
            {icon} {label}
        </button>
    );
}
