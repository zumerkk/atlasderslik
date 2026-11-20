"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/commerce/auth-shell";
import { useCommerceAccount } from "@/components/commerce/use-commerce-account";
import { apiPost } from "@/lib/api";
import { commerceJson } from "@/lib/commerce";
import { afterAuthentication, authPageHref, safeAuthRedirect } from "@/lib/auth-navigation";
import { clearAuthSession, saveAuthSession } from "@/lib/auth-session";

function LoginContent() {
    const router = useRouter();
    const params = useSearchParams();
    const intent = safeAuthRedirect(params.get("redirect") || params.get("returnTo"));
    const { account, ready } = useCommerceAccount();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const busy = useRef(false);
    const request = useRef<AbortController | null>(null);
    useEffect(() => () => request.current?.abort(), []);
    const submit = async (event: React.FormEvent) => {
        event.preventDefault(); if (busy.current) return;
        const priorToken = localStorage.getItem("token");
        busy.current = true; setLoading(true); setError("");
        const controller = new AbortController(); request.current = controller;
        try {
            const response = await commerceJson<unknown>(await apiPost("/auth/login", { email: email.trim().toLowerCase(), password }, { skipAuth: true, retries: 0, timeout: 45000, signal: controller.signal }), "E-posta veya şifre doğrulanamadı.");
            if (controller.signal.aborted) return;
            if (localStorage.getItem("token") !== priorToken) throw new Error("Oturum bu sırada değişti. Devam etmeden sayfayı yenileyin.");
            const session = saveAuthSession(response); setPassword("");
            router.replace(afterAuthentication(session.user.role, intent));
        } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error && cause.name !== "TypeError" && cause.name !== "AbortError" ? cause.message : "Bağlantı kurulamadı. Bilgileriniz korunuyor; yeniden deneyebilirsiniz."); }
        finally { busy.current = false; if (!controller.signal.aborted) setLoading(false); }
    };
    return <AuthShell title="Giriş yap" description={intent?.startsWith("/cart") ? "Paket seçiminiz korunuyor. Sepetinize devam etmek için giriş yapın." : "Hesabınızla derslerinize ve siparişlerinize ulaşın."}>
        {!ready ? <Loader2 className="h-6 w-6 animate-spin" aria-label="Oturum kontrol ediliyor" /> : account ? <div className="space-y-4"><p className="text-sm">Bu tarayıcıda bir hesabınız açık.</p><Button className="w-full" onClick={() => router.replace(afterAuthentication(account.role, intent))}>Hesabımla devam et<ArrowRight className="h-4 w-4" /></Button><Button className="w-full" variant="outline" onClick={() => { clearAuthSession(); setPassword(""); setError(""); }}>Farklı hesapla giriş yap</Button></div> : <>
            <form onSubmit={submit} className="space-y-5"><fieldset disabled={loading} className="space-y-5">
                <div className="space-y-2"><Label htmlFor="login-email">E-posta</Label><Input id="login-email" type="email" autoComplete="username" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} /></div>
                <div className="space-y-2"><div className="flex justify-between gap-2"><Label htmlFor="login-password">Şifre</Label><Link className="text-xs text-atlas-blue underline" href={`/sifremi-unuttum${intent ? `?redirect=${encodeURIComponent(intent)}` : ""}`}>Şifremi unuttum</Link></div><div className="relative"><Input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" required maxLength={128} value={password} onChange={event => setPassword(event.target.value)} className="pr-11" /><button type="button" className="absolute right-3 top-3 text-muted-foreground" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
                {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
                <Button type="submit" className="w-full">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{loading ? "Giriş yapılıyor…" : intent?.startsWith("/cart") ? "Giriş yap ve sepete devam et" : "Giriş yap"}</Button>
            </fieldset></form><p className="mt-6 text-sm text-center text-muted-foreground">Henüz hesabınız yok mu? <Link href={authPageHref("register", intent)} className="font-semibold text-atlas-blue underline">Ücretsiz hesap oluştur</Link></p>
        </>}
    </AuthShell>;
}
export default function LoginPage() { return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}><LoginContent /></Suspense>; }
