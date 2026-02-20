"use client";

import { useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
    Users,
    MonitorPlay,
    CheckCircle,
    CalendarDays,
    Clock,
    Video,
} from "lucide-react";
import Link from "next/link";

export default function TeacherDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const userStr = localStorage.getItem("user");
                if (userStr) setUser(JSON.parse(userStr));

                const token = localStorage.getItem("token");
                const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/statistics/teacher", {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.ok) {
                    const data = await res.json();
                    setStats({
                        total_students: data.myStudents || 0,
                        total_classes: data.myAssignedClasses || 0,
                        pending_assignments: data.myAssignments || 0,
                        weekly_lessons: data.myLiveClasses || 0,
                        today_lessons: [],
                    });
                }
            } catch (error) {
                console.error("Error fetching teacher stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const statCards = [
        {
            title: "Toplam Öğrenci",
            value: stats?.total_students || 0,
            icon: Users,
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
        },
        {
            title: "Aktif Sınıf",
            value: stats?.total_classes || 0,
            icon: MonitorPlay,
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
        },
        {
            title: "Bekleyen Ödev",
            value: stats?.pending_assignments || 0,
            icon: CheckCircle,
            iconBg: "bg-amber-50",
            iconColor: "text-amber-600",
        },
        {
            title: "Haftalık Ders",
            value: stats?.weekly_lessons || 0,
            icon: CalendarDays,
            iconBg: "bg-violet-50",
            iconColor: "text-violet-600",
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <PageHeader
                title="Öğretmen Dashboard"
                description={user ? `Hoş geldin, ${user.firstName} ${user.lastName}!` : "Yükleniyor..."}
            >
                <Link href="/teacher/classes">
                    <Button variant="outline" size="sm">
                        <MonitorPlay className="h-4 w-4" />
                        Sınıflarım
                    </Button>
                </Link>
                <Link href="/teacher/assignments">
                    <Button size="sm">
                        <CheckCircle className="h-4 w-4" />
                        Ödevler
                    </Button>
                </Link>
            </PageHeader>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat) => (
                    <StatCard key={stat.title} loading={loading} {...stat} />
                ))}
            </div>

            {/* Today's Lessons */}
            <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <MonitorPlay className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                            <CardTitle>Bugünün Dersleri</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">Planlanmış ders programınız</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-3">
                            <div className="skeleton h-16 rounded-xl" />
                            <div className="skeleton h-16 rounded-xl" />
                        </div>
                    ) : (!stats?.today_lessons || stats.today_lessons.length === 0) ? (
                        <EmptyState
                            icon={CalendarDays}
                            title="Bugün planlanmış ders yok"
                            description="Yeni ders planlamak için canlı dersler sayfasını ziyaret edin."
                            action={{ label: "Canlı Dersler", onClick: () => window.location.href = "/teacher/live-classes" }}
                        />
                    ) : (
                        <div className="space-y-3">
                            {stats.today_lessons.map((lesson: any, i: number) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border/40"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="text-center px-3 py-1 border-r border-border/40">
                                            <Clock className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                                            <span className="text-xs font-semibold">{lesson.startTime}</span>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold">{lesson.subject}</h4>
                                            <p className="text-xs text-muted-foreground">{lesson.className} - {lesson.topic}</p>
                                        </div>
                                    </div>
                                    <Button size="sm">
                                        <Video className="h-3.5 w-3.5" />
                                        Derse Katıl
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
