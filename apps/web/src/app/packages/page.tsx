"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AddToCartLink } from "@/components/commerce/add-to-cart-link";
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
import { apiGet } from "@/lib/api";
import { commerceJson, money } from "@/lib/commerce";
import { contactEmailHref, contactPhoneLabel, contactWhatsAppHref, usePublicContact } from "@/lib/public-contact";

interface Pkg {
    _id: string; name: string; description: string; subtitle: string;
    price: number; originalPrice?: number; features: string[]; badge: string; period: string;
}

const BADGE_STYLES: Record<string, string> = {
    "VIP": "bg-gradient-to-r from-amber-500 to-orange-500",
    "En Popüler": "bg-gradient-to-r from-emerald-500 to-teal-500",
    "Sınırlı Kontenjan": "bg-gradient-to-r from-rose-500 to-pink-500",
    "Yaz Kampı": "bg-gradient-to-r from-orange-500 to-amber-500",
};

const COLORS = [
    { color: "from-sky-500 to-blue-600", border: "border-sky-200" },
    { color: "from-teal-500 to-emerald-600", border: "border-emerald-200" },
    { color: "from-blue-500 to-indigo-600", border: "border-indigo-200" },
    { color: "from-amber-500 to-orange-600", border: "border-amber-200" },
];

const PERIOD_LABEL: Record<string, string> = { monthly: "/ Ay", yearly: "/ Yıl", "one-time": "Tek Sefer" };

export default function PackagesPublicPage() {
    const contact = usePublicContact();
    const [packages, setPackages] = useState<Pkg[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        void (async () => {
            try {
                const data = await commerceJson<Pkg[]>(await apiGet("/packages/active", { skipAuth: true, retries: 0, timeout: 45000, signal: controller.signal }), "Paketler alınamadı.");
                if (!Array.isArray(data)) throw new Error("Paket listesi doğrulanamadı.");
                if (!controller.signal.aborted) { setPackages(data); setError(false); }
            } catch { if (!controller.signal.aborted) setError(true); }
            finally { if (!controller.signal.aborted) setLoading(false); }
        })();
        return () => controller.abort();
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
                                    const originalPrice = pkg.originalPrice ?? 0;
                                    const hasDiscount = originalPrice > 0 && originalPrice > pkg.price;
                                    const features = Array.isArray(pkg.features) ? pkg.features : [];
                                    const hasFeatures = features.length > 0;
                                    return (
                                        <div key={pkg._id} className={`group relative bg-white rounded-2xl border-2 ${ci.border} shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col overflow-hidden`}>

                                            {/* Header gradient strip */}
                                            <div className={`bg-gradient-to-r ${ci.color} px-6 py-5`}>
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className="text-lg font-bold text-white leading-tight">{pkg.name}</h3>
                                                    {pkg.badge && (
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-white rounded-full shadow-sm shrink-0 ${badgeStyle}`}>
                                                            {pkg.badge === "VIP" ? <Crown className="h-3 w-3" /> : <Star className="h-3 w-3" />}
                                                            {pkg.badge}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-baseline gap-2 mt-3">
                                                    {hasDiscount && (
                                                        <span className="text-lg font-semibold text-white/50 line-through">{money(originalPrice)}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-3xl font-extrabold text-white">{money(pkg.price)}</span>
                                                    <span className="text-white/70 text-sm font-medium">{PERIOD_LABEL[pkg.period] || "/ Ay"}</span>
                                                </div>
                                                {hasDiscount && (
                                                    <div className="mt-2">
                                                        <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
                                                            %{Math.round(((originalPrice - pkg.price) / originalPrice) * 100)} indirim
                                                        </span>
                                                    </div>
                                                )}
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
                                            {hasFeatures && <div className="px-6 py-4 flex-1">
                                                <ul className="space-y-3">
                                                    {features.map((feat, fi) => (
                                                        <li key={fi} className="flex items-start gap-2.5 text-sm text-gray-600">
                                                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                                            <span className="leading-snug">{feat}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>}

                                            {/* CTA */}
                                            <div className="px-6 pb-6 mt-auto">
                                                <AddToCartLink packageId={pkg._id} className={`w-full bg-gradient-to-r ${ci.color} hover:opacity-90 text-white py-5 font-semibold shadow-md hover:shadow-lg transition-all`}>Sepete ekle<ArrowRight className="ml-2 h-4 w-4" /></AddToCartLink><Link href={`/packages/${encodeURIComponent(pkg._id)}`} className="block text-center text-sm font-medium text-atlas-blue mt-3 underline">Paket ayrıntıları</Link>
                                                <a href={contactWhatsAppHref(contact, `Merhaba, "${pkg.name}" paketi hakkında bilgi almak istiyorum.`)} target="_blank" rel="noopener noreferrer" className="block text-center text-sm text-gray-500 underline mt-3">Satın almadan önce bilgi al</a>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="mt-12 text-center">
                            <p className="text-sm text-gray-500 max-w-2xl mx-auto">
                                Paket dönemi her kartta belirtilir. Satın alma tek çekimdir; otomatik yenileme yapılmaz. Güncel tutar ve öğrenciye uygunluk ödeme sayfasında yeniden doğrulanır.
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
                                    <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 transition-all">
                                        <Phone className="h-4 w-4" />{contactPhoneLabel(contact.phone)}
                                    </a>
                                    <a href="https://instagram.com/atlasderslik" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 transition-all">
                                        <AtSign className="h-4 w-4" />@atlasderslik
                                    </a>
                                    <a href={contactEmailHref(contact)} className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 transition-all">
                                        <Mail className="h-4 w-4" />{contact.email}
                                    </a>
                                </div>

                                <Button asChild size="lg" className="bg-atlas-orange hover:bg-atlas-orange-dark text-white shadow-lg hover:shadow-xl transition-all text-base px-10 py-6 font-semibold">
                                    <a href={contactWhatsAppHref(contact, "Merhaba, Atlas Derslik paketleri ve kayıt süreci hakkında bilgi almak istiyorum.")} target="_blank" rel="noopener noreferrer"><Sparkles className="mr-2 h-5 w-5" />Ücretsiz Danışmanlık Al</a>
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <PublicFooter />
        </div>
    );
}
