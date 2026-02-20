"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
    BookOpen,
    FileText,
    CalendarDays,
    ArrowRight,
    Video,
    PlayCircle,
} from "lucide-react";
import Link from "next/link";

export default function StudentDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const userStr = localStorage.getItem("user");
                if (userStr) setUser(JSON.parse(userStr));

                const token = localStorage.getItem("token");
                const headers = { Authorization: `Bearer ${token}` };

                const res = await fetch(
                    process.env.NEXT_PUBLIC_API_URL + "/education/student/dashboard",
                    { headers }
                );

                if (res.ok) {
                    setData(await res.json());
                }
            } catch (error) {
                console.error("Dashboard data load error", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    // Derived stats
    const gradeLevel = data?.gradeLevel;
    const courseCount = data?.courses
        ? [...new Set(data.courses.map((c: any) => c.subjectId?._id))].length
        : 0;
    const submittedIds = new Set((data?.submissions || []).map((s: any) => s.assignmentId?._id?.toString()));
    const pendingAssignments = (data?.assignments || []).filter(
        (a: any) => !submittedIds.has(a._id.toString())
    );
    const upcomingClasses = (data?.liveClasses || []).filter(
        (lc: any) => new Date(lc.startTime) >= new Date()
    );
    const videoCount = data?.videos?.length || 0;

    const statCards = [
        {
            title: "Sınıf",
            value: gradeLevel ? `${gradeLevel}. Sınıf` : "—",
            icon: BookOpen,
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
        },
        {
            title: "Ders Sayısı",
            value: courseCount,
            icon: BookOpen,
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
        },
        {
            title: "Bekleyen Ödev",
            value: pendingAssignments.length,
            icon: FileText,
            iconBg: "bg-amber-50",
            iconColor: "text-amber-600",
        },
        {
            title: "Canlı Ders",
            value: upcomingClasses.length,
            icon: Video,
            iconBg: "bg-violet-50",
            iconColor: "text-violet-600",
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <PageHeader
                title="Öğrenci Dashboard"
                description={user ? `Hoş geldin, ${user.firstName} ${user.lastName}!` : "Yükleniyor..."}
            >
                <Link href="/student/assignments">
                    <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4" />
                        Ödevlerim
                    </Button>
                </Link>
                <Link href="/student/courses">
                    <Button size="sm">
                        <BookOpen className="h-4 w-4" />
                        Derslerim
                    </Button>
                </Link>
            </PageHeader>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat) => (
                    <StatCard key={stat.title} loading={loading} {...stat} />
                ))}
            </div>

            {/* Pending Assignments */}
            <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                <FileText className="h-4 w-4 text-amber-600" />
                            </div>
                            <div>
                                <CardTitle>Bekleyen Ödevler</CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">Teslim etmeniz gereken ödevler</p>
                            </div>
                        </div>
                        {pendingAssignments.length > 0 && (
                            <Badge variant="warning">{pendingAssignments.length} bekleyen</Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-3">
                            <div className="skeleton h-20 rounded-xl" />
                            <div className="skeleton h-20 rounded-xl" />
                        </div>
                    ) : pendingAssignments.length === 0 ? (
                        <EmptyState
                            icon={FileText}
                            title="Bekleyen ödeviniz yok 🎉"
                            description="Tüm ödevlerinizi teslim etmişsiniz."
                        />
                    ) : (
                        <div className="space-y-3">
                            {pendingAssignments.slice(0, 5).map((assignment: any) => (
                                <div
                                    key={assignment._id}
                                    className="p-4 rounded-xl bg-muted/40 border border-border/40 hover:shadow-sm transition-all duration-200"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h4 className="text-sm font-semibold">
                                                {assignment.title}
                                            </h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {assignment.subjectId?.name || "Genel"} · {assignment.teacherId?.firstName} {assignment.teacherId?.lastName}
                                            </p>
                                        </div>
                                        <Badge variant="warning">Bekliyor</Badge>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <CalendarDays className="h-3.5 w-3.5" />
                                        <span>
                                            Son:{" "}
                                            {assignment.dueDate
                                                ? format(new Date(assignment.dueDate), "d MMMM yyyy", { locale: tr })
                                                : "-"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                <Video className="h-4 w-4 text-emerald-600" />
                            </div>
                            <CardTitle>Yaklaşan Canlı Dersler</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-6">
                            <p className="text-3xl font-bold text-emerald-600">{upcomingClasses.length}</p>
                            <p className="text-xs text-muted-foreground mt-1">planlanmış canlı ders</p>
                            <Link href="/student/live-classes">
                                <Button variant="outline" size="sm" className="mt-4">
                                    Derslere Git
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                <PlayCircle className="h-4 w-4 text-blue-600" />
                            </div>
                            <CardTitle>Video İçerikler</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-6">
                            <p className="text-3xl font-bold text-blue-600">{videoCount}</p>
                            <p className="text-xs text-muted-foreground mt-1">izleyebileceğiniz video</p>
                            <Link href="/student/videos">
                                <Button variant="outline" size="sm" className="mt-4">
                                    Videolara Git
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
