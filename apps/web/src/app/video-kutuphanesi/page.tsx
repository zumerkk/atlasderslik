import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Video, Search, Filter, BookOpen } from "lucide-react";

export default function VideoKutuphanesiPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <PublicHeader />
            <main className="flex-1">
                <section className="bg-gradient-to-br from-atlas-blue via-blue-600 to-atlas-indigo pt-32 pb-16">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Video Kütüphanesi</h1>
                        <p className="text-lg text-white/80 max-w-2xl mx-auto">
                            Tüm derslerin video kayıtlarına istediğiniz zaman erişin, tekrar tekrar izleyin.
                        </p>
                    </div>
                </section>

                <section className="py-20">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                                <div className="w-12 h-12 rounded-xl bg-blue-100 text-atlas-blue flex items-center justify-center mb-4">
                                    <Video className="h-6 w-6" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Zengin İçerik</h3>
                                <p className="text-sm text-gray-500">Tüm müfredat konularını kapsayan kapsamlı video ders arşivi.</p>
                            </div>
                            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                                    <Search className="h-6 w-6" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Kolay Erişim</h3>
                                <p className="text-sm text-gray-500">Ders, konu ve ünite bazlı arama ile istediğiniz videoya hızlıca ulaşın.</p>
                            </div>
                            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                                    <Filter className="h-6 w-6" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Sınıf Bazlı Filtreleme</h3>
                                <p className="text-sm text-gray-500">5, 6, 7 ve 8. sınıf seviyelerine göre videoları filtreleyin.</p>
                            </div>
                            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                                    <BookOpen className="h-6 w-6" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">LGS Odaklı</h3>
                                <p className="text-sm text-gray-500">LGS sınavına özel hazırlanmış konu anlatımları ve soru çözümleri.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <PublicFooter />
        </div>
    );
}
