"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ShoppingCart, RefreshCw, Trash2, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { api, apiGet, apiPost } from "@/lib/api";
import { commerceJson, hostedPaymentUrl, money, PERIOD_LABELS, personName } from "@/lib/commerce";
import { verifiedCart, type CartPackage, type CustomerCart } from "@/lib/cart";
import { accountHome, accountOrders, authPageHref, cartHref } from "@/lib/auth-navigation";
import { clearAuthSession } from "@/lib/auth-session";
import { currentCommerceAccount, useCommerceAccount, type CommerceAccount } from "./use-commerce-account";
import { MerchantIdentity } from "./merchant-identity";
import { ParentStudentForm } from "./parent-student-form";
import { CartBillingForm, type CartBuyer } from "./cart-billing-form";

function AccountCart({ account, packageId, requestedStudentId }: { account: CommerceAccount; packageId: string; requestedStudentId: string }) {
    const router = useRouter();
    const [cart, setCart] = useState<CustomerCart | null>(null);
    const [requestedPackage, setRequestedPackage] = useState<CartPackage | null>(null);
    const [packageError, setPackageError] = useState("");
    const [packageLoading, setPackageLoading] = useState(false);
    const [studentId, setStudentId] = useState(requestedStudentId);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const busyRef = useRef(false);
    const cartRef = useRef<CustomerCart | null>(null);
    const loadAbort = useRef<AbortController | null>(null);
    const operationAbort = useRef<AbortController | null>(null);
    const parent = account.role === "PARENT";
    const ordersHref = accountOrders(account.role)!;
    const load = useCallback(async (clearError = true) => {
        loadAbort.current?.abort(); const controller = new AbortController(); loadAbort.current = controller;
        setLoading(true); if (clearError) setError("");
        try {
            const value = verifiedCart(await commerceJson<CustomerCart>(await apiGet("/cart", { retries: 0, signal: controller.signal }), "Sepetiniz alınamadı."));
            if (controller.signal.aborted || !currentCommerceAccount(account)) return;
            setCart(value); cartRef.current = value;
            setStudentId(previous => value.students.some(student => student._id === previous) ? previous : value.item?.student && value.students.some(student => student._id === value.item!.student!._id) ? value.item.student._id : value.students.length === 1 ? value.students[0]._id : "");
        } catch (cause) { if (!controller.signal.aborted && currentCommerceAccount(account)) setError(cause instanceof Error ? cause.message : "Sepetiniz alınamadı."); }
        finally { if (!controller.signal.aborted && currentCommerceAccount(account)) setLoading(false); }
    }, [account]);
    useEffect(() => { void load(); return () => { loadAbort.current?.abort(); operationAbort.current?.abort(); }; }, [load]);
    useEffect(() => {
        const controller = new AbortController(); setRequestedPackage(null); setPackageError(""); setPackageLoading(false);
        if (!packageId) return () => controller.abort();
        if (!/^[a-f0-9]{24}$/i.test(packageId)) { setPackageError("Paket seçimi geçersiz. Paketler sayfasından yeniden seçin."); return () => controller.abort(); }
        setPackageLoading(true);
        void (async () => { try { const value = await commerceJson<CartPackage>(await apiGet(`/packages/${packageId}`, { skipAuth: true, retries: 0, signal: controller.signal }), "Seçilen paket artık satışa açık değil. Güncel paketleri inceleyin."); if (!value || value._id !== packageId) throw new Error("Paket bilgileri doğrulanamadı."); if (!controller.signal.aborted && currentCommerceAccount(account)) setRequestedPackage(value); } catch (cause) { if (!controller.signal.aborted && currentCommerceAccount(account)) setPackageError(cause instanceof Error ? cause.message : "Paket alınamadı."); } finally { if (!controller.signal.aborted && currentCommerceAccount(account)) setPackageLoading(false); } })();
        return () => controller.abort();
    }, [account, packageId]);
    const putItem = async (selectedPackageId: string, selectedStudentId: string) => {
        const snapshot = cartRef.current;
        if (busyRef.current || !snapshot || !currentCommerceAccount(account)) return;
        if (parent && !snapshot.students.some(student => student._id === selectedStudentId)) { setError("Paket için bağlı öğrencilerinizden birini seçin veya yeni öğrenci hesabı oluşturun."); return; }
        busyRef.current = true; setBusy("cart"); setError(""); setNotice("");
        const controller = new AbortController(); operationAbort.current = controller;
        try {
            const value = verifiedCart(await commerceJson<CustomerCart>(await api("/cart/item", { method: "PUT", body: JSON.stringify({ packageId: selectedPackageId, ...(parent ? { studentId: selectedStudentId } : {}), revision: snapshot.revision }), retries: 0, signal: controller.signal }), "Paket sepetinize eklenemedi."));
            if (controller.signal.aborted || !currentCommerceAccount(account)) return;
            cartRef.current = value; setCart(value); setStudentId(value.item?.student?._id || ""); setNotice("Paket ve öğrenci seçiminiz sepetinize kaydedildi.");
            router.replace("/cart", { scroll: false });
        } catch (cause) { if (!controller.signal.aborted && currentCommerceAccount(account)) { setError(cause instanceof Error ? cause.message : "Sepet güncellenemedi."); await load(false); } }
        finally { busyRef.current = false; if (!controller.signal.aborted && currentCommerceAccount(account)) setBusy(""); }
    };
    const clear = async () => {
        const snapshot = cartRef.current; if (!snapshot || busyRef.current || !currentCommerceAccount(account)) return;
        busyRef.current = true; setBusy("clear"); setError(""); setNotice(""); const controller = new AbortController(); operationAbort.current = controller;
        try { const value = verifiedCart(await commerceJson<CustomerCart>(await api("/cart", { method: "DELETE", body: JSON.stringify({ revision: snapshot.revision }), retries: 0, signal: controller.signal }), "Sepet boşaltılamadı.")); if (!controller.signal.aborted && currentCommerceAccount(account)) { setCart(value); cartRef.current = value; setNotice("Paket sepetten kaldırıldı. Bu işlem mevcut ödeme oturumunu bankada iptal etmez."); router.replace("/cart", { scroll: false }); } }
        catch (cause) { if (!controller.signal.aborted && currentCommerceAccount(account)) { setError(cause instanceof Error ? cause.message : "Sepet boşaltılamadı."); await load(false); } }
        finally { busyRef.current = false; if (!controller.signal.aborted && currentCommerceAccount(account)) setBusy(""); }
    };
    const checkout = async (buyer: CartBuyer) => {
        const snapshot = cartRef.current;
        if (busyRef.current || !snapshot || !snapshot.canCheckout || !currentCommerceAccount(account)) return;
        busyRef.current = true; setBusy("checkout"); setError(""); setNotice(""); const controller = new AbortController(); operationAbort.current = controller;
        try {
            const response = await commerceJson<{ status: string; orderId: string; paymentPageUrl: string }>(await apiPost("/cart/checkout", { ...buyer, revision: snapshot.revision }, { retries: 0, timeout: 45000, signal: controller.signal }), "Ödeme oturumu başlatılamadı. Yeniden denemeden siparişlerinizi kontrol edin.");
            if (controller.signal.aborted || !currentCommerceAccount(account)) return;
            const url = hostedPaymentUrl(response.paymentPageUrl);
            if (response.status !== "success" || !/^[a-f0-9]{24}$/i.test(response.orderId) || !url) throw new Error("Ödeme oturumu doğrulanamadı. Yeni ödeme başlatmadan sipariş geçmişini kontrol edin.");
            window.location.assign(url);
        } catch (cause) { if (!controller.signal.aborted && currentCommerceAccount(account)) { setError(cause instanceof Error && cause.name !== "AbortError" && cause.name !== "TypeError" ? cause.message : "Bağlantı kesildi. Ödeme oturumu oluşmuş olabilir; yeniden ödeme başlatmadan sipariş geçmişini kontrol edin."); await load(false); } }
        finally { busyRef.current = false; if (!controller.signal.aborted && currentCommerceAccount(account)) setBusy(""); }
    };
    const candidate = packageId ? requestedPackage : cart?.item?.package;
    const selectedStudent = cart?.students.find(student => student._id === studentId);
    const selectionChanged = !!candidate && (!cart?.item || candidate._id !== cart.item.package._id || (parent && studentId !== cart.item.student?._id));
    const needsSelection = !!candidate && (selectionChanged || !!packageId || !cart?.item?.student);
    const formKey = cart ? JSON.stringify([cart.revision, cart.quoteChanged, cart.quote, cart.legalVersions]) : "empty";
    return <div className="space-y-6">
        <div className="flex flex-wrap justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-atlas-blue">Hesap → Sepet → Güvenli ödeme → Sipariş</p><h1 className="text-3xl font-bold mt-2">Sepetim</h1><p className="text-sm text-muted-foreground mt-2">Her sepet bir öğrenci için bir eğitim paketi içerir. Üyelik ücretsizdir.</p></div><div className="flex gap-2"><Button variant="outline" asChild><Link href={ordersHref}>Siparişlerim</Link></Button><Button variant="outline" disabled={loading || !!busy} onClick={() => void load()}><RefreshCw className="h-4 w-4" />Yenile</Button></div></div>
        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 space-y-2"><p>{error}</p><Link className="underline" href={ordersHref}>Yeni ödeme yapmadan siparişlerimi kontrol et</Link></div>}{notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
        {loading && !cart ? <Loader2 className="mx-auto h-8 w-8 animate-spin" aria-label="Sepet yükleniyor" /> : !cart ? <div className="rounded-2xl border p-6 text-sm"><p>Sepetiniz doğrulanamadı. Yenile düğmesiyle yeniden deneyin.</p></div> : <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start"><div className="space-y-5">
            {parent && <ParentStudentForm account={account} initiallyOpen={!cart.students.length} onCreated={async id => { setStudentId(id); await load(); }} />}
            {packageLoading && <p role="status" className="text-sm text-muted-foreground flex gap-2"><Loader2 className="h-4 w-4 animate-spin" />Seçtiğiniz paket hazırlanıyor…</p>}
            {packageError && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{packageError} <Link href="/packages" className="underline">Paketlere dön</Link></p>}
            {needsSelection && <section className="rounded-2xl border bg-white p-5 space-y-4"><div><h2 className="text-lg font-semibold">{cart.item ? "Paket / öğrenci seçimini güncelle" : "Paketi sepete ekle"}</h2><p className="mt-2 font-medium">{candidate.name}</p><p className="text-sm text-muted-foreground">{money(candidate.price)} · {candidate.period ? PERIOD_LABELS[candidate.period] : "Dönem doğrulanmalı"}</p>{candidate.description && <p className="text-sm text-muted-foreground mt-2">{candidate.description}</p>}</div>
                {parent ? <div className="space-y-2"><Label htmlFor="cart-student">Paketin kullanılacağı öğrenci</Label><select id="cart-student" className="h-11 w-full rounded-xl border bg-white px-3" value={studentId} disabled={!!busy || !cart.students.length} onChange={event => setStudentId(event.target.value)}><option value="">Öğrenci seçin</option>{cart.students.map(student => <option key={student._id} value={student._id}>{personName(student)}{student.grade ? ` · ${student.grade}. sınıf` : ""}</option>)}</select>{!cart.students.length && <p className="text-xs text-amber-800">Önce yukarıdan öğrenci hesabı oluşturun.</p>}</div> : <p className="text-sm">Öğrenci: {personName(cart.students[0], "Kendi öğrenci hesabınız")}</p>}
                {cart.item && selectionChanged && <p className="text-xs text-amber-800">Sepet tek paketlidir; onayladığınızda önceki paket/öğrenci seçimi değişir. Açık eski iyzico ödeme formunu kullanmayın.</p>}
                <Button disabled={!!busy || loading || (parent && !selectedStudent)} onClick={() => void putItem(candidate._id, studentId)}>{busy === "cart" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}{cart.item ? "Seçimi onayla ve sepeti güncelle" : "Sepete ekle"}</Button>
            </section>}
            {!cart.item ? <section className="rounded-2xl border bg-white p-7 text-center space-y-4"><ShoppingCart className="h-10 w-10 mx-auto text-slate-300" /><h2 className="text-lg font-semibold">Sepetiniz henüz boş</h2><p className="text-sm text-muted-foreground">Paket ve öğrenci seçiminizi onayladıktan sonra tutar ve ödeme adımı burada açılır.</p><Button variant="outline" asChild><Link href="/packages">Paketleri incele<ArrowRight className="h-4 w-4" /></Link></Button></section> : <section className="rounded-2xl border bg-white p-5 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{cart.item.package.name}</h2><p className="text-sm text-muted-foreground mt-1">Öğrenci: {personName(cart.item.student, "Öğrenci erişimi doğrulanamadı")}{cart.item.student?.grade ? ` · ${cart.item.student.grade}. sınıf` : ""}</p><p className="text-xs text-muted-foreground mt-1">1 eğitim paketi · {cart.quote ? PERIOD_LABELS[cart.quote.period] : "Dönem doğrulanmalı"}</p></div><Button size="sm" variant="outline" disabled={!!busy || loading} onClick={() => void clear()}><Trash2 className="h-4 w-4" />Kaldır</Button></div>
                <div className="lg:hidden flex items-center justify-between gap-3 rounded-xl bg-blue-50 p-4"><span className="text-sm font-medium">Toplam (Vergiler dahil)</span><strong className="text-xl text-atlas-blue">{money(cart.quote?.amount)}</strong></div>
                {parent && !needsSelection && <div className="space-y-2"><Label htmlFor="cart-change-student">Öğrenciyi değiştir</Label><select id="cart-change-student" className="h-11 w-full rounded-xl border px-3" value={studentId} disabled={!!busy || loading} onChange={event => setStudentId(event.target.value)}>{cart.students.map(student => <option key={student._id} value={student._id}>{personName(student)}</option>)}</select></div>}
                {cart.reason && !cart.canCheckout && <div role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 space-y-3"><p>{cart.reason}</p>{cart.quoteChanged && cart.item.student && <Button variant="outline" size="sm" disabled={!!busy || loading} onClick={() => void putItem(cart.item!.package._id, cart.item!.student!._id)}>Yeni fiyat ve koşulları onayla</Button>}</div>}
                {cart.paymentReadiness.mode === "sandbox" && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Test ortamı. Gerçek kart kullanmayın; test ödemesi canlı ders erişimi açmaz.</p>}
                {cart.orderId && <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">Bu sepete bağlı bir ödeme oturumu var. <Link className="underline" href={`/payment/result?orderId=${encodeURIComponent(cart.orderId)}`}>Yeni ödeme yapmadan mevcut siparişi kontrol edin.</Link></p>}
                <CartBillingForm key={formKey} busy={busy === "checkout"} enabled={cart.canCheckout && !loading && !busy && !selectionChanged} onSubmit={checkout} />
            </section>}
        </div><aside className="space-y-5 lg:sticky lg:top-24"><section className="rounded-2xl border bg-white p-5 space-y-4"><h2 className="text-lg font-semibold">Sipariş özeti</h2>{cart.item ? <><div className="text-sm space-y-2"><p className="font-medium">{cart.item.package.name}</p><p className="text-muted-foreground">{personName(cart.item.student, "Öğrenci seçimi gerekli")}</p><div className="flex justify-between"><span>Adet</span><span>1</span></div><div className="flex justify-between"><span>Dönem</span><span>{cart.quote ? PERIOD_LABELS[cart.quote.period] : "—"}</span></div></div><div className="border-t pt-4 flex justify-between gap-3"><strong>Toplam</strong><strong className="text-xl text-atlas-blue">{money(cart.quote?.amount)}</strong></div></> : <p className="text-sm text-muted-foreground">Paket eklediğinizde sunucunun doğruladığı tutar gösterilir.</p>}<p className="flex gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0" />Kart bilgileri iyzico sayfasında alınır. Otomatik tahsilat yapılmaz.</p></section><MerchantIdentity merchant={cart.merchant} /></aside></div>}
    </div>;
}

export function CartWorkspace() {
    const params = useSearchParams();
    const router = useRouter();
    const { account, ready } = useCommerceAccount();
    const packageId = params.get("packageId") || "";
    const studentId = params.get("studentId") || "";
    const intent = cartHref(packageId, studentId);
    useEffect(() => { if (ready && !account) router.replace(authPageHref("login", intent)); }, [account, ready, router, intent]);
    if (!ready || !account) return <div className="py-16 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /><p className="mt-4 text-sm text-muted-foreground">Sepetinize erişim kontrol ediliyor…</p></div>;
    if (!["STUDENT", "PARENT"].includes(account.role)) return <section className="max-w-xl mx-auto rounded-2xl border bg-white p-7 space-y-5"><h1 className="text-2xl font-bold">Öğrenci veya veli hesabı gerekli</h1><p className="text-sm text-muted-foreground">Bu hesabın rolüyle paket satın alınamaz. Öğrenci veya veli hesabınızla giriş yapabilirsiniz.</p><div className="flex flex-wrap gap-3"><Button variant="outline" asChild><Link href={accountHome(account.role)}>Panelime dön</Link></Button><Button onClick={() => { clearAuthSession(); router.replace(authPageHref("login", intent)); }}>Başka hesapla giriş yap</Button></div></section>;
    return <AccountCart key={`${account.id}:${account.token}`} account={account} packageId={packageId} requestedStudentId={studentId} />;
}
