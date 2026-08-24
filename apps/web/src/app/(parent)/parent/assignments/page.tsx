"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StudentSwitcher } from "@/components/parent/student-switcher";
import { useParentData, formatDate, type ParentAssignment } from "@/lib/parent-data";
import { FileText, Users, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

type Status = { label: string; variant: "success" | "warning" | "destructive" | "secondary"; icon: any };

function statusOf(a: ParentAssignment): Status {
    if (a.submitted && a.isLate) return { label: "Geç teslim", variant: "warning", icon: Clock };
    if (a.submitted) return { label: "Teslim edildi", variant: "success", icon: CheckCircle2 };
    if (a.isExpired) return { label: "Teslim edilmedi", variant: "destructive", icon: AlertTriangle };
    return { label: "Bekliyor", variant: "secondary", icon: Clock };
}

export default function ParentAssignmentsPage() {
    const { students, active, activeId, setActiveId, loading, error } = useParentData();

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader
                title="Ödev Takibi"
                description="Çocuğunuzun ödevleri, teslim durumu ve öğretmen notları."
            />

            {error && (
                <div className="px-4 py-3 rounded-xl text-sm bg-rose-50 text-rose-700 border border-rose-200">{error}</div>
            )}

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
                </div>
            ) : !active ? (
                <EmptyState
                    icon={Users}
                    title="Henüz bağlı öğrenci yok"
                    description="Yöneticinizle iletişime geçerek çocuğunuzun kaydını veli hesabınıza bağlatabilirsiniz."
                />
            ) : (
                <>
                    <StudentSwitcher students={students} activeId={activeId} onSelect={setActiveId} />

                    {active.assignments.length === 0 ? (
                        <EmptyState
                            icon={FileText}
                            title="Henüz ödev atanmamış"
                            description="Öğretmenler bu sınıfa ödev atadığında burada görünecek."
                        />
                    ) : (
                        <div className="space-y-3">
                            {active.assignments.map((a) => {
                                const st = statusOf(a);
                                const StatusIcon = st.icon;
                                return (
                                    <Card key={a._id} className="hover:shadow-md transition-shadow">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <CardTitle className="text-base leading-snug">{a.title}</CardTitle>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {a.subject || "Ders belirtilmemiş"} · Son teslim: {formatDate(a.dueDate)}
                                                    </p>
                                                </div>
                                                <Badge variant={st.variant} className="shrink-0">
                                                    <StatusIcon className="h-3 w-3" />
                                                    {st.label}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-0 space-y-3">
                                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
                                                {a.submitted && (
                                                    <span className="text-muted-foreground">
                                                        Teslim: <span className="text-foreground">{formatDate(a.submittedAt)}</span>
                                                    </span>
                                                )}
                                                {typeof a.grade === "number" ? (
                                                    <span className="text-muted-foreground">
                                                        Not:{" "}
                                                        <span className="font-semibold text-foreground">
                                                            {a.grade}
                                                            {a.maxScore ? ` / ${a.maxScore}` : ""}
                                                        </span>
                                                    </span>
                                                ) : a.submitted ? (
                                                    <span className="text-muted-foreground">Not: henüz verilmedi</span>
                                                ) : null}
                                                {a.opticResult && (
                                                    <span className="text-muted-foreground">
                                                        Optik:{" "}
                                                        <span className="text-emerald-600 font-medium">{a.opticResult.correct}D</span>{" "}
                                                        <span className="text-rose-600 font-medium">{a.opticResult.incorrect}Y</span>{" "}
                                                        <span className="text-slate-500 font-medium">{a.opticResult.empty}B</span>
                                                    </span>
                                                )}
                                            </div>

                                            {a.feedback && (
                                                <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                                                    <p className="text-xs font-semibold text-muted-foreground mb-1">Öğretmen notu</p>
                                                    <p className="text-sm">{a.feedback}</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
