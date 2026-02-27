"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { GraduationCap, ArrowRight, Eye, EyeOff, Loader2, Users, AlertCircle } from "lucide-react";

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "STUDENT",
        grade: 5,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (formData.password.length < 6) {
            setError("Şifre en az 6 karakter olmalıdır.");
            setLoading(false);
            return;
        }

        try {
            const body: any = { ...formData };
            if (formData.role !== "STUDENT") delete body.grade;

            const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                router.push("/login");
            } else {
                const data = await res.json();
                if (data.message?.includes("duplicate") || data.message?.includes("E11000")) {
                    setError("Bu e-posta adresi zaten kayıtlı.");
                } else {
                    setError(data.message || "Kayıt başarısız.");
                }
            }
        } catch (err) {
            console.error("Register error", err);
            setError("Sunucuya bağlanılamadı. Lütfen tekrar deneyin.");
        } finally {
            setLoading(false);
        }
    };

    // Password strength
    const getPasswordStrength = (pw: string) => {
        if (!pw) return { level: 0, label: "", color: "" };
        let score = 0;
        if (pw.length >= 6) score++;
        if (pw.length >= 8) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        if (score <= 2) return { level: score, label: "Zayıf", color: "bg-red-400" };
        if (score <= 3) return { level: score, label: "Orta", color: "bg-yellow-400" };
        return { level: score, label: "Güçlü", color: "bg-emerald-400" };
    };

    const strength = getPasswordStrength(formData.password);

    return (
        <div className="flex min-h-screen">
            {/* Left Brand Panel */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-atlas-blue via-blue-600 to-atlas-indigo">
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
                        Eğitim yolculuğunuza bugün başlayın. Uzman öğretmenlerle LGS hedeflerinize ulaşın.
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
                            <h2 className="text-2xl font-bold text-gray-900">Kayıt Ol</h2>
                            <p className="text-sm text-gray-500 mt-2">
                                Yeni bir hesap oluşturun
                            </p>
                        </div>

                        <form onSubmit={handleRegister} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                                        Ad
                                    </Label>
                                    <Input
                                        id="firstName"
                                        placeholder="Adınız"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        required
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                                        Soyad
                                    </Label>
                                    <Input
                                        id="lastName"
                                        placeholder="Soyadınız"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        required
                                        className="h-11"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                                    E-posta
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="ornek@email.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                                    Şifre
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        className="h-11 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {/* Password strength */}
                                {formData.password && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="flex-1 flex gap-1">
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <div
                                                    key={i}
                                                    className={`h-1 flex-1 rounded-full transition-colors ${i <= strength.level ? strength.color : "bg-gray-200"
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-xs text-gray-500">{strength.label}</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="role" className="text-sm font-medium text-gray-700">
                                    Hesap Türü
                                </Label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(val) => setFormData({ ...formData, role: val })}
                                >
                                    <SelectTrigger id="role" className="h-11">
                                        <SelectValue placeholder="Seçiniz" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="STUDENT">
                                            <div className="flex items-center gap-2">
                                                <GraduationCap className="h-4 w-4" />
                                                Öğrenci
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="TEACHER">
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4" />
                                                Öğretmen
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="PARENT">
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4" />
                                                Veli
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.role === "STUDENT" && (
                                <div className="space-y-2">
                                    <Label htmlFor="grade" className="text-sm font-medium text-gray-700">
                                        Sınıf
                                    </Label>
                                    <Select
                                        value={String(formData.grade)}
                                        onValueChange={(val) => setFormData({ ...formData, grade: Number(val) })}
                                    >
                                        <SelectTrigger id="grade" className="h-11">
                                            <SelectValue placeholder="Sınıf seçin" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="5">5. Sınıf</SelectItem>
                                            <SelectItem value="6">6. Sınıf</SelectItem>
                                            <SelectItem value="7">7. Sınıf</SelectItem>
                                            <SelectItem value="8">8. Sınıf</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {error && (
                                <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700 flex items-center gap-2 animate-toast-in">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <span>{error}</span>
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
                                        Kayıt olunuyor...
                                    </>
                                ) : (
                                    <>
                                        Kayıt Ol
                                        <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center text-sm text-gray-500">
                            Zaten hesabınız var mı?{" "}
                            <Link
                                href="/login"
                                className="text-atlas-blue hover:underline font-semibold"
                            >
                                Giriş Yap
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
