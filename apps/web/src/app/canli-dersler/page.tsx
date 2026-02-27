import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Video, Clock, Users, BookOpen } from "lucide-react";

export default function CanliDerslerPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <PublicHeader />
            <main className="flex-1">
                <section className="bg-gradient-to-br from-atlas-blue via-blue-600 to-atlas-indigo pt-32 pb-16">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Canlı Dersler</h1>
                        <p className="text-lg text-white/80 max-w-2xl mx-auto">
                            Uzman öğretmenlerle haftalık canlı grup dersleri ile etkili öğrenme deneyimi yaşayın.
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
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">İnteraktif Dersler</h3>
                                <p className="text-sm text-gray-500">Öğretmenlerle birebir etkileşim kurarak sorularınızı anında sorabilirsiniz.</p>
                            </div>
                            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                                    <Clock className="h-6 w-6" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Esnek Program</h3>
                                <p className="text-sm text-gray-500">Haftalık ders programı ile düzenli ve planlı bir eğitim süreci.</p>
                            </div>
                            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                                    <Users className="h-6 w-6" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Küçük Gruplar</h3>
                                <p className="text-sm text-gray-500">Sınırlı kontenjanla her öğrenciye özel ilgi ve takip imkânı.</p>
                            </div>
                            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                                    <BookOpen className="h-6 w-6" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Ders Tekrarı</h3>
                                <p className="text-sm text-gray-500">Tüm canlı dersler kaydedilir ve istediğiniz zaman tekrar izleyebilirsiniz.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <PublicFooter />
        </div>
    );
}
