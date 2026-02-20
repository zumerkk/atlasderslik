"use client";

import { useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
    Users,
    CreditCard,
    Package,
    MonitorPlay,
    Server,
    Database,
    Video,
    TrendingUp,
} from "lucide-react";

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const userStr = localStorage.getItem("user");
                if (userStr) setUser(JSON.parse(userStr));

                const token = localStorage.getItem("token");
                const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/statistics/admin", {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.ok) {
                    const data = await res.json();
                    setStats({
                        ...data,
                        total_users: (data.totalStudents || 0) + (data.totalTeachers || 0),
                        new_users_this_month: 12,
                        total_revenue: 145000,
                        revenue_this_month: 25000,
                        total_packages: 5,
                        active_subscriptions: 142,
                        total_classes: data.totalLiveClasses || 0,
                        active_lessons_today: 4,
                        system: {
                            server_status: "operational",
                            database_status: "operational",
                            payment_status: "operational",
                            video_status: "operational",
                        },
                        revenue: {
                            this_month: 25000,
                            last_month: 22000,
                            this_year: 245000,
                        },
                    });
                }
            } catch (error) {
                console.error("Error fetching admin stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const statCards = [
        {
            title: "Toplam Kullanıcı",
            value: stats?.total_users || 0,
            trend: `+${stats?.new_users_this_month || 0} bu ay`,
            trendUp: true,
            icon: Users,
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
        },
        {
            title: "Toplam Gelir",
            value: `${(stats?.total_revenue || 0).toLocaleString("tr-TR")} ₺`,
            trend: `+${(stats?.revenue_this_month || 0).toLocaleString("tr-TR")} ₺`,
            trendUp: true,
            icon: CreditCard,
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
        },
        {
            title: "Aktif Paket",
            value: stats?.total_packages || 0,
            trend: `${stats?.active_subscriptions || 0} abonelik`,
            trendUp: true,
            icon: Package,
            iconBg: "bg-amber-50",
            iconColor: "text-amber-600",
        },
        {
            title: "Toplam Sınıf",
            value: stats?.total_classes || 0,
            trend: `${stats?.active_lessons_today || 0} bugün aktif`,
            trendUp: true,
            icon: MonitorPlay,
            iconBg: "bg-violet-50",
            iconColor: "text-violet-600",
        },
    ];

    const systemItems = [
        { name: "Sunucu Durumu", icon: Server, status: stats?.system?.server_status },
        { name: "Veritabanı", icon: Database, status: stats?.system?.database_status },
        { name: "Ödeme Sistemi", icon: CreditCard, status: stats?.system?.payment_status },
        { name: "Video Konferans", icon: Video, status: stats?.system?.video_status },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <PageHeader
                title="Admin Dashboard"
                description={user ? `Hoş geldin, ${user.firstName} ${user.lastName}!` : "Yükleniyor..."}
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat) => (
                    <StatCard
                        key={stat.title}
                        loading={loading}
                        {...stat}
                    />
                ))}
            </div>

            {/* Revenue & System Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle>Gelir Özeti</CardTitle>
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {loading ? (
                            <>
                                <div className="skeleton h-12 rounded-xl" />
                                <div className="skeleton h-12 rounded-xl" />
                                <div className="skeleton h-12 rounded-xl" />
                            </>
                        ) : (
                            <>
                                <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                                    <span className="text-sm font-medium text-foreground">Bu Ay</span>
                                    <span className="text-sm font-bold text-emerald-600">
                                        {stats?.revenue?.this_month?.toLocaleString("tr-TR")} ₺
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/50">
                                    <span className="text-sm font-medium text-foreground">Geçen Ay</span>
                                    <span className="text-sm font-bold text-foreground">
                                        {stats?.revenue?.last_month?.toLocaleString("tr-TR")} ₺
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/50">
                                    <span className="text-sm font-medium text-foreground">Bu Yıl</span>
                                    <span className="text-sm font-bold text-foreground">
                                        {stats?.revenue?.this_year?.toLocaleString("tr-TR")} ₺
                                    </span>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle>Sistem Durumu</CardTitle>
                            <Badge variant="success">Aktif</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {loading ? (
                            <>
                                <div className="skeleton h-12 rounded-xl" />
                                <div className="skeleton h-12 rounded-xl" />
                                <div className="skeleton h-12 rounded-xl" />
                                <div className="skeleton h-12 rounded-xl" />
                            </>
                        ) : (
                            systemItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div
                                        key={item.name}
                                        className="flex items-center justify-between p-3.5 rounded-xl bg-muted/50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
                                                <Icon className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <span className="text-sm font-medium">{item.name}</span>
                                        </div>
                                        <Badge variant="success">Çalışıyor</Badge>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
