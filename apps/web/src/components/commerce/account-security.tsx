"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ShieldCheck, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCommerceAccount, currentCommerceAccount } from "./use-commerce-account";
import { apiPost } from "@/lib/api";
import { commerceJson } from "@/lib/commerce";
import { accountHome, authPageHref, safeAuthRedirect } from "@/lib/auth-navigation";
import { saveAuthSession } from "@/lib/auth-session";
import { contactPhoneLabel, usePublicContact } from "@/lib/public-contact";

export function AccountSecurity() {
    const router = useRouter();
    const { account, ready } = useCommerceAccount();
    const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState<{ accountId: string; message: string } | null>(null);
    const busyRef = useRef(false);
    const request = useRef<AbortController | null>(null);
    useEffect(() => { if (ready && !account) router.replace(authPageHref("login", "/account/security")); }, [account, ready, router]);
    useEffect(() => { request.current?.abort(); setForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); setError(""); setBusy(false); busyRef.current = false; return () => request.current?.abort(); }, [account?.id, account?.token]);
    const submit = async (event: React.FormEvent) => {
        event.preventDefault(); if (!account || !currentCommerceAccount(account) || busyRef.current) return; setError(""); setNotice(null);
        if (form.newPassword.length < 8 || !/[A-Za-z]/.test(form.newPassword) || !/\d/.test(form.newPassword)) { setError("Yeni şifreniz en az 8 karakter, bir harf ve bir rakam içermelidir."); return; }
        if (form.newPassword !== form.confirmPassword) { setError("Yeni şifreler eşleşmiyor."); return; }
        if (form.newPassword === form.currentPassword) { setError("Yeni şifreniz mevcut şifrenizden farklı olmalıdır."); return; }
        busyRef.current = true; setBusy(true); const controller = new AbortController(); request.current = controller;
        try {
            const response = await commerceJson<unknown>(await apiPost("/auth/change-password", { currentPassword: form.currentPassword, newPassword: form.newPassword }, { signal: controller.signal, retries: 0, timeout: 45000 }), "Şifre değiştirilemedi.");
            if (controller.signal.aborted || !currentCommerceAccount(account)) return;
            saveAuthSession(response); setForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); setNotice({ accountId: account.id, message: "Şifreniz değiştirildi. Diğer oturumlarınız geçersiz kılındı; bu hesapta yeni oturumunuzla devam edebilirsiniz." });
        } catch (cause) { if (!controller.signal.aborted && currentCommerceAccount(account)) setError(cause instanceof Error && cause.name !== "TypeError" ? cause.message : "Bağlantı kurulamadı. Şifreniz değişmiş olabilir; yeniden giriş yaparak kontrol edin."); }
        finally { busyRef.current = false; if (!controller.signal.aborted) setBusy(false); }
    };
    if (!ready || !account) return <div className="py-20 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /><p className="mt-3 text-sm text-muted-foreground">Hesabınıza erişim kontrol ediliyor…</p></div>;
    return <section className="max-w-xl mx-auto rounded-2xl border bg-white p-6 sm:p-8 space-y-5"><div><ShieldCheck className="h-8 w-8 text-atlas-blue mb-3" /><h1 className="text-2xl font-bold">Hesap güvenliği</h1><p className="mt-2 text-sm text-muted-foreground">Mevcut şifrenizi doğrulayarak yeni şifre belirleyin.</p></div>{notice?.accountId === account.id && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice.message}</p>}<form onSubmit={submit} className="space-y-4"><fieldset disabled={busy} className="space-y-4">{([{ field: "currentPassword", label: "Mevcut şifre", autocomplete: "current-password" }, { field: "newPassword", label: "Yeni şifre", autocomplete: "new-password" }, { field: "confirmPassword", label: "Yeni şifre tekrarı", autocomplete: "new-password" }] as const).map(item => <div className="space-y-2" key={item.field}><Label htmlFor={`security-${item.field}`}>{item.label}</Label><Input id={`security-${item.field}`} type="password" autoComplete={item.autocomplete} required minLength={item.field === "currentPassword" ? 1 : 8} maxLength={128} value={form[item.field]} onChange={event => setForm(previous => ({ ...previous, [item.field]: event.target.value }))} /></div>)}<p className="text-xs text-muted-foreground">En az 8 karakter, bir harf ve bir rakam kullanın. İşlem başarılı olduğunda önceki oturumlar geçersiz olur.</p>{error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<Button type="submit" className="w-full">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{busy ? "Şifre değiştiriliyor…" : "Şifremi değiştir"}</Button></fieldset></form><div className="flex flex-wrap justify-between gap-3 text-sm"><Link href={accountHome(account.role)} className="text-atlas-blue underline">Panelime dön</Link><Link href="/sifremi-unuttum" className="text-atlas-blue underline">Mevcut şifremi bilmiyorum</Link></div></section>;
}
export function PasswordHelp() {
    const params = useSearchParams();
    const intent = safeAuthRedirect(params.get("redirect"));
    const contact = usePublicContact();
    return <section className="max-w-xl mx-auto rounded-2xl border bg-white p-6 sm:p-8 space-y-5"><h1 className="text-2xl font-bold">Şifre erişim desteği</h1><p className="text-sm text-muted-foreground">Otomatik şifre sıfırlama e-postası şu anda etkin değildir. Kayıtlı e-posta adresinizi belirterek kurumun destek ekibine başvurabilirsiniz.</p><p className="text-sm">Şifrenizi veya kart bilgilerinizi paylaşmayın. Bu sayfa e-posta göndermez ve hesabınızın şifresini kendiliğinden değiştirmez.</p><div className="flex flex-col gap-3"><Button variant="outline" asChild><a href={`mailto:${encodeURIComponent(contact.email)}?subject=${encodeURIComponent("Hesap erişimi ve şifre desteği")}`}><Mail className="h-4 w-4" />{contact.email}</a></Button><Button variant="outline" asChild><a href={`tel:${contact.phone}`}><Phone className="h-4 w-4" />{contactPhoneLabel(contact.phone)}</a></Button></div><Link className="text-sm text-atlas-blue underline inline-block" href={authPageHref("login", intent)}>Giriş ekranına dön</Link></section>;
}
