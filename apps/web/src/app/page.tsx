import Link from "next/link";
import Image from "next/image";
import { connection } from "next/server";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Button } from "@/components/ui/button";
import { HomePackages } from "@/components/home/home-packages";
import { ContactChannels } from "@/components/legal/contact-channels";
import { MerchantIdentity } from "@/components/commerce/merchant-identity";
import {
  GraduationCap,
  Laptop,
  BarChart3,
  BookOpen,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: GraduationCap,
    title: "Öğretmenle Çalışma",
    description: "Sınıfınıza atanmış öğretmenlerin yönettiği ders ve çalışmalar.",
    color: "bg-blue-100 text-atlas-blue",
  },
  {
    icon: Laptop,
    title: "Online Eğitim",
    description: "Ders programınıza ve erişim kapsamınıza uygun çevrim içi eğitim araçları.",
    color: "bg-indigo-100 text-indigo-600",
  },
  {
    icon: BarChart3,
    title: "Kişisel Takip",
    description: "Gelişiminizi detaylı raporlarla takip edin, hedeflerinize adım adım ilerleyin.",
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    icon: BookOpen,
    title: "Materyal ve Tekrar",
    description: "Öğretmeninizin paylaştığı, erişiminize açık materyal ve videolarla tekrar.",
    color: "bg-amber-100 text-amber-600",
  },
];

async function getPackages() {
  try {
    const configured = process.env.ATLAS_API_PROXY_URL || process.env.NEXT_PUBLIC_API_URL;
    const apiUrl = configured && /^https?:\/\//.test(configured) ? configured.replace(/\/$/, "") : "http://localhost:3001";
    const res = await fetch(`${apiUrl}/packages/active`, {
      cache: "no-store", signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.slice(0, 4) : [];
  } catch (error) {
    console.error("Failed to fetch packages from server:", error);
    return [];
  }
}

export default async function Home() {
  // Resolve the current catalogue per request; never freeze an empty catalogue
  // into the build when the API is sleeping or Next stops prerendering.
  await connection();
  const initialPackages = await getPackages();

  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />

      <main>
        {/* ========== HERO ========== */}
        <section className="relative overflow-hidden bg-gradient-to-br from-atlas-blue via-blue-600 to-atlas-indigo pt-32 pb-20 lg:pt-40 lg:pb-28">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-white/5 blur-3xl animate-float" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-indigo-400/10 blur-3xl animate-float delay-300" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/3 blur-3xl" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm font-medium mb-8 animate-fade-in">
                  <Sparkles className="h-4 w-4" />
                  <span>Dersler, içerikler ve takip tek hesapta</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6 animate-fade-in delay-100">
                  Derslerde Kaybolma,
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">
                    Atlas Derslik
                  </span>{" "}
                  Yanında!
                </h1>

                <p className="max-w-2xl mx-auto lg:mx-0 text-lg sm:text-xl text-white/80 leading-relaxed mb-10 animate-fade-in delay-200">
                  Ders programını, öğretmeninin paylaştığı içerikleri ve çalışmalarını
                  Atlas Derslik ile bir arada takip et. Sınıfına uygun paketin kapsamını
                  ve erişim süresini satın almadan önce incele.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-fade-in delay-300">
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

              <div className="hidden lg:block flex-shrink-0 animate-fade-in delay-300">
                <div className="relative">
                  <div className="absolute -inset-4 bg-white/10 rounded-full blur-2xl" />
                  <Image
                    src="/assets/images/deer-mascot.png"
                    alt="Atlas Derslik Maskotu"
                    width={320}
                    height={400}
                    className="relative drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                    priority
                  />
                </div>
              </div>
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
                Dersleri ve öğrenme sürecini takip etmek için çevrim içi araçlar
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {features.map((feature) => {
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
                Güncel açıklama, sınıf kapsamı, fiyat ve süre bilgileriyle paketleri inceleyin
              </p>
            </div>

            <HomePackages initialPackages={initialPackages} />

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

            <div className="mx-auto max-w-4xl space-y-5">
              <ContactChannels />
              <MerchantIdentity />
              <Link href="/iletisim" className="inline-block text-sm text-atlas-blue underline">İletişim ve başvuru bilgileri</Link>
            </div>
          </div>
        </section>

        {/* ========== CTA ========== */}
        <section className="py-20 lg:py-28 bg-gray-50/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="bg-gradient-to-br from-atlas-blue via-blue-600 to-atlas-indigo rounded-3xl p-10 lg:p-16 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-indigo-400/10 blur-2xl" />

              <div className="relative flex flex-col items-center">
                <Image
                  src="/assets/images/deer-mascot.png"
                  alt="Atlas Derslik Maskotu"
                  width={120}
                  height={150}
                  className="mb-6 drop-shadow-lg animate-bounce-slow"
                />
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Hemen Başlayın!
                </h2>
                <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
                  Hesap oluşturmak ücretsizdir. Ücretli ders erişimi için
                  seçtiğiniz paketin kapsamını, süresini ve toplam fiyatını inceleyin.
                </p>
                <Link href="/register">
                  <Button
                    size="lg"
                    className="bg-atlas-orange hover:bg-atlas-orange-dark text-white shadow-lg hover:shadow-xl transition-all text-base px-10 py-6 font-semibold"
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    Ücretsiz Hesap Oluştur
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
