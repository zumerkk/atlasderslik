"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiGet, apiPost } from "@/lib/api";
import { commerceDate, commerceJson, FULFILLMENT_LABELS, hostedPaymentUrl, money, personName, PAYMENT_LABELS, PERIOD_LABELS, verifiedPayment, type CommerceOrder } from "@/lib/commerce";
import { currentCommerceAccount, useCommerceAccount } from "./use-commerce-account";
import { MerchantIdentity } from "./merchant-identity";

export function OrderBadges({ order }: { order: CommerceOrder }) {
    const verified = verifiedPayment(order);
    return <div className="flex flex-wrap gap-2"><Badge variant={verified ? "success" : order.status === "FAILED" ? "destructive" : "warning"}>{order.status === "COMPLETED" && !verified ? "Eski kayıt · tahsilat doğrulanmalı" : PAYMENT_LABELS[order.status] || "Durum doğrulanmalı"}</Badge>{order.paymentEnvironment && <Badge variant={order.paymentEnvironment === "live" ? "outline" : "warning"}>{order.paymentEnvironment === "live" ? "Canlı" : "Test"}</Badge>}{verified && <Badge variant={order.fulfillmentStatus === "FULFILLED" ? "success" : order.fulfillmentStatus === "FAILED" ? "destructive" : "info"}>{order.fulfillmentStatus ? FULFILLMENT_LABELS[order.fulfillmentStatus] : "Erişim durumu doğrulanmalı"}</Badge>}{order.refundRequestStatus === "REQUESTED" && <Badge variant="warning">İade talebi · para iadesi yapılmadı</Badge>}</div>;
}
export function OrderFacts({ order, admin = false }: { order: CommerceOrder; admin?: boolean }) {
    const facts = [["Sipariş no", order._id], ["Paket", order.packageName || order.package?.name || "Paket kaydı kaldırılmış"], ["Tutar", money(order.amount)], ["Dönem", PERIOD_LABELS[order.packagePeriod || order.package?.period || "one-time"]], ["Ödeyen", personName(order.user, "Satın alma hesabı")], ["Öğrenci", personName(order.beneficiary)], ["Oluşturulma", commerceDate(order.createdAt)], ["Tahsilat", commerceDate(order.paidAt)], ["Erişim açılma", commerceDate(order.fulfillmentAt)], ["Paket bitişi", order.validUntil ? commerceDate(order.validUntil) : "Bitiş tarihi belirtilmedi"], ["Ödeme oturumu sonu", commerceDate(order.checkoutExpiresAt)]];
    if (admin && order.iyzicoPaymentId) facts.push(["iyzico işlem no", order.iyzicoPaymentId]);
    if (admin && order.failureCode) facts.push(["Hata kodu", order.failureCode]);
    return <div className="space-y-4"><OrderBadges order={order} /><dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">{facts.map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words mt-1">{value}</dd></div>)}</dl><MerchantIdentity merchant={order.sellerSnapshot} historical />{order.status === "COMPLETED" && !verifiedPayment(order) && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Bu eski kayıtta sağlayıcı doğrulaması bulunmuyor. Tahsilat veya erişimin tamamlandığı varsayılmaz; kurumla görüşerek ödeme durumunu kontrol edin.</p>}{verifiedPayment(order) && order.fulfillmentStatus !== "FULFILLED" && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{order.paymentEnvironment === "sandbox" ? "Bu bir test ödemesidir; öğrenciye canlı ders veya paket erişimi açılmaz." : "Ödeme doğrulandı. Sınıf kaydı henüz tamamlanmadığı için erişim açıldı olarak gösterilmiyor. Yenileyebilir veya kurumla görüşebilirsiniz."}</p>}{order.refundRequestStatus === "REQUESTED" && <div className="rounded-xl border p-3 text-sm"><p>İade talebi: {commerceDate(order.refundRequestedAt)}</p><p className="mt-1 whitespace-pre-wrap">{order.refundReason}</p><p className="mt-2 text-muted-foreground">Bu talep kurum incelemesi içindir; bankadan para iadesi yapıldığı anlamına gelmez.</p></div>}{admin && order.fulfillmentError && <p className="text-sm text-rose-700">Sınıf kaydı: {order.fulfillmentError}</p>}</div>;
}
export function OrderActions({ order, admin = false, onChanged }: { order: CommerceOrder; admin?: boolean; onChanged: () => void }) {
    const { account } = useCommerceAccount();
    const [busy, setBusy] = useState("");
    const busyRef = useRef(false);
    const [message, setMessage] = useState("");
    const [cancelConfirm, setCancelConfirm] = useState(false);
    const [refundOpen, setRefundOpen] = useState(false);
    const [refundReason, setRefundReason] = useState("");
    const action = async (kind: "reconcile" | "resume" | "cancel" | "refund-request") => {
        if (busyRef.current || !currentCommerceAccount(account)) return;
        if (kind === "refund-request" && (refundReason.trim().length < 10 || refundReason.trim().length > 1000)) { setMessage("İade talebinizin gerekçesini 10–1.000 karakterle açıklayın."); return; }
        busyRef.current = true; setBusy(kind); setMessage("");
        try {
            const data = await commerceJson<{ message?: string; status?: string; paymentPageUrl?: string }>(await apiPost(`/payment/${admin ? "admin/" : ""}orders/${order._id}/${kind}`, kind === "refund-request" ? { reason: refundReason.trim() } : {}, { retries: 0, timeout: 45000 }), "İşlem doğrulanamadı. Sipariş durumunu yenileyin.");
            if (!currentCommerceAccount(account)) return;
            if (kind === "resume") { const url = hostedPaymentUrl(data.paymentPageUrl); if (!url) throw new Error("Güvenli ödeme adresi doğrulanamadı."); window.location.assign(url); return; }
            setMessage(data.message || "Sipariş durumu yeniden kontrol edildi."); setCancelConfirm(false); setRefundOpen(false); setRefundReason(""); onChanged();
        } catch (cause) { if (currentCommerceAccount(account)) setMessage(cause instanceof Error ? cause.message : "İşlem tamamlanamadı. Sipariş durumunu yenileyin."); }
        finally { busyRef.current = false; if (currentCommerceAccount(account)) setBusy(""); }
    };
    return <div className="space-y-3">{message && <p role="status" className="rounded-lg bg-muted p-3 text-sm">{message}</p>}<div className="flex flex-wrap gap-2">{order.canReconcile && <Button variant="outline" size="sm" disabled={!!busy} onClick={() => void action("reconcile")}>{busy === "reconcile" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Sağlayıcıdan doğrula</Button>}{!admin && order.canResume && <Button size="sm" disabled={!!busy} onClick={() => void action("resume")}>{busy === "resume" && <Loader2 className="h-4 w-4 animate-spin" />}Ödemeye devam et</Button>}{!admin && order.canCancel && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => setCancelConfirm(true)}>Bekleyen siparişi kapat</Button>}{!admin && order.canRequestRefund && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => setRefundOpen(true)}>İade talebi oluştur</Button>}</div>{cancelConfirm && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3"><p className="text-sm text-amber-900">Yalnızca bu sitedeki bekleyen sipariş kapatılır. Bankadaki işlem iptal edilmez ve para iadesi yapılmaz. Açık iyzico ödeme sayfasını da kapatın. Bankanızda tahsilat varsa yeni ödeme yapmadan kurumla görüşün.</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={!!busy} onClick={() => setCancelConfirm(false)}>Vazgeç</Button><Button size="sm" disabled={!!busy} onClick={() => void action("cancel")}>{busy === "cancel" && <Loader2 className="h-4 w-4 animate-spin" />}Siparişi kapat</Button></div></div>}{refundOpen && <div className="rounded-xl border p-4 space-y-3"><label className="block text-sm font-medium" htmlFor={`refund-${order._id}`}>İade talebi gerekçesi</label><textarea id={`refund-${order._id}`} className="w-full rounded-lg border p-3 text-sm" rows={3} minLength={10} maxLength={1000} value={refundReason} disabled={!!busy} onChange={event => setRefundReason(event.target.value)} /><p className="text-xs text-muted-foreground">Bu işlem kuruma inceleme talebi iletir; kartınıza para iadesi yapmaz.</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={!!busy} onClick={() => setRefundOpen(false)}>Vazgeç</Button><Button size="sm" disabled={!!busy || refundReason.trim().length < 10} onClick={() => void action("refund-request")}>{busy === "refund-request" && <Loader2 className="h-4 w-4 animate-spin" />}Talebi kaydet</Button></div></div>}</div>;
}
export function OrderDetailDialog({ orderId, admin = false, onClose, onChanged }: { orderId: string; admin?: boolean; onClose: () => void; onChanged: () => void }) {
    const { account } = useCommerceAccount();
    const [order, setOrder] = useState<CommerceOrder | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        const controller = new AbortController(); setOrder(null); setError(""); setLoading(true);
        if (!account) return () => controller.abort();
        void (async () => { try { const data = await commerceJson<CommerceOrder>(await apiGet(`/payment/${admin ? "admin/" : ""}orders/${orderId}`, { retries: 0, signal: controller.signal }), "Sipariş detayı alınamadı."); if (!controller.signal.aborted && currentCommerceAccount(account)) setOrder(data); } catch (cause) { if (!controller.signal.aborted && currentCommerceAccount(account)) setError(cause instanceof Error ? cause.message : "Sipariş detayı alınamadı."); } finally { if (!controller.signal.aborted && currentCommerceAccount(account)) setLoading(false); } })();
        return () => controller.abort();
    }, [account, admin, orderId, revision]);
    return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Sipariş detayı</DialogTitle><DialogDescription>Tahsilat ve öğrenci erişimi ayrı olarak doğrulanır.</DialogDescription></DialogHeader>{loading ? <Loader2 className="h-6 w-6 animate-spin" aria-label="Sipariş yükleniyor" /> : error ? <div role="alert" className="space-y-3"><p className="text-sm text-rose-700">{error}</p><Button variant="outline" onClick={() => setRevision(value => value + 1)}>Yeniden dene</Button></div> : order && <><OrderFacts order={order} admin={admin} /><OrderActions key={orderId} order={order} admin={admin} onChanged={() => { setRevision(value => value + 1); onChanged(); }} /></>}</DialogContent></Dialog>;
}
export function OrderPagination({ pagination, loading, onPage }: { pagination: { page: number; totalPages: number; total: number }; loading: boolean; onPage: (page: number) => void }) {
    return <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm"><span className="text-muted-foreground">{pagination.total} sipariş · Sayfa {pagination.page} / {Math.max(1, pagination.totalPages)}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={loading || pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}>Önceki</Button><Button variant="outline" size="sm" disabled={loading || pagination.page >= pagination.totalPages} onClick={() => onPage(pagination.page + 1)}>Sonraki</Button></div></div>;
}
