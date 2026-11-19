"use client";

import { useEffect, useState } from "react";
import { Users, CreditCard, Package, MonitorPlay, Server, Database, Video, TrendingUp, RefreshCw, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { currentCommerceAccount, useCommerceAccount } from "@/components/commerce/use-commerce-account";
import { apiGet } from "@/lib/api";
import { commerceJson, money } from "@/lib/commerce";

interface AdminStats {
    totalUsers?: number; totalStudents: number; totalTeachers: number; totalLiveClasses: number;
    totalPackages: number; activeSubscriptions: number; newUsersThisMonth: number; totalRevenue: number;
    revenue: { this_month: number; last_month: number; this_year: number };
}
interface Health { status: "ok" | "degraded"; database: "connected" | "connecting" | "disconnected" }
interface Readiness { mode: "live" | "sandbox" | "unconfigured"; canAcceptPayments: boolean; message: string }
interface AiBudget {
    state: "disabled" | "expired" | "exhausted" | "active" | "not-started";
    limitUsd: number;
    accountedUsd: number;
    remainingUsd: number;
    endsAt: string | null;
    providerConfigured: boolean;
}
interface DashboardData { key: string; stats?: AdminStats; health?: Health; payment?: Readiness; budget?: AiBudget; errors: { stats?: string; health?: string; payment?: string; budget?: string }; checkedAt: string }

const budgetLabels: Record<AiBudget["state"], string> = {
    disabled: "Duraklatıldı", expired: "30 günlük süre doldu", exhausted: "Bütçe doldu", active: "Kullanım açık", "not-started": "İlk kullanım bekleniyor",
};
const usd = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "USD", currencyDisplay: "code" });

function verifiedBudget(value: AiBudget): AiBudget {
    if (!value || !Object.hasOwn(budgetLabels, value.state) || typeof value.providerConfigured !== "boolean" ||
        ![value.limitUsd, value.accountedUsd, value.remainingUsd].every(amount => Number.isFinite(amount) && amount >= 0) ||
        (value.endsAt !== null && !Number.isFinite(Date.parse(value.endsAt)))) throw new Error("AtlasAI bütçe durumu doğrulanamadı.");
    return value;
}

function verifiedStats(data: AdminStats): AdminStats {
    const counts = [data?.totalStudents, data?.totalTeachers, data?.totalLiveClasses, data?.totalPackages, data?.activeSubscriptions, data?.newUsersThisMonth];
    if (!data || counts.some(value => !Number.isInteger(value) || value < 0) || (data.totalUsers !== undefined && (!Number.isInteger(data.totalUsers) || data.totalUsers < 0)) || [data.totalRevenue, data.revenue?.this_month, data.revenue?.last_month, data.revenue?.this_year].some(value => !Number.isFinite(value) || value < 0)) throw new Error("İstatistik yanıtı doğrulanamadı. Yenileyip tekrar deneyin.");
    return data;
}
const failure = (reason: unknown, fallback: string) => reason instanceof Error ? reason.message : fallback;

