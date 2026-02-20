"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Loader2, CheckCircle, AlertCircle, Trash2, GraduationCap } from "lucide-react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

interface Grade { _id: string; level: number; }
interface Student { _id: string; firstName: string; lastName: string; email: string; }
interface Enrollment {
    _id: string;
    studentId: { _id: string; firstName: string; lastName: string; email: string };
    gradeId: { _id: string; level: number };
    enrollmentDate: string;
}

export default function StudentEnrollmentsPage() {
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedGrade, setSelectedGrade] = useState("");
    const [selectedStudent, setSelectedStudent] = useState("");

    const [deleteItem, setDeleteItem] = useState<Enrollment | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    useEffect(() => { fetchAll(); }, []);
    useEffect(() => { if (feedback) { const t = setTimeout(() => setFeedback(null), 3000); return () => clearTimeout(t); } }, [feedback]);

    const fetchAll = async () => {
        try {
            const [enrollRes, gradeRes, usersRes] = await Promise.all([
                apiGet("/education/student-enrollments"),
                apiGet("/education/grades"),
                apiGet("/users?role=STUDENT"),
            ]);
            if (enrollRes.ok) setEnrollments(await enrollRes.json());
            if (gradeRes.ok) setGrades(await gradeRes.json());
            if (usersRes.ok) setStudents(await usersRes.json());
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const handleCreate = async () => {
        if (!selectedGrade || !selectedStudent) return;
        setSubmitting(true); setFeedback(null);
        try {
            const res = await apiPost("/education/student-enrollments", { gradeId: selectedGrade, studentId: selectedStudent });
            if (res.ok) {
                setFeedback({ type: "success", message: "Öğrenci başarıyla kaydedildi!" });
                setDialogOpen(false);
                setSelectedGrade(""); setSelectedStudent("");
                fetchAll();
            } else {
                const data = await res.json().catch(() => ({}));
                setFeedback({ type: "error", message: data.message || "Kayıt başarısız." });
            }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        if (!deleteItem) return;
        setSubmitting(true);
        try {
            const res = await apiDelete(`/education/student-enrollments/${deleteItem._id}`);
            if (res.ok) { setFeedback({ type: "success", message: "Kayıt silindi!" }); setDeleteDialogOpen(false); fetchAll(); }
            else { setFeedback({ type: "error", message: "Silme başarısız." }); }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); }
        finally { setSubmitting(false); }
    };

    const selectClass = "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring";

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader title="Öğrenci Kayıtları" description="Öğrencileri sınıflara kaydedin.">
                <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Yeni Kayıt
                </Button>
            </PageHeader>

            {/* Feedback */}
            {feedback && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-toast-in ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}>
                    {feedback.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {feedback.message}
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
                </div>
            ) : enrollments.length === 0 ? (
                <EmptyState icon={GraduationCap} title="Henüz öğrenci kayıt edilmemiş" description="'Yeni Kayıt' butonunu kullanarak öğrenci ekleyin." />
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Öğrenci</TableHead>
                            <TableHead>E-posta</TableHead>
                            <TableHead>Sınıf</TableHead>
                            <TableHead>Kayıt Tarihi</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {enrollments.map((e) => (
                            <TableRow key={e._id}>
                                <TableCell className="font-semibold">{e.studentId?.firstName} {e.studentId?.lastName}</TableCell>
                                <TableCell className="text-muted-foreground">{e.studentId?.email}</TableCell>
                                <TableCell>
                                    <Badge variant="info">{e.gradeId?.level}. Sınıf</Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{new Date(e.enrollmentDate).toLocaleDateString("tr-TR")}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setDeleteItem(e); setDeleteDialogOpen(true); }}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            {/* Create Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Yeni Öğrenci Kaydı</DialogTitle>
                        <DialogDescription>Öğrenciyi bir sınıfa kaydedin.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Öğrenci</label>
                            <select className={selectClass} value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}>
                                <option value="">Öğrenci Seçin</option>
                                {students.map(s => <option key={s._id} value={s._id}>{s.firstName} {s.lastName} ({s.email})</option>)}
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Sınıf</label>
                            <select className={selectClass} value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}>
                                <option value="">Sınıf Seçin</option>
                                {grades.map(g => <option key={g._id} value={g._id}>{g.level}. Sınıf</option>)}
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
                        <Button onClick={handleCreate} disabled={submitting || !selectedGrade || !selectedStudent}>
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Kaydet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Kayıt Sil</DialogTitle>
                        <DialogDescription>Bu kayıt geri alınamaz şekilde silinecek. Emin misiniz?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Sil
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
