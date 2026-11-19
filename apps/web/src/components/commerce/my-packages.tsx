"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Package, RefreshCw, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { apiGet } from "@/lib/api";
import { commerceDate, commerceJson, money, orderPage, personName, PAYMENT_LABELS, PERIOD_LABELS, type CommerceOrder, type CommercePackage, type CommercePerson, type OrderPage } from "@/lib/commerce";
import { OrderBadges, OrderDetailDialog, OrderPagination } from "./order-ui";
import { currentCommerceAccount, useCommerceAccount } from "./use-commerce-account";

export function MyPackages({ parent = false }: { parent?: boolean }) {
    const { account, ready } = useCommerceAccount();
    const [students, setStudents] = useState<CommercePerson[]>([]);
    const [studentsError, setStudentsError] = useState("");
    const [studentsRevision, setStudentsRevision] = useState(0);
    const [filters, setFilters] = useState({ studentId: "", status: "", page: 1 });
    const [revision, setRevision] = useState(0);
    const [result, setResult] = useState<{ key: string; orders: OrderPage; active: { order: CommerceOrder; package: CommercePackage | null } | null } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedOrder, setSelectedOrder] = useState("");
    const key = JSON.stringify([account?.id, account?.token, filters]);
    const data = result?.key === key ? result : null;

    useEffect(() => { setFilters({ studentId: "", status: "", page: 1 }); setSelectedOrder(""); }, [account]);
    useEffect(() => {
        const controller = new AbortController(); setStudents([]); setStudentsError("");
        if (!parent || !account) return () => controller.abort();
        void (async () => {
            try {
                const rows = await commerceJson<CommercePerson[]>(await apiGet("/payment/students", { signal: controller.signal, retries: 0 }), "Bağlı öğrenciler alınamadı.");
                if (!Array.isArray(rows)) throw new Error("Öğrenci listesi doğrulanamadı.");
                if (!controller.signal.aborted && currentCommerceAccount(account)) { setStudents(rows); if (rows.length === 1) setFilters(previous => ({ ...previous, studentId: rows[0]._id, page: 1 })); }
            } catch (cause) { if (!controller.signal.aborted && currentCommerceAccount(account)) setStudentsError(cause instanceof Error ? cause.message : "Öğrenci listesi alınamadı."); }
        })();
        return () => controller.abort();
    }, [account, parent, studentsRevision]);

    useEffect(() => {
        const controller = new AbortController(); setLoading(true); setError("");
        if (!account) { if (ready) setLoading(false); return () => controller.abort(); }
        const query = new URLSearchParams({ page: String(filters.page), pageSize: "10" });
        if (filters.studentId) query.set("studentId", filters.studentId);
        if (filters.status) query.set("status", filters.status);
        void (async () => {
            try {
                const [orders, active] = await Promise.all([
                    apiGet(`/payment/my-orders?${query}`, { signal: controller.signal, retries: 0 }).then(response => commerceJson<OrderPage>(response, "Sipariş geçmişi alınamadı.")).then(orderPage),
                    !parent || filters.studentId ? apiGet(`/payment/active-package${filters.studentId ? `?studentId=${encodeURIComponent(filters.studentId)}` : ""}`, { signal: controller.signal, retries: 0 }).then(response => commerceJson<{ order: CommerceOrder; package: CommercePackage | null } | null>(response, "Aktif paket doğrulanamadı.")) : Promise.resolve(null),
                ]);
                if (!controller.signal.aborted && currentCommerceAccount(account)) setResult({ key, orders, active });
            } catch (cause) { if (!controller.signal.aborted && currentCommerceAccount(account)) { setResult(null); setError(cause instanceof Error ? cause.message : "Paket bilgileri alınamadı."); } }
            finally { if (!controller.signal.aborted && currentCommerceAccount(account)) setLoading(false); }
        })();
        return () => controller.abort();
    }, [account, ready, filters, key, parent, revision]);

    return <div className="space-y-6 animate-fade-in">
        <PageHeader title={parent ? "Paketler ve Siparişler" : "Paketlerim"} description={parent ? "Öğrencilerinizin paket erişimini ve hesabınızın ödeme geçmişini takip edin." : "Paket erişiminiz ve doğrulanmış ödeme kayıtlarınız."}>
            <Link href="/packages"><Button size="sm"><ShoppingBag className="h-4 w-4" />Paketleri incele</Button></Link>
            <Button variant="outline" size="sm" disabled={loading} onClick={() => { setRevision(value => value + 1); if (studentsError) setStudentsRevision(value => value + 1); }}><RefreshCw className="h-4 w-4" />Yenile</Button>
        </PageHeader>
        {(error || studentsError) && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error || studentsError}</div>}
        {ready && !account ? <p role="alert">Paketlerinizi görmek için hesabınıza yeniden giriş yapın.</p> : <>
            {parent && <div className="rounded-xl border bg-muted/30 p-4 space-y-2"><label htmlFor="package-student" className="text-sm font-medium">Öğrenci</label><select id="package-student" className="block h-11 w-full rounded-xl border bg-background px-3" value={filters.studentId} onChange={event => { setSelectedOrder(""); setFilters(previous => ({ ...previous, studentId: event.target.value, page: 1 })); }}><option value="">Tüm öğrencilerin siparişleri</option>{students.map(student => <option key={student._id} value={student._id}>{student.firstName} {student.lastName}</option>)}</select><p className="text-xs text-muted-foreground">Aktif paket erişimini görmek için öğrenciyi seçin. Sipariş geçmişinde hesabınızın erişebildiği kayıtlar gösterilir.</p></div>}
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Package className="h-5 w-5" />Aktif paket erişimi</CardTitle></CardHeader><CardContent>
                {loading ? <Loader2 className="h-6 w-6 animate-spin" aria-label="Paket yükleniyor" /> : error ? <p className="text-sm text-muted-foreground">Aktif paket doğrulanamadı; hata giderildikten sonra yenileyin.</p> : parent && !filters.studentId ? <p className="text-sm text-muted-foreground">Öğrenci seçtiğinizde aktif paket burada görünür.</p> : data?.active ? <div className="space-y-3"><h3 className="font-semibold">{data.active.order.packageName || data.active.package?.name || "Eğitim paketi"}</h3><OrderBadges order={data.active.order} /><p className="text-sm text-muted-foreground">{money(data.active.order.amount)} · {PERIOD_LABELS[data.active.order.packagePeriod || data.active.package?.period || "one-time"]}</p><p className="text-sm">Bitiş: {data.active.order.validUntil ? commerceDate(data.active.order.validUntil) : "Bitiş tarihi belirtilmedi"}</p><Button size="sm" variant="outline" onClick={() => setSelectedOrder(data.active!.order._id)}>Sipariş detayları</Button></div> : <EmptyState icon={Package} title="Aktif paket bulunmuyor" description="Yalnızca canlı ödemesi doğrulanmış, sınıf kaydı tamamlanmış ve süresi geçerli paketler burada görünür." />}
            </CardContent></Card>
            <Card><CardHeader><div className="flex flex-wrap justify-between gap-3"><CardTitle className="text-base">Sipariş geçmişi</CardTitle><label className="text-sm"><span className="sr-only">Ödeme durumuna göre filtrele</span><select className="rounded-lg border bg-background p-2" value={filters.status} onChange={event => setFilters(previous => ({ ...previous, status: event.target.value, page: 1 }))}><option value="">Tüm ödeme durumları</option>{Object.entries(PAYMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div></CardHeader><CardContent className="space-y-4">
                {loading ? <Loader2 className="mx-auto h-7 w-7 animate-spin" aria-label="Siparişler yükleniyor" /> : !data ? <p className="text-sm text-muted-foreground">Sipariş geçmişi doğrulanamadı. Yenile düğmesiyle tekrar deneyin.</p> : !data.orders.items.length ? <EmptyState icon={ShoppingBag} title="Sipariş bulunamadı" description="Bu filtreye uyan sipariş kaydı bulunmuyor." /> : data.orders.items.map(order => <article key={order._id} className="rounded-xl border p-4 space-y-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-medium">{order.packageName || order.package?.name || "Eğitim paketi"}</h3><p className="text-sm text-muted-foreground">{money(order.amount)} · {commerceDate(order.createdAt)}</p>{order.beneficiary && <p className="text-xs text-muted-foreground mt-1">Öğrenci: {personName(order.beneficiary)}</p>}</div><Button size="sm" variant="outline" onClick={() => setSelectedOrder(order._id)}>Detay ve işlemler</Button></div><OrderBadges order={order} /></article>)}
                {data && <OrderPagination pagination={data.orders.pagination} loading={loading} onPage={page => setFilters(previous => ({ ...previous, page }))} />}
            </CardContent></Card>
        </>}
        {selectedOrder && account && <OrderDetailDialog key={`${account.id}:${selectedOrder}`} orderId={selectedOrder} onClose={() => setSelectedOrder("")} onChanged={() => setRevision(value => value + 1)} />}
    </div>;
}
