"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { GraduationCap, Clock, CheckCircle, XCircle, PlayCircle, ClipboardList, BookOpen, Award, BarChart2 } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useRouter } from "next/navigation";

interface SubmissionItem {
    _id: string;
    assignmentId: { _id: string; title: string; gradeLevel: number; maxScore: number } | null;
    note: string;
    grade: number | null;
    feedback: string;
    submittedAt: string;
}

interface TestItem {
    _id: string;
    title: string;
    description: string;
    gradeLevel: number;
    subjectId: { _id: string; name: string };
    teacherId: { _id: string; firstName: string; lastName: string };
    duration: number;
    questionIds: string[];
    solved: boolean;
    score: number | null;
    correctCount: number | null;
    wrongCount: number | null;
    emptyCount: number | null;
    durationSeconds: number | null;
}

export default function StudentExamsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"homework" | "exams">("exams");
    const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
    const [tests, setTests] = useState<TestItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [subRes, testRes] = await Promise.all([
                    apiGet("/education/submissions/mine"),
                    apiGet("/education/tests/student/available")
                ]);
                
                if (subRes.ok) setSubmissions(await subRes.json());
                if (testRes.ok) setTests(await testRes.json());
            } catch (e) {
                console.error("Data fetch error", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const formatDuration = (seconds: number | null) => {
        if (!seconds) return "0 dk";
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins} dk ${secs} sn` : `${secs} sn`;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader title="Sınavlarım & Sonuçlarım" description="Online deneme sınavlarını çözebilir, geçmiş sınav ve ödev analizlerinize erişebilirsiniz." />

            {/* Premium Tab Switcher */}
            <div className="flex border-b border-border gap-6">
                <button
                    onClick={() => setActiveTab("exams")}
                    className={`pb-3 text-sm font-semibold transition-all relative ${
                        activeTab === "exams"
                            ? "text-primary border-b-2 border-primary"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" />
                        Deneme Sınavları / Testler
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab("homework")}
                    className={`pb-3 text-sm font-semibold transition-all relative ${
                        activeTab === "homework"
                            ? "text-primary border-b-2 border-primary"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Ödev Sonuçlarım
                    </div>
                </button>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
                </div>
            ) : activeTab === "exams" ? (
                tests.length === 0 ? (
                    <EmptyState icon={BookOpen} title="Aktif sınav bulunmuyor" description="Sınıf seviyenize atanmış aktif bir deneme sınavı veya test bulunmamaktadır." />
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {tests.map((test) => (
                            <Card key={test._id} className="hover:shadow-md transition-all flex flex-col justify-between">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <Badge variant="secondary">{test.subjectId?.name || "Ders"}</Badge>
                                        <Badge variant="info">{test.gradeLevel}. Sınıf</Badge>
                                    </div>
                                    <CardTitle className="text-base mt-2 line-clamp-1" title={test.title}>{test.title}</CardTitle>
                                    <CardDescription className="line-clamp-2 text-xs mt-1">{test.description || "Açıklama belirtilmemiş."}</CardDescription>
                                </CardHeader>
                                <CardContent className="pb-3 text-xs space-y-2 text-muted-foreground flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <BookOpen className="h-3.5 w-3.5" />
                                        <span>{test.questionIds?.length || 0} Soru</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span>{test.duration > 0 ? `${test.duration} Dakika` : "Süresiz"}</span>
                                    </div>
                                    {test.solved && test.score !== null && (
                                        <div className="pt-2 border-t mt-2 space-y-1.5 text-foreground font-medium">
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground font-normal">Başarı Puanı:</span>
                                                <Badge variant={test.score >= 70 ? "success" : test.score >= 40 ? "warning" : "destructive"}>
                                                    %{test.score}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-normal">
                                                <span>Doğru: {test.correctCount}</span>
                                                <span>Yanlış: {test.wrongCount}</span>
                                                <span>Boş: {test.emptyCount}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-normal pt-0.5">
                                                <span>Süre: {formatDuration(test.durationSeconds)}</span>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="border-t pt-4">
                                    {test.solved ? (
                                        <Button
                                            className="w-full"
                                            variant="outline"
                                            onClick={() => router.push(`/student/exams/${test._id}/result`)}
                                        >
                                            <BarChart2 className="h-4 w-4 mr-2" /> Analizi İncele
                                        </Button>
                                    ) : (
                                        <Button
                                            className="w-full bg-primary text-white hover:bg-primary/95"
                                            onClick={() => router.push(`/student/exams/${test._id}`)}
                                        >
                                            <PlayCircle className="h-4 w-4 mr-2" /> Sınavı Başlat
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )
            ) : submissions.length === 0 ? (
                <EmptyState icon={Clock} title="Henüz sonuç yok" description="Ödevlerinizi teslim edip öğretmeniniz notlandırdığında sonuçlar burada görünecektir." />
            ) : (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <GraduationCap className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle>Ödev Notları</CardTitle>
                                <CardDescription>Teslim ettiğiniz ödevlerin puanları ve öğretmen geri bildirimleri.</CardDescription>
                            </div>
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
