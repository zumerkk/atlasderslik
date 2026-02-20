"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { GraduationCap, Clock, CheckCircle, XCircle } from "lucide-react";

interface SubmissionItem { _id: string; assignmentId: { _id: string; title: string; gradeLevel: number; maxScore: number } | null; note: string; grade: number | null; feedback: string; submittedAt: string; }

export default function StudentExamsPage() {
    const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSubmissions = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/education/submissions/mine", { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) setSubmissions(await res.json());
            } catch (e) { console.error("Submissions fetch error", e); }
            finally { setLoading(false); }
        };
        fetchSubmissions();
    }, []);

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader title="Sınavlarım" description="Online sınav ve ödev sonuçlarınız." />

            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
            ) : submissions.length === 0 ? (
                <EmptyState icon={Clock} title="Henüz sonuç yok" description="Ödevinizi teslim ettiğinizde sonuçlarınız burada görünecektir." />
            ) : (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><GraduationCap className="h-5 w-5 text-primary" /></div>
                            <div><CardTitle>Sonuçlar</CardTitle><CardDescription>Teslim ettiğiniz ödev ve sınav notlarınız.</CardDescription></div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {submissions.map((sub) => {
                                const hasGrade = sub.grade !== null && sub.grade !== undefined;
                                const percentage = hasGrade && sub.assignmentId?.maxScore ? Math.round((sub.grade! / sub.assignmentId.maxScore) * 100) : null;
                                const isGood = percentage !== null && percentage >= 70;
                                return (
                                    <div key={sub._id} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:shadow-sm transition-shadow">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm truncate">{sub.assignmentId?.title || "Bilinmeyen Ödev"}</p>
                                            <p className="text-xs text-muted-foreground mt-1">Teslim: {new Date(sub.submittedAt).toLocaleDateString("tr-TR")}</p>
                                            {sub.feedback && <p className="text-xs text-muted-foreground mt-1 italic">&ldquo;{sub.feedback}&rdquo;</p>}
                                        </div>
                                        <div className="flex items-center gap-3 ml-4">
                                            {hasGrade ? (
                                                <>
                                                    <Badge variant={isGood ? "success" : "warning"}>{sub.grade}/{sub.assignmentId?.maxScore || 100}</Badge>
                                                    {isGood ? <CheckCircle className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-amber-500" />}
                                                </>
                                            ) : (
                                                <Badge variant="outline">Beklemede</Badge>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
