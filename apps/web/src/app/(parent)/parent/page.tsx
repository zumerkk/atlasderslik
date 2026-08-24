"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StudentSwitcher } from "@/components/parent/student-switcher";
import { useParentData, formatDate } from "@/lib/parent-data";
import {
    BookOpen,
    User,
    Video,
    ExternalLink,
    Users,
    FileText,
    GraduationCap,
    ArrowRight,
    CheckCircle2,
    Clock,
    AlertTriangle,
} from "lucide-react";

export default function ParentDashboard() {
    const { students, active, activeId, setActiveId, loading, error } = useParentData();
    const [parentUser, setParentUser] = useState<any>(null);

    useEffect(() => {
        try {
            const u = localStorage.getItem("user");
            if (u) setParentUser(JSON.parse(u));
        } catch { }
    }, []);

    const s = active?.summary;
    const recent = (active?.assignments ?? []).slice(0, 5);

    // Deduplicate courses by subject — a class can have several teacher rows.
    const uniqueCourses = (() => {
        const map = new Map<string, { subject: any; teachers: any[] }>();
        (active?.courses ?? []).forEach((c: any) => {
            const id = c.subjectId?._id;
            if (!id) return;
            if (!map.has(id)) map.set(id, { subject: c.subjectId, teachers: [] });
            const entry = map.get(id)!;
            if (c.teacherId && !entry.teachers.find((t: any) => t.email === c.teacherId.email)) {
                entry.teachers.push(c.teacherId);
            }
        });
        return Array.from(map.values());
    })();

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader
                title={parentUser ? `Hoş geldiniz, ${parentUser.firstName}` : "Hoş geldiniz"}
                description="Veli Paneli — Çocuklarınızın eğitim durumunu takip edin."
            />

            {error && (
                <div className="px-4 py-3 rounded-xl text-sm bg-rose-50 text-rose-700 border border-rose-200">{error}</div>
            )}

            {loading ? (
                <div className="space-y-6">
                    {[1, 2].map((i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
                </div>
            ) : !active ? (
                <EmptyState
                    icon={Users}
                    title="Henüz bağlı öğrenci yok"
                    description="Yöneticinizle iletişime geçerek çocuğunuzun kaydını veli hesabınıza bağlatabilirsiniz."
                />
            ) : (
                <div className="space-y-6">
                    <StudentSwitcher students={students} activeId={activeId} onSelect={setActiveId} />

                    {/* Summary */}
                    {s && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <StatCard
                                icon={CheckCircle2}
                                label="Teslim edilen ödev"
                                value={`${s.submitted} / ${s.totalAssignments}`}
                                tone="text-emerald-600"
                                bg="bg-emerald-50 dark:bg-emerald-950/30"
                            />
                            <StatCard
                                icon={Clock}
                                label="Bekleyen ödev"
                                value={s.pending}
                                tone="text-amber-600"
                                bg="bg-amber-50 dark:bg-amber-950/30"
                            />
                            <StatCard
                                icon={AlertTriangle}
                                label="Teslim edilmeyen"
                                value={s.missed}
                                tone="text-rose-600"
                                bg="bg-rose-50 dark:bg-rose-950/30"
                            />
                            <StatCard
                                icon={GraduationCap}
                                label={s.netAverage !== null ? "Net ortalaması" : "Sınav sayısı"}
                                value={s.netAverage !== null ? s.netAverage : s.examCount}
                                tone="text-indigo-600"
                                bg="bg-indigo-50 dark:bg-indigo-950/30"
                            />
                        </div>
                    )}

                    {/* Recent assignments */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                                        <FileText className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Son Ödevler</CardTitle>
                                        <p className="text-xs text-muted-foreground mt-0.5">En güncel beş ödev</p>
                                    </div>
                                </div>
                                <Link href="/parent/assignments">
                                    <Button variant="outline" size="sm">
                                        Tümü <ArrowRight className="h-3.5 w-3.5" />
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {recent.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-4 text-center">Bu sınıfa henüz ödev atanmamış.</p>
                            ) : (
                                <div className="space-y-2">
                                    {recent.map((a) => (
                                        <div
                                            key={a._id}
                                            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border border-border/40"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{a.title}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {a.subject || "Ders yok"} · {formatDate(a.dueDate)}
                                                </p>
                                            </div>
                                            {a.submitted ? (
                                                <Badge variant={a.isLate ? "warning" : "success"} className="shrink-0">
                                                    {a.isLate ? "Geç teslim" : "Teslim edildi"}
                                                </Badge>
                                            ) : a.isExpired ? (
                                                <Badge variant="destructive" className="shrink-0">Teslim edilmedi</Badge>
                                            ) : (
                                                <Badge variant="secondary" className="shrink-0">Bekliyor</Badge>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Courses */}
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Dersler ve Öğretmenler</h3>
                        {uniqueCourses.length === 0 ? (
                            <Card>
                                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                                    Bu öğrenciye henüz ders atanmamış.
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {uniqueCourses.map((course) => (
                                    <Card key={course.subject._id} className="flex flex-col hover:shadow-md transition-shadow">
                                        <CardHeader className="pb-3">
                                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                                <BookOpen className="h-4 w-4 text-primary" />
                                            </div>
                                            <CardTitle className="text-base mt-2">{course.subject.name}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex-1 space-y-2">
                                            {course.teachers.map((t: any, idx: number) => (
                                                <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <User className="h-3.5 w-3.5" />
                                                    <span>{t.firstName} {t.lastName}</span>
                                                </div>
                                            ))}
                                            {course.subject.zoomMeetingId && (
                                                <div className="mt-2 p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-xs space-y-1">
                                                    <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-medium">
                                                        <Video className="h-3 w-3" /> Zoom
                                                    </div>
                                                    <div className="text-blue-600 dark:text-blue-400">ID: {course.subject.zoomMeetingId}</div>
                                                    {course.subject.zoomPasscode && (
                                                        <div className="text-blue-600 dark:text-blue-400">Şifre: {course.subject.zoomPasscode}</div>
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                        <CardFooter className="border-t pt-3">
                                            {course.subject.zoomUrl ? (
                                                <Button size="sm" className="w-full" asChild>
                                                    <a href={course.subject.zoomUrl} target="_blank" rel="noopener noreferrer">
                                                        <Video className="h-3.5 w-3.5" /> Derse Git
                                                        <ExternalLink className="h-3 w-3 ml-1" />
                                                    </a>
                                                </Button>
                                            ) : (
                                                <Button size="sm" variant="outline" className="w-full" disabled>
                                                    Link Eklenmemiş
                                                </Button>
                                            )}
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon: Icon, label, value, tone, bg }: {
    icon: any; label: string; value: number | string; tone: string; bg: string;
}) {
    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-2.5`}>
                    <Icon className={`h-4.5 w-4.5 ${tone}`} />
                </div>
                <div className={`text-2xl font-bold ${tone}`}>{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </CardContent>
        </Card>
    );
}
