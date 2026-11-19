"use client";

import { useEffect, useState } from "react";
import { CreditCard, Loader2, RefreshCw, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { OrderBadges, OrderDetailDialog, OrderPagination } from "@/components/commerce/order-ui";
import { currentCommerceAccount, useCommerceAccount } from "@/components/commerce/use-commerce-account";
import { apiGet } from "@/lib/api";
import { commerceDate, commerceJson, money, orderPage, personName, PAYMENT_LABELS, type OrderPage } from "@/lib/commerce";

const READINESS_LABELS: Record<string, string> = { apiKey: "API anahtarı", secretKey: "Gizli anahtar", endpoint: "iyzico adresi", credentialMode: "Anahtar ve ortam uyumu", callbackUrl: "Ödeme dönüş adresi", frontendUrl: "Site adresi", databaseIndexes: "Sipariş güvenliği", merchantInformation: "Satıcı resmî bilgileri" };
interface PaymentReadiness { mode: "live" | "sandbox" | "unconfigured"; canAcceptPayments: boolean; livePaymentVerified: boolean; checks: Record<string, boolean>; message: string }
const initialFilters = { status: "", environment: "", q: "", from: "", to: "", page: 1 };

export default function AdminOrdersPage() {
    const { account } = useCommerceAccount();
    const [filters, setFilters] = useState(initialFilters);
    const [search, setSearch] = useState("");
    const [dates, setDates] = useState({ from: "", to: "" });
    const [result, setResult] = useState<{ key: string; data: OrderPage } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [readiness, setReadiness] = useState<PaymentReadiness | null>(null);
    const [readinessError, setReadinessError] = useState("");
    const [revision, setRevision] = useState(0);
    const [selectedOrder, setSelectedOrder] = useState("");
    const key = JSON.stringify([account?.id, account?.token, filters]);
    const data = result?.key === key ? result.data : null;

    useEffect(() => { setSelectedOrder(""); setResult(null); setFilters(initialFilters); setSearch(""); setDates({ from: "", to: "" }); setReadiness(null); }, [account]);
    useEffect(() => {
        const controller = new AbortController();
        if (!account) return () => controller.abort();
        setReadinessError("");
        void (async () => { try { const value = await commerceJson<PaymentReadiness>(await apiGet("/payment/admin/readiness", { signal: controller.signal, retries: 0 }), "Sanal POS durumu alınamadı."); if (!controller.signal.aborted && currentCommerceAccount(account)) setReadiness(value); } catch (cause) { if (!controller.signal.aborted && currentCommerceAccount(account)) setReadinessError(cause instanceof Error ? cause.message : "Sanal POS durumu alınamadı."); } })();
        return () => controller.abort();
    }, [account, revision]);
    useEffect(() => {
        const controller = new AbortController(); setLoading(true); setError("");
        if (!account) return () => controller.abort();
        const query = new URLSearchParams({ page: String(filters.page), pageSize: "20" });
        for (const field of ["q", "status", "environment", "from", "to"] as const) if (filters[field]) query.set(field, filters[field]);
        void (async () => { try { const value = orderPage(await commerceJson<OrderPage>(await apiGet(`/payment/admin/orders?${query}`, { signal: controller.signal, retries: 0 }), "Siparişler yüklenemedi.")); if (!controller.signal.aborted && currentCommerceAccount(account)) setResult({ key, data: value }); } catch (cause) { if (!controller.signal.aborted && currentCommerceAccount(account)) { setResult(null); setError(cause instanceof Error ? cause.message : "Siparişler yüklenemedi."); } } finally { if (!controller.signal.aborted && currentCommerceAccount(account)) setLoading(false); } })();
        return () => controller.abort();
    }, [account, filters, key, revision]);
    const applySearch = (event: React.FormEvent) => { event.preventDefault(); if (dates.from && dates.to && dates.from > dates.to) { setError("Başlangıç tarihi bitiş tarihinden sonra olamaz."); return; } setFilters(previous => ({ ...previous, q: search.trim(), ...dates, page: 1 })); };
    const selectClass = "h-11 rounded-xl border bg-background px-3 text-sm";
    return <div className="space-y-6 animate-fade-in">
        <PageHeader title="Siparişler ve Ödemeler" description="Tahsilatı, test işlemlerini ve öğrenci erişimini ayrı takip edin."><Button variant="outline" disabled={loading} onClick={() => setRevision(value => value + 1)}><RefreshCw className="h-4 w-4" />Yenile</Button></PageHeader>
        {readinessError && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{readinessError}</p>}
        {readiness && <Card><CardContent className="p-4 space-y-3"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-semibold">iyzico Sanal POS</h2><Badge variant={readiness.canAcceptPayments ? "success" : "warning"}>{readiness.mode === "live" ? "Canlı ortam" : readiness.mode === "sandbox" ? "Test ortamı" : "Yapılandırılmadı"}</Badge></div><p className="text-sm text-muted-foreground">{readiness.message}</p><div className="flex flex-wrap gap-2">{Object.entries(readiness.checks || {}).map(([check, passed]) => <Badge key={check} variant={passed ? "success" : "warning"}>{READINESS_LABELS[check] || check}: {passed ? "Hazır" : "Eksik"}</Badge>)}</div></CardContent></Card>}
        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
        <form onSubmit={applySearch} className="flex flex-wrap items-end gap-3 rounded-xl border p-4">
            <label className="min-w-48 flex-1 text-xs space-y-1"><span>İsim, e-posta, paket veya sipariş no</span><Input value={search} maxLength={120} onChange={event => setSearch(event.target.value)} placeholder="Sipariş ara" /></label>
            <label className="text-xs space-y-1"><span className="block">Başlangıç (Türkiye saati)</span><Input type="date" value={dates.from} onChange={event => setDates(previous => ({ ...previous, from: event.target.value }))} /></label>
            <label className="text-xs space-y-1"><span className="block">Bitiş (Türkiye saati)</span><Input type="date" value={dates.to} min={dates.from || undefined} onChange={event => setDates(previous => ({ ...previous, to: event.target.value }))} /></label>
            <Button type="submit"><Search className="h-4 w-4" />Uygula</Button><Button type="button" variant="outline" onClick={() => { setFilters(initialFilters); setSearch(""); setDates({ from: "", to: "" }); }}>Temizle</Button>
        </form>
        <div className="flex flex-wrap gap-3"><label><span className="sr-only">Ödeme durumu</span><select className={selectClass} value={filters.status} onChange={event => setFilters(previous => ({ ...previous, status: event.target.value, page: 1 }))}><option value="">Tüm ödeme durumları</option>{Object.entries(PAYMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span className="sr-only">Ödeme ortamı</span><select className={selectClass} value={filters.environment} onChange={event => setFilters(previous => ({ ...previous, environment: event.target.value, page: 1 }))}><option value="">Canlı ve test işlemleri</option><option value="live">Yalnız canlı</option><option value="sandbox">Yalnız test</option></select></label></div>
        {data && <><div className="grid grid-cols-2 xl:grid-cols-5 gap-3">{[["Canlı tahsilat", money(data.summary.liveRevenue)], ["Test işlem tutarı", money(data.summary.sandboxRevenue)], ["Ödemesi beklenen", data.summary.pendingOrders], ["Erişim kaydı bekleyen", data.summary.fulfillmentPending], ["İade talebi (incelemede)", data.summary.refundRequests ?? "—"]].map(([label, value]) => <Card key={label}><CardContent className="p-4"><p className="text-lg font-bold">{value}</p><p className="text-xs text-muted-foreground mt-1">{label}</p></CardContent></Card>)}</div><p className="text-xs text-muted-foreground">Özet seçili filtrelere uyan tüm {data.summary.totalOrders} siparişi kapsar; yalnızca bu sayfadaki kayıtlarla sınırlı değildir. Test işlem tutarı canlı tahsilata dahil edilmez.</p></>}
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-5 w-5" />Sipariş kayıtları</CardTitle></CardHeader><CardContent className="space-y-4">{loading ? <Loader2 className="mx-auto h-7 w-7 animate-spin" aria-label="Siparişler yükleniyor" /> : !data ? <p className="text-sm text-muted-foreground">Sipariş verisi doğrulanamadı. Yenileyip tekrar deneyin.</p> : !data.items.length ? <EmptyState icon={CreditCard} title="Sipariş bulunamadı" description="Bu filtrelere uyan kayıt bulunmuyor." /> : <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-sm text-left"><thead><tr className="border-b text-xs text-muted-foreground">{["Ödeyen / Öğrenci", "Paket", "Tutar", "Tarih", "Ödeme ve erişim", "İşlemler"].map(label => <th className="py-3 pr-4" key={label}>{label}</th>)}</tr></thead><tbody>{data.items.map(order => <tr key={order._id} className="border-b last:border-0"><td className="py-4 pr-4"><p>{personName(order.user, "Hesap kaydı yok")}</p><p className="text-xs text-muted-foreground">{typeof order.user === "object" ? order.user?.email : ""}</p><p className="text-xs mt-1">Öğrenci: {personName(order.beneficiary)}</p></td><td className="pr-4">{order.packageName || order.package?.name || "Paket kaydı yok"}</td><td className="pr-4 whitespace-nowrap font-medium">{money(order.amount)}</td><td className="pr-4 text-xs">{commerceDate(order.createdAt)}</td><td className="pr-4 max-w-52"><OrderBadges order={order} /></td><td><Button size="sm" variant="outline" onClick={() => setSelectedOrder(order._id)}>Detay</Button></td></tr>)}</tbody></table></div>}{data && <OrderPagination pagination={data.pagination} loading={loading} onPage={page => setFilters(previous => ({ ...previous, page }))} />}</CardContent></Card>
        {selectedOrder && account && <OrderDetailDialog key={`${account.id}:${selectedOrder}`} admin orderId={selectedOrder} onClose={() => setSelectedOrder("")} onChanged={() => setRevision(value => value + 1)} />}
    </div>;
}
