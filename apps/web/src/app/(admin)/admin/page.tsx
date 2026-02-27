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
    RefreshCw,
    WifiOff,
} from "lucide-react";
import { apiGet } from "@/lib/api";

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [user, setUser] = useState<any>(null);

    const fetchStats = async () => {
        setLoading(true);
        setError(false);
        try {
            const userStr = localStorage.getItem("user");
            if (userStr) setUser(JSON.parse(userStr));

            const res = await apiGet("/statistics/admin");

            if (res.ok) {
                const data = await res.json();
                setStats({
                    ...data,
                    total_users: (data.totalStudents || 0) + (data.totalTeachers || 0),
                    new_users_this_month: data.newUsersThisMonth || 0,
                    total_revenue: data.totalRevenue || 0,
                    revenue_this_month: data.revenue?.this_month || 0,
                    total_packages: data.totalPackages || 0,
                    active_subscriptions: data.activeSubscriptions || 0,
                    total_classes: data.totalLiveClasses || 0,
                    active_lessons_today: 0,
                    system: {
                        server_status: "operational",
                        database_status: "operational",
                        payment_status: "operational",
                        video_status: "operational",
                    },
                    revenue: data.revenue || { this_month: 0, last_month: 0, this_year: 0 },
                });
            } else {
                setError(true);
            }
        } catch (err) {
            console.error("Error fetching admin stats:", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStats(); }, []);

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

            {/* Connection Error Fallback */}
            {error && !loading && (
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
                        <WifiOff className="h-8 w-8 text-amber-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Sunucu Bağlantısı Bekleniyor</h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-sm">Sunucu hazırlanıyor, lütfen birkaç saniye bekleyin veya tekrar deneyin.</p>
                    </div>
                    <button
                        onClick={fetchStats}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" /> Tekrar Dene
                    </button>
                </div>
            )}

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
