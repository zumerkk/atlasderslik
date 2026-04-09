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
import { Calendar, FileText, Upload, CheckCircle, AlertCircle, Loader2, Clock, AlertTriangle, Link2, Image } from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";
import { tr } from "date-fns/locale";
import { apiGet, apiPost } from "@/lib/api";

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
}

interface Submission {
    _id: string;
    assignmentId: any;
    fileUrl: string;
    note: string;
    grade?: number;
    feedback?: string;
    submittedAt: string;
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
    const [submitMode, setSubmitMode] = useState<"LINK" | "FILE">("FILE");
    const [uploadedFileData, setUploadedFileData] = useState<string>("");
    const [uploadedFileName, setUploadedFileName] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Compress image for base64 upload
    const compressImage = (file: File, maxWidth = 1200, quality = 0.7): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new window.Image();
            const reader = new FileReader();
            reader.onload = (ev) => {
                img.onload = () => {
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
                img.onerror = () => reject(new Error("Image load error"));
                img.src = ev.target?.result as string;
            };
            reader.onerror = () => reject(new Error("FileReader error"));
            reader.readAsDataURL(file);
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
        setSubmitMode("FILE");
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!selectedAssignment) return;
        const finalFileUrl = submitMode === "FILE" ? uploadedFileData : fileUrl.trim();
        if (!finalFileUrl) {
            setFeedback({ type: "error", message: submitMode === "FILE" ? "Lütfen bir dosya yükleyin." : "Lütfen bir dosya linki girin." });
            return;
        }
        setSubmitting(true);
        try {
            const res = await apiPost("/education/assignments/submit", {
                assignmentId: selectedAssignment._id,
                fileUrl: finalFileUrl,
                note: note.trim() || "Öğrenci teslimi",
            }, { timeout: 30000 });
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

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader title="Ödevlerim" description="Yapılacak ve tamamlanan ödevleriniz." />

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
                                            {submission.feedback && <p className="text-emerald-700">💬 {submission.feedback}</p>}
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
                                <CardFooter className="border-t pt-4">
                                    {!status.canSubmit ? (
                                        <Button variant="outline" className="w-full" disabled>
                                            <CheckCircle className="h-4 w-4" /> {submission?.grade != null ? "Notlandırıldı" : "Teslim Edildi"}
                                        </Button>
                                    ) : (
                                        <Button
                                            className={`w-full ${status.isLate ? "bg-amber-600 hover:bg-amber-700" : ""}`}
                                            onClick={() => openSubmitDialog(assign)}
                                        >
                                            <Upload className="h-4 w-4" /> {status.isLate ? "Geç Teslim Yap" : "Ödev Yükle"}
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
                <DialogContent className="sm:max-w-md">
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
                        {submitMode === "FILE" ? (
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
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting || (submitMode === "FILE" ? !uploadedFileData : !fileUrl.trim())}
                        >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {submitting ? "Gönderiliyor..." : "Gönder"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
