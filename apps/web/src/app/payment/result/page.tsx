"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, Clock, RefreshCw } from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Button } from "@/components/ui/button";
import { OrderActions, OrderFacts } from "@/components/commerce/order-ui";
import { currentCommerceAccount, useCommerceAccount } from "@/components/commerce/use-commerce-account";
import { apiGet } from "@/lib/api";
import { commerceJson, PAYMENT_LABELS, verifiedPayment, type CommerceOrder } from "@/lib/commerce";

function ResultContent() {
    const orderId = useSearchParams().get("orderId") || "";
    const { account, ready } = useCommerceAccount();
    const [result, setResult] = useState<{ key: string; order: CommerceOrder } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [polling, setPolling] = useState(false);
    const [revision, setRevision] = useState(0);
    const key = JSON.stringify([account?.id, account?.token, orderId]);
    const order = result?.key === key ? result.order : null;
    useEffect(() => {
        const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined; let attempts = 0;
        setLoading(true); setError(""); setPolling(false);
        if (!ready) return () => controller.abort();
        if (!account) { setLoading(false); return () => controller.abort(); }
        if (!/^[a-f0-9]{24}$/i.test(orderId)) { setError("Sipariş numarası bulunamadı veya geçersiz. Sipariş geçmişinizden güncel durumu kontrol edin."); setLoading(false); return () => controller.abort(); }
        const load = async () => {
            try {
                const value = await commerceJson<CommerceOrder>(await apiGet(`/payment/orders/${orderId}`, { signal: controller.signal, retries: 0 }), "Siparişinizin güncel durumu doğrulanamadı.");
                if (!value || value._id !== orderId || !Object.hasOwn(PAYMENT_LABELS, value.status)) throw new Error("Sipariş yanıtı doğrulanamadı.");
                if (controller.signal.aborted || !currentCommerceAccount(account)) return;
                setResult({ key, order: value }); setError("");
                const wait = value.status === "PENDING" || (value.status === "COMPLETED" && value.paymentEnvironment === "live" && ["PENDING", "PROCESSING"].includes(value.fulfillmentStatus || ""));
                attempts += 1; setPolling(wait && attempts < 12);
                if (wait && attempts < 12) timer = setTimeout(() => void load(), 5000);
            } catch (cause) { if (!controller.signal.aborted && currentCommerceAccount(account)) { setError(cause instanceof Error ? cause.message : "Ödeme durumu doğrulanamadı."); setPolling(false); } }
            finally { if (!controller.signal.aborted && currentCommerceAccount(account)) setLoading(false); }
        };
        void load();
        return () => { controller.abort(); if (timer) clearTimeout(timer); };
    }, [account, ready, orderId, key, revision]);
    const historyHref = account?.role === "PARENT" ? "/parent/packages" : account?.role === "ADMIN" || account?.role === "SUPERADMIN" ? "/admin/orders" : "/student/packages";
    const completed = !!order && verifiedPayment(order);
    const unverifiedLegacy = order?.status === "COMPLETED" && !completed;
    const fulfilled = completed && order?.fulfillmentStatus === "FULFILLED" && order?.paymentEnvironment === "live";
    const sandbox = order?.paymentEnvironment === "sandbox";
    const expired = !!order?.validUntil && new Date(order.validUntil).getTime() <= Date.now();
    const title = !account ? "Ödeme sonucunu hesabınızdan doğrulayın" : !order ? "Ödeme durumu doğrulanamadı" : unverifiedLegacy ? "Eski ödeme kaydı doğrulanmalı" : completed ? sandbox ? "Test ödemesi doğrulandı" : fulfilled ? expired ? "Ödeme doğrulandı · paket süresi doldu" : "Ödeme ve sınıf kaydı tamamlandı" : "Ödeme doğrulandı, erişim kontrol ediliyor" : order.status === "PENDING" ? "Ödeme onayı bekleniyor" : order.status === "CANCELLED" ? "Bekleyen sipariş kapatıldı" : "Ödeme tamamlanamadı";
    const Icon = fulfilled ? CheckCircle2 : order?.status === "PENDING" || completed ? Clock : AlertCircle;
    if (loading && !order) return <div className="text-center"><Loader2 className="mx-auto h-9 w-9 animate-spin mb-4" /><p>Siparişinizin güncel durumu doğrulanıyor…</p></div>;
    return <div className="max-w-2xl w-full mx-auto px-4 space-y-5"><div className="text-center"><Icon className={`mx-auto h-14 w-14 mb-4 ${fulfilled ? "text-emerald-600" : "text-amber-600"}`} /><h1 className="text-2xl font-bold">{title}</h1><p className="mt-3 text-sm text-gray-500">{!account ? "Satın alma yaptığınız öğrenci veya veli hesabıyla giriş yapın. Ödeme durumu yalnızca sunucudaki kayıt üzerinden gösterilir." : order?.status === "CANCELLED" ? "Siparişin burada kapatılması banka işlemini iptal etmez. Bankanızda tahsilat varsa yeni ödeme yapmadan kurumla görüşün." : fulfilled && !expired ? "Sınıf kaydınız doğrulandı. Derslerinize panelinizden ulaşabilirsiniz." : order?.status === "PENDING" ? "Sonuç henüz kesinleşmedi. Yeni ödeme başlatmadan bu siparişi kontrol edin." : !order ? "Yeni ödeme başlatmadan önce sipariş geçmişini kontrol edin." : "Tahsilat ve öğrenci erişimi aşağıda ayrı gösterilir."}</p></div>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
        {polling && <p role="status" className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Güncel sonuç otomatik kontrol ediliyor…</p>}
        {order && account && <div className="rounded-2xl border bg-white p-5 space-y-5"><OrderFacts order={order} /><OrderActions key={`${account.id}:${orderId}`} order={order} onChanged={() => setRevision(value => value + 1)} /></div>}
        <div className="flex flex-wrap justify-center gap-3">{account ? <><Link href={historyHref}><Button>Sipariş geçmişim<ArrowRight className="h-4 w-4" /></Button></Link><Button variant="outline" disabled={loading} onClick={() => setRevision(value => value + 1)}><RefreshCw className="h-4 w-4" />Durumu yenile</Button></> : <Link href={`/login?redirect=${encodeURIComponent(`/payment/result?orderId=${orderId}`)}`}><Button>Satın alma hesabımla giriş yap<ArrowRight className="h-4 w-4" /></Button></Link>}</div>
    </div>;
}
export default function PaymentResultPage() {
    return <div className="flex flex-col min-h-screen"><PublicHeader /><main className="flex-1 flex items-center justify-center pt-28 pb-16"><Suspense fallback={<Loader2 className="mx-auto h-8 w-8 animate-spin" />}><ResultContent /></Suspense></main><PublicFooter /></div>;
}
