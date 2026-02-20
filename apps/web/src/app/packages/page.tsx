"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Button } from "@/components/ui/button";
import {
    ArrowRight,
    CheckCircle2,
    Sparkles,
    Crown,
    Star,
    Phone,
    Mail,
    AtSign,
    BookOpen,
    Loader2,
} from "lucide-react";

interface Pkg {
    _id: string; name: string; description: string; subtitle: string;
    price: number; features: string[]; badge: string; period: string;
}

const BADGE_STYLES: Record<string, string> = {
    "VIP": "bg-gradient-to-r from-amber-500 to-orange-500",
    "En Popüler": "bg-gradient-to-r from-emerald-500 to-teal-500",
};

const COLORS = [
    { color: "from-sky-500 to-blue-600", border: "border-sky-200" },
    { color: "from-teal-500 to-emerald-600", border: "border-emerald-200" },
    { color: "from-blue-500 to-indigo-600", border: "border-indigo-200" },
    { color: "from-amber-500 to-orange-600", border: "border-amber-200" },
];

const PERIOD_LABEL: Record<string, string> = { monthly: "/ Ay", yearly: "/ Yıl", "one-time": "Tek Sefer" };

export default function PackagesPublicPage() {
    const [packages, setPackages] = useState<Pkg[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/packages/active`, { cache: "no-store" });
                if (res.ok) setPackages(await res.json());
                else setError(true);
            } catch { setError(true); }
            finally { setLoading(false); }
        })();
    }, []);

    return (
        <div className="flex flex-col min-h-screen">
            <PublicHeader />

            <main>
                {/* Hero */}
                <section className="relative overflow-hidden bg-gradient-to-br from-atlas-blue via-blue-600 to-atlas-indigo pt-32 pb-16 lg:pt-40 lg:pb-24">
                    <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-white/5 blur-3xl animate-float" />
                    <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-indigo-400/10 blur-3xl animate-float delay-300" />

                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm font-medium mb-8 animate-fade-in">
                            <Sparkles className="h-4 w-4" />
                            <span>Her Öğrenciye Uygun, Sınırlı Kontenjanlı</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6 animate-fade-in delay-100">
                            Derslerde Kaybolma,
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">
                                Atlas Derslik
                            </span>{" "}
                            Yanında!
                        </h1>
                        <p className="max-w-2xl mx-auto text-lg text-white/80 leading-relaxed animate-fade-in delay-200">
                            İhtiyacınıza en uygun paketi seçin, uzman öğretmenlerle LGS ve ortaokul eğitiminize hemen başlayın.
                        </p>
                    </div>
                </section>

                {/* Packages Grid */}
                <section className="py-16 lg:py-24 bg-gray-50/50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            </div>
                        ) : error ? (
                            <div className="text-center py-20">
                                <p className="text-lg text-gray-500">Paketler yüklenirken bir hata oluştu.</p>
                                <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Tekrar Dene</Button>
                            </div>
                        ) : packages.length === 0 ? (
                            <div className="text-center py-20">
                                <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                                <p className="text-lg text-gray-500">Henüz aktif paket bulunmuyor.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-5">
                                {packages.map((pkg, idx) => {
                                    const ci = COLORS[idx % COLORS.length];
                                    const badgeStyle = BADGE_STYLES[pkg.badge] || BADGE_STYLES["En Popüler"];
                                    return (
                                        <div key={pkg._id} className={`group relative bg-white rounded-2xl border-2 ${ci.border} shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col overflow-hidden`}>
                                            {pkg.badge && (
                                                <div className="absolute top-4 right-4 z-10">
                                                    <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-white rounded-full shadow-sm ${badgeStyle}`}>
                                                        {pkg.badge === "VIP" ? <Crown className="h-3 w-3" /> : <Star className="h-3 w-3" />}
                                                        {pkg.badge}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Header gradient strip */}
                                            <div className={`bg-gradient-to-r ${ci.color} px-6 py-5`}>
                                                <h3 className="text-lg font-bold text-white leading-tight mb-3">{pkg.name}</h3>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-3xl font-extrabold text-white">{pkg.price.toLocaleString("tr-TR")} TL</span>
                                                    <span className="text-white/70 text-sm font-medium">{PERIOD_LABEL[pkg.period] || "/ Ay"}</span>
                                                </div>
                                            </div>

                                            {/* Subtitle */}
                                            {pkg.subtitle && (
                                                <div className="px-6 pt-4 pb-2">
                                                    <p className="text-xs font-semibold text-gray-500 bg-gray-50 rounded-lg px-3 py-2 text-center">
                                                        {pkg.subtitle}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Features */}
                                            <div className="px-6 py-4 flex-1">
                                                <ul className="space-y-3">
                                                    {(pkg.features || []).map((feat, fi) => (
                                                        <li key={fi} className="flex items-start gap-2.5 text-sm text-gray-600">
                                                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                                            <span className="leading-snug">{feat}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* CTA */}
                                            <div className="px-6 pb-6">
                                                <Link href="/register">
                                                    <Button className={`w-full bg-gradient-to-r ${ci.color} hover:opacity-90 text-white py-5 font-semibold shadow-md hover:shadow-lg transition-all`}>
                                                        Hemen Başla
                                                        <ArrowRight className="ml-2 h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="mt-12 text-center">
                            <p className="text-sm text-gray-500 max-w-2xl mx-auto">
                                Tüm paketler aylık ödeme ile sunulmaktadır. Dönemlik veya yıllık ödeme seçenekleri için bizimle iletişime geçin.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Contact CTA */}
                <section className="py-16 lg:py-20">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="bg-gradient-to-br from-atlas-blue via-blue-600 to-atlas-indigo rounded-3xl p-8 lg:p-14 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
                            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-indigo-400/10 blur-2xl" />

                            <div className="relative text-center">
                                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                                    Hemen İletişime Geçin
                                </h2>
                                <p className="text-base text-white/80 mb-8 max-w-xl mx-auto">
                                    Size en uygun paketi birlikte belirleyelim. Ücretsiz danışmanlık için arayın.
                                </p>

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                                    <a href="tel:+905461191009" className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 transition-all">
                                        <Phone className="h-4 w-4" />+90 546 119 10 09
                                    </a>
                                    <a href="https://instagram.com/atlasderslik" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 transition-all">
                                        <AtSign className="h-4 w-4" />@atlasderslik
                                    </a>
                                    <a href="mailto:info@atlasderslik.com" className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 transition-all">
                                        <Mail className="h-4 w-4" />atlasderslik.com
                                    </a>
                                </div>

                                <Link href="/register">
                                    <Button size="lg" className="bg-atlas-orange hover:bg-atlas-orange-dark text-white shadow-lg hover:shadow-xl transition-all text-base px-10 py-6 font-semibold">
                                        <Sparkles className="mr-2 h-5 w-5" />Ücretsiz Kayıt Ol
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <PublicFooter />
        </div>
    );
}
