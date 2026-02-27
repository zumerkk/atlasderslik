import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { GraduationCap, Target, Heart, MapPin } from "lucide-react";

export default function HakkimizdaPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <PublicHeader />
            <main className="flex-1">
                <section className="bg-gradient-to-br from-atlas-blue via-blue-600 to-atlas-indigo pt-32 pb-16">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Hakkımızda</h1>
                        <p className="text-lg text-white/80 max-w-2xl mx-auto">
                            Atlas Derslik olarak ortaokul öğrencilerine kaliteli ve erişilebilir eğitim sunuyoruz.
                        </p>
                    </div>
                </section>

                <section className="py-20">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="prose prose-lg max-w-none">
                            <div className="bg-white rounded-2xl p-8 lg:p-12 border border-gray-100 shadow-sm mb-8">
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">Biz Kimiz?</h2>
                                <p className="text-gray-600 leading-relaxed mb-4">
                                    Atlas Derslik, Antalya/Gazipaşa merkezli bir online eğitim platformudur.
                                    Ortaokul müfredatına ve LGS sınavına yönelik haftalık canlı grup dersleri sunarak
                                    öğrencilerin akademik başarılarını artırmayı hedefliyoruz.
                                </p>
                                <p className="text-gray-600 leading-relaxed">
                                    Alanında uzman öğretmen kadromuzla, her öğrencinin bireysel ihtiyaçlarına
                                    uygun, etkileşimli ve kaliteli bir eğitim deneyimi sağlıyoruz.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-atlas-blue flex items-center justify-center mb-4">
                                        <Target className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Misyonumuz</h3>
                                    <p className="text-sm text-gray-500">
                                        Her öğrenciye eşit ve kaliteli eğitim fırsatı sunarak akademik
                                        başarılarını en üst seviyeye taşımak.
                                    </p>
                                </div>
                                <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                                        <GraduationCap className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Vizyonumuz</h3>
                                    <p className="text-sm text-gray-500">
                                        Türkiye&apos;nin en güvenilir ve tercih edilen online ortaokul
                                        eğitim platformu olmak.
                                    </p>
                                </div>
                                <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                                    <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                                        <Heart className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Değerlerimiz</h3>
                                    <p className="text-sm text-gray-500">
                                        Kalite, güven, şeffaflık ve öğrenci odaklı yaklaşım
                                        temel değerlerimizdir.
                                    </p>
                                </div>
                                <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                                        <MapPin className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Konumumuz</h3>
                                    <p className="text-sm text-gray-500">
                                        Antalya/Gazipaşa merkezli olarak tüm Türkiye&apos;ye online
                                        eğitim hizmeti sunuyoruz.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <PublicFooter />
        </div>
    );
}
