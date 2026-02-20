"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Loader2, CheckCircle, AlertCircle, Trash2, UserCheck } from "lucide-react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

interface Grade { _id: string; level: number; }
interface Subject { _id: string; name: string; gradeLevel: number; }
interface Teacher { _id: string; firstName: string; lastName: string; email: string; }
interface Assignment {
    _id: string;
    gradeId: { _id: string; level: number };
    subjectId: { _id: string; name: string; gradeLevel: number };
    teacherId: { _id: string; firstName: string; lastName: string; email: string };
}

export default function TeacherAssignmentsPage() {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedGrade, setSelectedGrade] = useState("");
    const [selectedSubject, setSelectedSubject] = useState("");
    const [selectedTeacher, setSelectedTeacher] = useState("");

    const [deleteItem, setDeleteItem] = useState<Assignment | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    useEffect(() => { fetchAll(); }, []);
    useEffect(() => { if (feedback) { const t = setTimeout(() => setFeedback(null), 3000); return () => clearTimeout(t); } }, [feedback]);

    const fetchAll = async () => {
        try {
            const [assignRes, gradeRes, subjectRes, usersRes] = await Promise.all([
                apiGet("/education/teacher-assignments"),
                apiGet("/education/grades"),
                apiGet("/education/subjects/all"),
                apiGet("/users?role=TEACHER"),
            ]);
            if (assignRes.ok) setAssignments(await assignRes.json());
            if (gradeRes.ok) setGrades(await gradeRes.json());
            if (subjectRes.ok) setSubjects(await subjectRes.json());
            if (usersRes.ok) setTeachers(await usersRes.json());
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const filteredSubjects = selectedGrade
        ? subjects.filter(s => {
            const grade = grades.find(g => g._id === selectedGrade);
            return grade ? s.gradeLevel === grade.level : false;
        })
        : subjects;

    const handleCreate = async () => {
        if (!selectedGrade || !selectedSubject || !selectedTeacher) return;
        setSubmitting(true); setFeedback(null);
        try {
            const res = await apiPost("/education/teacher-assignments", {
                gradeId: selectedGrade, subjectId: selectedSubject, teacherId: selectedTeacher
            });
            if (res.ok) {
                setFeedback({ type: "success", message: "Öğretmen başarıyla atandı!" });
                setDialogOpen(false);
                setSelectedGrade(""); setSelectedSubject(""); setSelectedTeacher("");
                fetchAll();
            } else {
                const data = await res.json().catch(() => ({}));
                setFeedback({ type: "error", message: data.message || "Atama başarısız." });
            }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        if (!deleteItem) return;
        setSubmitting(true);
        try {
            const res = await apiDelete(`/education/teacher-assignments/${deleteItem._id}`);
            if (res.ok) { setFeedback({ type: "success", message: "Atama silindi!" }); setDeleteDialogOpen(false); fetchAll(); }
            else { setFeedback({ type: "error", message: "Silme başarısız." }); }
        } catch { setFeedback({ type: "error", message: "Bir hata oluştu." }); }
        finally { setSubmitting(false); }
    };

    const selectClass = "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring";

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader title="Öğretmen Atamaları" description="Öğretmenleri sınıf ve derse atayın.">
                <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Yeni Atama
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
            ) : assignments.length === 0 ? (
                <EmptyState icon={UserCheck} title="Henüz atama yapılmamış" description="Öğretmenleri sınıf ve derslere atamak için 'Yeni Atama' butonunu kullanın." />
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Öğretmen</TableHead>
                            <TableHead>E-posta</TableHead>
                            <TableHead>Sınıf</TableHead>
                            <TableHead>Ders</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {assignments.map((a) => (
                            <TableRow key={a._id}>
                                <TableCell className="font-semibold">{a.teacherId?.firstName} {a.teacherId?.lastName}</TableCell>
                                <TableCell className="text-muted-foreground">{a.teacherId?.email}</TableCell>
                                <TableCell>
                                    <Badge variant="info">{a.gradeId?.level}. Sınıf</Badge>
                                </TableCell>
                                <TableCell>{a.subjectId?.name}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setDeleteItem(a); setDeleteDialogOpen(true); }}>
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
                        <DialogTitle>Yeni Öğretmen Ataması</DialogTitle>
                        <DialogDescription>Bir öğretmeni sınıf ve derse atayın.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Sınıf</label>
                            <select className={selectClass} value={selectedGrade} onChange={(e) => { setSelectedGrade(e.target.value); setSelectedSubject(""); }}>
                                <option value="">Sınıf Seçin</option>
                                {grades.map(g => <option key={g._id} value={g._id}>{g.level}. Sınıf</option>)}
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Ders</label>
                            <select className={selectClass} value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} disabled={!selectedGrade}>
                                <option value="">Ders Seçin</option>
                                {filteredSubjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Öğretmen</label>
                            <select className={selectClass} value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)}>
                                <option value="">Öğretmen Seçin</option>
                                {teachers.map(t => <option key={t._id} value={t._id}>{t.firstName} {t.lastName} ({t.email})</option>)}
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
                        <Button onClick={handleCreate} disabled={submitting || !selectedGrade || !selectedSubject || !selectedTeacher}>
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Ata
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Atama Sil</DialogTitle>
                        <DialogDescription>Bu atama geri alınamaz şekilde silinecek. Emin misiniz?</DialogDescription>
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
