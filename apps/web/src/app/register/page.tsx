"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { AuthShell } from "@/components/commerce/auth-shell";
import { useCommerceAccount } from "@/components/commerce/use-commerce-account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/api";
import { commerceJson } from "@/lib/commerce";
import { afterAuthentication, authPageHref, safeAuthRedirect } from "@/lib/auth-navigation";
import { clearAuthSession, saveAuthSession } from "@/lib/auth-session";

function RegisterContent() {
    const router = useRouter();
    const params = useSearchParams();
    const intent = safeAuthRedirect(params.get("redirect") || params.get("returnTo"));
    const { account, ready } = useCommerceAccount();
    const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "", role: "PARENT" as "PARENT" | "STUDENT", grade: "5", termsAccepted: false, privacyAccepted: false });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const busy = useRef(false);
    const request = useRef<AbortController | null>(null);
    useEffect(() => () => request.current?.abort(), []);
    const submit = async (event: React.FormEvent) => {
        event.preventDefault(); if (busy.current) return; setError("");
        if (form.firstName.trim().length < 2 || form.lastName.trim().length < 2) { setError("Ad ve soyad en az ikişer karakter olmalıdır."); return; }
        if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) { setError("En az 8 karakter, bir harf ve bir rakam içeren şifre oluşturun."); return; }
        if (form.password !== form.confirmPassword) { setError("Şifreler eşleşmiyor."); return; }
        if (!form.termsAccepted || !form.privacyAccepted) { setError("Üyelik koşullarını ve gizlilik bilgilendirmesini ayrı ayrı onaylayın."); return; }
        const priorToken = localStorage.getItem("token");
        busy.current = true; setLoading(true);
        const controller = new AbortController(); request.current = controller;
        try {
            const response = await commerceJson<unknown>(await apiPost("/auth/register", { firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim().toLowerCase(), password: form.password, role: form.role, ...(form.role === "STUDENT" ? { grade: Number(form.grade) } : {}), termsAccepted: true, privacyAccepted: true }, { skipAuth: true, retries: 0, signal: controller.signal, timeout: 45000 }), "Hesap oluşturulamadı.");
            if (controller.signal.aborted) return;
            if (localStorage.getItem("token") !== priorToken) throw new Error("Oturum bu sırada değişti. Yeni hesabınıza giriş yapmadan önce mevcut oturumu kontrol edin.");
            const session = saveAuthSession(response); setForm(previous => ({ ...previous, password: "", confirmPassword: "" }));
            router.replace(afterAuthentication(session.user.role, intent));
        } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error && cause.name !== "TypeError" && cause.name !== "AbortError" ? cause.message : "Bağlantı kesildi. Hesabınız oluşmuş olabilir; yeniden kayıt yapmadan giriş yapmayı deneyin."); }
        finally { busy.current = false; if (!controller.signal.aborted) setLoading(false); }
    };
    return <AuthShell title="Ücretsiz hesap oluştur" description={intent?.startsWith("/cart") ? "Paket seçiminiz korunur. Üyelik ücretsizdir; paket ödemesi sonraki adımda yapılır." : "Öğrenci veya veli hesabınızla eğitim paketlerinizi ve siparişlerinizi yönetin."}>
        {!ready ? <Loader2 className="h-6 w-6 animate-spin" aria-label="Oturum kontrol ediliyor" /> : account ? <div className="space-y-4"><p className="text-sm">Bu tarayıcıda açık bir hesabınız var.</p><Button className="w-full" onClick={() => router.replace(afterAuthentication(account.role, intent))}>Hesabımla devam et</Button><Button className="w-full" variant="outline" onClick={clearAuthSession}>Yeni hesap için mevcut oturumu kapat</Button></div> : <>
            <form onSubmit={submit} className="space-y-4"><fieldset disabled={loading} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">{([['firstName', 'Ad'], ['lastName', 'Soyad']] as const).map(([field, label]) => <div key={field} className="space-y-2"><Label htmlFor={`register-${field}`}>{label}</Label><Input id={`register-${field}`} autoComplete={field === 'firstName' ? 'given-name' : 'family-name'} minLength={2} maxLength={80} required value={form[field]} onChange={event => setForm(previous => ({ ...previous, [field]: event.target.value }))} /></div>)}</div>
                <div className="space-y-2"><Label htmlFor="register-email">E-posta</Label><Input id="register-email" type="email" autoComplete="email" maxLength={254} required value={form.email} onChange={event => setForm(previous => ({ ...previous, email: event.target.value }))} /></div>
                <div className="space-y-2"><Label htmlFor="register-role">Hesap türü</Label><select id="register-role" className="h-11 w-full rounded-xl border bg-background px-3" value={form.role} onChange={event => setForm(previous => ({ ...previous, role: event.target.value as "PARENT" | "STUDENT" }))}><option value="PARENT">Veli — öğrencim için satın alacağım</option><option value="STUDENT">Öğrenci — kendi hesabımı oluşturuyorum</option></select>{form.role === "PARENT" && <p className="text-xs text-muted-foreground">Kaydın ardından sepetinizden öğrenciniz için güvenli hesap oluşturabilirsiniz.</p>}</div>
                {form.role === "STUDENT" && <div className="space-y-2"><Label htmlFor="register-grade">Sınıf seviyesi</Label><select id="register-grade" required className="h-11 w-full rounded-xl border bg-background px-3" value={form.grade} onChange={event => setForm(previous => ({ ...previous, grade: event.target.value }))}>{Array.from({ length: 8 }, (_, index) => index + 1).map(grade => <option value={grade} key={grade}>{grade}. sınıf</option>)}</select></div>}
                <div className="space-y-2"><Label htmlFor="register-password">Şifre</Label><div className="relative"><Input id="register-password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={128} required className="pr-11" value={form.password} onChange={event => setForm(previous => ({ ...previous, password: event.target.value }))} /><button type="button" className="absolute right-3 top-3 text-muted-foreground" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><p className="text-xs text-muted-foreground">En az 8 karakter, bir harf ve bir rakam.</p></div>
                <div className="space-y-2"><Label htmlFor="register-confirm">Şifre tekrarı</Label><Input id="register-confirm" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={128} required value={form.confirmPassword} onChange={event => setForm(previous => ({ ...previous, confirmPassword: event.target.value }))} /></div>
                <label className="flex gap-3 items-start text-sm"><input type="checkbox" required className="mt-1" checked={form.termsAccepted} onChange={event => setForm(previous => ({ ...previous, termsAccepted: event.target.checked }))} /><span><Link href="/kullanim-sartlari" target="_blank" rel="noopener noreferrer" className="text-atlas-blue underline">Üyelik ve kullanım koşullarını</Link> okudum, kabul ediyorum.</span></label>
                <label className="flex gap-3 items-start text-sm"><input type="checkbox" required className="mt-1" checked={form.privacyAccepted} onChange={event => setForm(previous => ({ ...previous, privacyAccepted: event.target.checked }))} /><span><Link href="/gizlilik-politikasi" target="_blank" rel="noopener noreferrer" className="text-atlas-blue underline">Gizlilik politikasını</Link> ve <Link href="/kvkk" target="_blank" rel="noopener noreferrer" className="text-atlas-blue underline">kişisel veri bilgilendirmesini</Link> okudum. Bu bir pazarlama izni değildir.</span></label>
                {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
                <Button type="submit" className="w-full">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{loading ? "Hesabınız oluşturuluyor…" : "Hesap oluştur ve devam et"}</Button>
            </fieldset></form><p className="mt-6 text-sm text-center text-muted-foreground">Zaten hesabınız var mı? <Link href={authPageHref("login", intent)} className="text-atlas-blue font-semibold underline">Giriş yap</Link></p>
        </>}
    </AuthShell>;
}
export default function RegisterPage() { return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}><RegisterContent /></Suspense>; }
