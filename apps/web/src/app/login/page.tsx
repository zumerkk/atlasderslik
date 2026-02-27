"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { GraduationCap, ArrowRight, Eye, EyeOff, Loader2, AlertCircle, RefreshCw, Wifi } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isColdStart, setIsColdStart] = useState(false);

    const handleLogin = useCallback(async (e?: React.FormEvent) => {
        e?.preventDefault();
        setLoading(true);
        setError("");
        setIsColdStart(false);

        const timeout = 15000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem("token", data.access_token);
                localStorage.setItem("user", JSON.stringify(data.user));

                const role = data.user.role;
                if (role === "ADMIN") router.push("/admin");
                else if (role === "STUDENT") router.push("/student");
                else if (role === "TEACHER") router.push("/teacher");
                else if (role === "PARENT") router.push("/parent");
                else router.push("/");
            } else {
                setError("Giriş başarısız. Lütfen bilgilerinizi kontrol edin.");
            }
        } catch (err: any) {
            clearTimeout(timeoutId);
            if (err?.name === "AbortError") {
                setIsColdStart(true);
                setError("Sunucu uyanıyor, lütfen birkaç saniye bekleyip tekrar deneyin.");
            } else {
                setIsColdStart(true);
                setError("Sunucuya bağlanılamadı. Sunucu şu anda başlatılıyor olabilir.");
            }
        } finally {
            setLoading(false);
        }
    }, [email, password, router]);

    return (
        <div className="flex min-h-screen">
            {/* Left Brand Panel */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-atlas-blue via-blue-600 to-atlas-indigo">
                {/* Decorative blobs */}
                <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-white/5 blur-3xl animate-float" />
                <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-indigo-400/10 blur-3xl animate-float delay-300" />

                <div className="relative flex flex-col items-center justify-center w-full px-12">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-8 animate-fade-in">
                        <GraduationCap className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-white text-center mb-4 animate-fade-in delay-100">
                        Atlas Derslik
                    </h1>
                    <p className="text-lg text-white/70 text-center max-w-md animate-fade-in delay-200">
                        Ortaokul ve LGS hazırlığında uzman öğretmenlerle etkili öğrenme deneyimi
                    </p>

                </div>
            </div>

            {/* Right Form Panel */}
            <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gray-50">
                <div className="w-full max-w-md animate-fade-in">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center justify-center gap-2.5 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-atlas-blue to-atlas-indigo flex items-center justify-center">
                            <GraduationCap className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-gray-900">Atlas Derslik</span>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900">Giriş Yap</h2>
                            <p className="text-sm text-gray-500 mt-2">
                                E-posta ve şifrenizle hesabınıza erişin
                            </p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                                    E-posta
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="ornek@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                                        Şifre
                                    </Label>
                                    <button
                                        type="button"
                                        className="text-xs text-atlas-blue hover:underline font-medium"
                                    >
                                        Şifremi Unuttum
                                    </button>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="h-11 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className={`rounded-xl px-4 py-3 text-sm flex items-start gap-2 animate-toast-in ${isColdStart
                                    ? "bg-amber-50 border border-amber-200 text-amber-700"
                                    : "bg-rose-50 border border-rose-200 text-rose-700"
                                    }`}>
                                    {isColdStart ? (
                                        <Wifi className="h-4 w-4 shrink-0 mt-0.5 animate-pulse" />
                                    ) : (
                                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                    )}
                                    <div className="flex-1">
                                        <span>{error}</span>
                                        {isColdStart && (
                                            <button
                                                type="button"
                                                onClick={() => handleLogin()}
                                                className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-800 hover:text-amber-900"
                                            >
                                                <RefreshCw className="h-3 w-3" />
                                                Tekrar Dene
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <Button
                                className="w-full h-11 bg-atlas-blue hover:bg-atlas-blue-dark text-white font-semibold shadow-sm"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Giriş yapılıyor...
                                    </>
                                ) : (
                                    <>
                                        Giriş Yap
                                        <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center text-sm text-gray-500">
                            Hesabınız yok mu?{" "}
                            <Link
                                href="/register"
                                className="text-atlas-blue hover:underline font-semibold"
                            >
                                Kayıt Ol
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
