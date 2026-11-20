"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { normalizePhone, validIdentityNumber } from "@/lib/commerce";

export interface CartBuyer { identityNumber: string; phone: string; city: string; address: string; termsAccepted: boolean; privacyAccepted: boolean; salesAgreementAccepted: boolean }
export function CartBillingForm({ busy, enabled, onSubmit }: { busy: boolean; enabled: boolean; onSubmit: (buyer: CartBuyer) => Promise<void> }) {
    const [form, setForm] = useState<CartBuyer>({ identityNumber: "", phone: "", city: "", address: "", termsAccepted: false, privacyAccepted: false, salesAgreementAccepted: false });
    const [error, setError] = useState("");
    const submit = async (event: React.FormEvent) => {
        event.preventDefault(); if (busy || !enabled) return; setError("");
        const phone = normalizePhone(form.phone);
        if (!validIdentityNumber(form.identityNumber)) { setError("Alıcının geçerli T.C. kimlik numarasını girin."); return; }
        if (!/^\+90[1-9]\d{9}$/.test(phone)) { setError("Geçerli Türkiye cep telefonu numaranızı girin."); return; }
        if (form.city.trim().length < 3 || form.address.trim().length < 10) { setError("İl ve en az 10 karakterlik gerçek fatura adresinizi girin."); return; }
        if (!form.termsAccepted || !form.privacyAccepted || !form.salesAgreementAccepted) { setError("Üç bilgilendirme/onay alanını ayrı ayrı işaretleyin."); return; }
        await onSubmit({ ...form, phone, city: form.city.trim(), address: form.address.trim() });
    };
    return <form onSubmit={submit} className="space-y-5"><fieldset disabled={busy || !enabled} className="space-y-4"><div><h2 className="text-lg font-semibold">Alıcı ve fatura bilgileri</h2><p className="text-xs text-muted-foreground mt-1">Bilgiler ödeyen hesap sahibine aittir. Kart bilgilerinizi bu forma yazmayın.</p></div><div className="grid sm:grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="cart-identity">Alıcının T.C. kimlik numarası</Label><Input id="cart-identity" inputMode="numeric" autoComplete="off" required minLength={11} maxLength={11} pattern="[1-9][0-9]{10}" value={form.identityNumber} onChange={event => setForm(previous => ({ ...previous, identityNumber: event.target.value.replace(/\D/g, "") }))} /></div><div className="space-y-2"><Label htmlFor="cart-phone">Cep telefonu</Label><Input id="cart-phone" type="tel" autoComplete="tel" required maxLength={20} placeholder="+905XXXXXXXXX" value={form.phone} onChange={event => setForm(previous => ({ ...previous, phone: event.target.value }))} onBlur={() => setForm(previous => ({ ...previous, phone: normalizePhone(previous.phone) }))} /></div></div><div className="space-y-2"><Label htmlFor="cart-city">İl</Label><Input id="cart-city" autoComplete="address-level1" required minLength={3} maxLength={80} value={form.city} onChange={event => setForm(previous => ({ ...previous, city: event.target.value }))} /></div><div className="space-y-2"><Label htmlFor="cart-address">Fatura adresi</Label><Textarea id="cart-address" autoComplete="street-address" required minLength={10} maxLength={500} value={form.address} onChange={event => setForm(previous => ({ ...previous, address: event.target.value }))} /></div>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" required className="mt-1" checked={form.termsAccepted} onChange={event => setForm(previous => ({ ...previous, termsAccepted: event.target.checked }))} /><span><Link href="/kullanim-sartlari" className="text-atlas-blue underline" target="_blank" rel="noopener noreferrer">Kullanım ve satın alma koşullarını</Link> okudum, kabul ediyorum.</span></label>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" required className="mt-1" checked={form.privacyAccepted} onChange={event => setForm(previous => ({ ...previous, privacyAccepted: event.target.checked }))} /><span><Link href="/gizlilik-politikasi" className="text-atlas-blue underline" target="_blank" rel="noopener noreferrer">Gizlilik politikasını</Link> ve <Link href="/kvkk" className="text-atlas-blue underline" target="_blank" rel="noopener noreferrer">kişisel veri bilgilendirmesini</Link> okudum. Bu bir açık rıza veya pazarlama izni değildir.</span></label>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" required className="mt-1" checked={form.salesAgreementAccepted} onChange={event => setForm(previous => ({ ...previous, salesAgreementAccepted: event.target.checked }))} /><span><Link href="/on-bilgilendirme" className="text-atlas-blue underline" target="_blank" rel="noopener noreferrer">Ön bilgilendirmeyi</Link> okudum, <Link href="/mesafeli-satis-sozlesmesi" className="text-atlas-blue underline" target="_blank" rel="noopener noreferrer">mesafeli satış sözleşmesini</Link> kabul ediyorum. <Link href="/iptal-iade" className="text-atlas-blue underline" target="_blank" rel="noopener noreferrer">İptal ve iade koşulları</Link></span></label>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<Button type="submit" className="w-full">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{busy ? "Ödeme oturumu hazırlanıyor…" : "iyzico güvenli ödemesine geç"}</Button><p className="text-xs text-muted-foreground text-center">Tek çekim ödeme · otomatik yenileme yok. Kart bilgileriniz iyzico ödeme sayfasında alınır.</p></fieldset></form>;
}
