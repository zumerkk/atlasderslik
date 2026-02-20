"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Laptop,
  BarChart3,
  Award,
  Users,
  BookOpen,
  Video,
  Star,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Crown,
  Loader2,
} from "lucide-react";

const features = [
  {
    icon: GraduationCap,
    title: "Uzman Öğretmenler",
    description: "Alanında uzman, deneyimli öğretmenlerle etkili ve kaliteli öğrenme deneyimi.",
    color: "bg-blue-100 text-atlas-blue",
  },
  {
    icon: Laptop,
    title: "Online Eğitim",
    description: "İstediğiniz zaman, istediğiniz yerden kaliteli eğitime kesintisiz erişim.",
    color: "bg-indigo-100 text-indigo-600",
  },
  {
    icon: BarChart3,
    title: "Kişisel Takip",
    description: "Gelişiminizi detaylı raporlarla takip edin, hedeflerinize adım adım ilerleyin.",
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    icon: Award,
    title: "Sertifikalı Program",
    description: "Tamamladığınız eğitim programları için geçerli başarı sertifikaları.",
    color: "bg-amber-100 text-amber-600",
  },
];

const stats = [
  { value: "500+", label: "Aktif Öğrenci", icon: Users },
  { value: "50+", label: "Uzman Öğretmen", icon: GraduationCap },
  { value: "1000+", label: "Video İçerik", icon: Video },
  { value: "4.9/5", label: "Memnuniyet", icon: Star },
];

const COLORS = [
  { color: "from-sky-500 to-blue-600" },
  { color: "from-teal-500 to-emerald-600" },
  { color: "from-blue-500 to-indigo-600" },
  { color: "from-amber-500 to-orange-600" },
];

const BADGE_STYLES: Record<string, string> = {
  VIP: "bg-gradient-to-r from-amber-500 to-orange-500",
  "En Popüler": "bg-gradient-to-r from-emerald-500 to-teal-500",
};