export default function AdminDashboard() {
    const { account, ready } = useCommerceAccount();
    const [revision, setRevision] = useState(0);
    const [result, setResult] = useState<DashboardData | null>(null);
    const key = JSON.stringify([account?.id, account?.token, revision]);
    const data = result?.key === key ? result : null;
    const stats = data?.stats;
    const loading = !ready || (!!account && !data);
    useEffect(() => {
        const controller = new AbortController();
        if (!account) return () => controller.abort();
        void (async () => {
            const [statistics, health, payment, budget] = await Promise.allSettled([
                apiGet("/statistics/admin", { signal: controller.signal, retries: 0 }).then(response => commerceJson<AdminStats>(response, "İstatistikler alınamadı.")).then(verifiedStats),
                apiGet("/health", { signal: controller.signal, retries: 0, skipAuth: true }).then(response => commerceJson<Health>(response, "Sunucu ve veritabanı durumu kontrol edilemedi.")).then(value => { if (!value || !["ok", "degraded"].includes(value.status) || !["connected", "connecting", "disconnected"].includes(value.database)) throw new Error("Sağlık kontrolü doğrulanamadı."); return value; }),
                apiGet("/payment/admin/readiness", { signal: controller.signal, retries: 0 }).then(response => commerceJson<Readiness>(response, "Ödeme hazırlığı kontrol edilemedi.")).then(value => { if (!value || typeof value.canAcceptPayments !== "boolean" || !["live", "sandbox", "unconfigured"].includes(value.mode)) throw new Error("Ödeme hazırlığı doğrulanamadı."); return value; }),
                apiGet("/atlas-ai/budget", { signal: controller.signal, retries: 0 }).then(response => commerceJson<AiBudget>(response, "AtlasAI bütçesi alınamadı.")).then(verifiedBudget),
            ]);
            if (controller.signal.aborted || !currentCommerceAccount(account)) return;
            setResult({ key, checkedAt: new Date().toISOString(), ...(statistics.status === "fulfilled" ? { stats: statistics.value } : {}), ...(health.status === "fulfilled" ? { health: health.value } : {}), ...(payment.status === "fulfilled" ? { payment: payment.value } : {}), ...(budget.status === "fulfilled" ? { budget: budget.value } : {}), errors: {
                ...(statistics.status === "rejected" ? { stats: failure(statistics.reason, "İstatistikler alınamadı.") } : {}),
                ...(health.status === "rejected" ? { health: failure(health.reason, "Sunucu durumu kontrol edilemedi.") } : {}),
                ...(payment.status === "rejected" ? { payment: failure(payment.reason, "Ödeme hazırlığı kontrol edilemedi.") } : {}),
                ...(budget.status === "rejected" ? { budget: failure(budget.reason, "AtlasAI bütçesi alınamadı.") } : {}),
            } });
        })();
        return () => controller.abort();
    }, [account, key]);
    const statCards = [
        { title: "Toplam Kullanıcı", value: stats?.totalUsers ?? "—", description: stats?.totalUsers !== undefined ? `${stats.totalStudents} öğrenci · ${stats.totalTeachers} öğretmen · tüm hesap rolleri dahil` : "Toplam kullanıcı sayısı doğrulanamadı.", icon: Users, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
        { title: "Toplam Gelir", value: stats ? money(stats.totalRevenue) : "—", description: "Yalnız doğrulanmış canlı tahsilatlar; test işlemleri hariç.", icon: CreditCard, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
        { title: "Aktif Paket", value: stats?.activeSubscriptions ?? "—", description: stats ? `${stats.totalPackages} katalog paketi · süresi geçerli canlı satın almalar` : "Aktif satın alma sayısı doğrulanamadı.", icon: Package, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
        { title: "Canlı Ders Kaydı", value: stats?.totalLiveClasses ?? "—", description: "Sistemdeki planlanmış ve geçmiş canlı ders kayıtları.", icon: MonitorPlay, iconBg: "bg-violet-50", iconColor: "text-violet-600" },
    ];
    const health = data?.health;
    const payment = data?.payment;
    const budget = data?.budget;
    const systemItems: { name: string; icon: typeof Server; label: string; variant: BadgeProps["variant"]; detail: string }[] = [
        { name: "Sunucu", icon: Server, label: health ? "Yanıt veriyor" : "Kontrol edilemedi", variant: health ? "success" : "warning", detail: health ? "API sağlık kontrolünden güncel yanıt alındı." : data?.errors.health || "Güncel sağlık kontrolü bulunmuyor." },
        { name: "Veritabanı", icon: Database, label: health?.database === "connected" ? "Bağlı" : health?.database === "connecting" ? "Bağlanıyor" : health?.database === "disconnected" ? "Bağlantı yok" : "Kontrol edilemedi", variant: health?.database === "connected" ? "success" : "warning", detail: health ? "Durum API'nin MongoDB bağlantısından okunur." : "Veritabanı bağlantısı doğrulanamadı." },
        { name: "Ödeme Sistemi", icon: CreditCard, label: !payment ? "Kontrol edilemedi" : !payment.canAcceptPayments ? "Kurulum bekleniyor" : payment.mode === "sandbox" ? "Test ortamı hazır" : "Canlı ortam yapılandırıldı", variant: payment?.canAcceptPayments && payment.mode === "live" ? "success" : "warning", detail: payment?.message || data?.errors.payment || "Ödeme hazırlığı doğrulanamadı." },
        { name: "AtlasAI Bütçesi", icon: Sparkles, label: !budget ? "Kontrol edilemedi" : !budget.providerConfigured ? "OpenAI bağlantısı bekleniyor" : budgetLabels[budget.state],
            variant: budget?.providerConfigured && budget.state === "active" ? "success" : "warning",
            detail: budget ? `Tahmini kullanım: ${usd.format(budget.accountedUsd)} / ${usd.format(budget.limitUsd)} · Kalan: ${usd.format(budget.remainingUsd)}.${budget.endsAt ? ` Bitiş: ${new Date(budget.endsAt).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}.` : ""}` : data?.errors.budget || "Güncel kullanım bilgisi bulunmuyor." },
        { name: "Video Konferans", icon: Video, label: "Bağlantı doğrulanmadı", variant: "secondary", detail: "Canlı ders bağlantıları kurum tarafından yönetilir. Sağlayıcı bağlantısına ilişkin güncel test sonucu bulunmuyor." },
    ];
    return <div className="space-y-6 animate-fade-in">
        <PageHeader title="Yönetim Paneli" description="Kurumun güncel kullanıcı, paket ve ödeme bilgileri."><Button variant="outline" disabled={loading} onClick={() => setRevision(value => value + 1)}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Yenile</Button></PageHeader>
        {!account && ready && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Yönetim verilerini görmek için hesabınıza yeniden giriş yapın.</p>}
        {data?.errors.stats && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex flex-wrap items-center justify-between gap-3"><p>{data.errors.stats} Sayılar ve gelir bilgileri sıfır kabul edilmedi.</p><Button variant="outline" size="sm" onClick={() => setRevision(value => value + 1)}>Yeniden dene</Button></div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{statCards.map(({ description, ...stat }) => <div key={stat.title} className="space-y-2"><StatCard {...stat} loading={loading} />{!loading && <p className="px-1 text-xs text-muted-foreground">{description}</p>}</div>)}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card><CardHeader><div className="flex items-center justify-between"><CardTitle>Gelir Özeti</CardTitle><TrendingUp className="h-5 w-5 text-emerald-600" /></div></CardHeader><CardContent className="space-y-3">{loading ? [1, 2, 3].map(item => <div className="skeleton h-12 rounded-xl" key={item} />) : !stats ? <p className="text-sm text-muted-foreground">Gelir bilgileri alınamadı. Yeniden denediğinizde güncel tahsilat kayıtları kontrol edilecek.</p> : <>{([["Bu ay", stats.revenue.this_month], ["Geçen ay", stats.revenue.last_month], ["Bu yıl", stats.revenue.this_year]] as const).map(([label, value]) => <div key={label} className="flex items-center justify-between rounded-xl bg-muted/50 p-3.5 text-sm"><span>{label}</span><strong>{money(value)}</strong></div>)}<p className="text-xs text-muted-foreground">Doğrulanmış canlı tahsilatlar, Türkiye takvimine göre hesaplanır.</p></>}</CardContent></Card>
            <Card><CardHeader><CardTitle>Sistem Durumu</CardTitle>{data?.checkedAt && <p className="text-xs text-muted-foreground">Son kontrol: {new Date(data.checkedAt).toLocaleTimeString("tr-TR", { timeZone: "Europe/Istanbul" })}</p>}</CardHeader><CardContent className="space-y-3">{loading ? [1, 2, 3, 4].map(item => <div className="skeleton h-16 rounded-xl" key={item} />) : systemItems.map(item => <div key={item.name} className="rounded-xl bg-muted/50 p-3.5 space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-2 text-sm font-medium"><item.icon className="h-4 w-4 text-muted-foreground" />{item.name}</span><Badge variant={item.variant}>{item.label}</Badge></div><p className="text-xs text-muted-foreground">{item.detail}</p></div>)}</CardContent></Card>
        </div>
    </div>;
}