export default function Home() {
  const [homePackages, setHomePackages] = useState<any[]>([]);
  const [pkgLoading, setPkgLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/packages/active`, { cache: "no-store" });
        if (res.ok) { const data = await res.json(); setHomePackages(data.slice(0, 4)); }
      } catch { } finally { setPkgLoading(false); }
    })();
  }, []);
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />

      <main>
        {/* ========== HERO ========== */}
        <section className="relative overflow-hidden bg-gradient-to-br from-atlas-blue via-blue-600 to-atlas-indigo pt-32 pb-20 lg:pt-40 lg:pb-28">
          {/* Floating decorative blobs */}
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-white/5 blur-3xl animate-float" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-indigo-400/10 blur-3xl animate-float delay-300" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/3 blur-3xl" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm font-medium mb-8 animate-fade-in">
              <Sparkles className="h-4 w-4" />
              <span>2024-2025 Eğitim Dönemi Kayıtları Açık!</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6 animate-fade-in delay-100">
              Derslerde Kaybolma,
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">
                Atlas Derslik
              </span>{" "}
              Yanında!
            </h1>

            <p className="max-w-2xl mx-auto text-lg sm:text-xl text-white/80 leading-relaxed mb-10 animate-fade-in delay-200">
              Ortaokul müfredatına ve LGS&apos;ye yönelik haftalık canlı grup derslerimizde,
              uzman öğretmenlerle etkili öğrenme deneyimi yaşayın. Atlas Derslik ile
              öğrenmek artık çok daha etkili ve keyifli.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in delay-300">
              <Link href="/packages">
                <Button
                  size="lg"
                  className="bg-atlas-orange hover:bg-atlas-orange-dark text-white shadow-lg hover:shadow-xl transition-all text-base px-8 py-6 font-semibold"
                >
                  <BookOpen className="mr-2 h-5 w-5" />
                  Paketleri İncele
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white/30 text-white hover:bg-white hover:text-atlas-blue transition-all text-base px-8 py-6 font-semibold bg-white/5 backdrop-blur-sm"
                >
                  Hemen Başla
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ========== STATS BAR ========== */}
        <section className="relative -mt-12 z-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className={`bg-white rounded-2xl p-5 sm:p-6 shadow-lg border border-gray-100 text-center animate-fade-in-up delay-${(i + 1) * 100}`}
                  >
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-atlas-blue mb-3">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========== FEATURES ========== */}
        <section id="features" className="py-20 lg:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Neden Atlas Derslik?
              </h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                Başarınız için en iyi eğitim hizmetini sunuyoruz
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="group bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${feature.color} mb-5 group-hover:scale-110 transition-transform`}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========== POPULAR PACKAGES ========== */}
        <section id="packages" className="py-20 lg:py-28 bg-gray-50/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Eğitim Paketlerimiz
              </h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                Her öğrenciye uygun, sınırlı kontenjanlı paketler
              </p>
            </div>

            {pkgLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
            ) : homePackages.length === 0 ? (
              <p className="text-center text-gray-400 py-16">Paketler yakında eklenecek.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                {homePackages.map((pkg, idx) => {
                  const ci = COLORS[idx % COLORS.length];
                  const badgeStyle = BADGE_STYLES[pkg.badge] || BADGE_STYLES["En Popüler"];
                  return (
                    <div
                      key={pkg._id}
                      className="group relative bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
                    >
                      {pkg.badge && (
                        <div className="absolute top-3 right-3 z-10">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white rounded-full shadow-sm ${badgeStyle}`}>
                            {pkg.badge === "VIP" ? <Crown className="h-3 w-3" /> : <Star className="h-3 w-3" />}
                            {pkg.badge}
                          </span>
                        </div>
                      )}

                      <div className={`bg-gradient-to-r ${ci.color} px-5 py-4`}>
                        <h3 className="text-base font-bold text-white mb-2">{pkg.name}</h3>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-extrabold text-white">{pkg.price.toLocaleString("tr-TR")} TL</span>
                          <span className="text-white/70 text-xs font-medium">/ Ay</span>
                        </div>
                      </div>

                      {pkg.subtitle && (
                        <div className="px-5 pt-3 pb-1">
                          <p className="text-xs font-medium text-gray-500 bg-gray-50 rounded-md px-2.5 py-1.5 text-center">
                            {pkg.subtitle}
                          </p>
                        </div>
                      )}

                      <div className="px-5 py-3 flex-1">
                        <ul className="space-y-2">
                          {(pkg.features || []).slice(0, 3).map((feat: string, fi: number) => (
                            <li key={fi} className="flex items-start gap-2 text-sm text-gray-600">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="leading-snug">{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="px-5 pb-5">
                        <Link href="/packages">
                          <Button className={`w-full bg-gradient-to-r ${ci.color} hover:opacity-90 text-white py-4 text-sm font-semibold shadow-md transition-all`}>
                            Detayları Gör
                            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="text-center mt-10">
              <Link href="/packages">
                <Button variant="outline" size="lg" className="text-atlas-blue border-atlas-blue hover:bg-atlas-blue hover:text-white transition-all font-semibold">
                  Tüm Paketleri Detaylı İncele
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ========== CONTACT ========== */}
        <section id="contact" className="py-20 lg:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                İletişime Geçin
              </h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                Sorularınız mı var? Size yardımcı olmaktan memnuniyet duyarız.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Contact Info Cards */}
              <div className="group bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 text-atlas-blue mb-5 group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">E-posta</h3>
                <a href="mailto:info@atlasderslik.com" className="text-sm text-atlas-blue hover:underline">
                  info@atlasderslik.com
                </a>
              </div>

              <div className="group bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 mb-5 group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Telefon</h3>
                <a href="tel:+905461191009" className="text-sm text-emerald-600 hover:underline">
                  +90 546 119 10 09
                </a>
              </div>

              <div className="group bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 mb-5 group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Adres</h3>
                <p className="text-sm text-gray-500">
                  Ankara, Türkiye
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========== CTA ========== */}
        <section className="py-20 lg:py-28 bg-gray-50/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="bg-gradient-to-br from-atlas-blue via-blue-600 to-atlas-indigo rounded-3xl p-10 lg:p-16 relative overflow-hidden">
              {/* Decorative */}
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-indigo-400/10 blur-2xl" />

              <div className="relative">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Hemen Başlayın!
                </h2>
                <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
                  Size en uygun paketi seçin ve başarıya adım atın.
                  İlk dersiniz ücretsiz!
                </p>
                <Link href="/register">
                  <Button
                    size="lg"
                    className="bg-atlas-orange hover:bg-atlas-orange-dark text-white shadow-lg hover:shadow-xl transition-all text-base px-10 py-6 font-semibold"
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    Ücretsiz Kayıt Ol
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
