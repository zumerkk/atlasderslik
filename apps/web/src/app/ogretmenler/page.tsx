import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { GraduationCap } from "lucide-react";

export default function OgretmenlerPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <PublicHeader />
            <main className="flex-1">
                <section className="bg-gradient-to-br from-atlas-blue via-blue-600 to-atlas-indigo pt-32 pb-16">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Öğretmenlerimiz</h1>
                        <p className="text-lg text-white/80 max-w-2xl mx-auto">
                            Alanında uzman, deneyimli öğretmen kadromuzla tanışın.
                        </p>
                    </div>
                </section>

                <section className="py-20">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="bg-white rounded-2xl p-8 lg:p-12 border border-gray-100 shadow-sm mb-8 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-blue-100 text-atlas-blue flex items-center justify-center mb-6 mx-auto">
                                <GraduationCap className="h-8 w-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Uzman Kadro</h2>
                            <p className="text-gray-600 leading-relaxed max-w-2xl mx-auto">
                                Atlas Derslik&apos;te tüm dersler, alanında uzmanlaşmış ve deneyimli
                                öğretmenler tarafından verilmektedir. Öğretmenlerimiz, ortaokul müfredatına
                                ve LGS sınavına hakim olup öğrencilerin bireysel gelişimini yakından
                                takip etmektedir.
                            </p>
                        </div>

                        <div className="bg-gray-50/80 rounded-2xl p-8 text-center">
                            <p className="text-gray-500">
                                Öğretmen kadromuz hakkında detaylı bilgi için bizimle iletişime geçebilirsiniz.
                            </p>
                            <a href="mailto:info@atlasderslik.com" className="inline-block mt-4 text-atlas-blue hover:underline font-medium">
                                info@atlasderslik.com
                            </a>
                        </div>
                    </div>
                </section>
            </main>
            <PublicFooter />
        </div>
    );
}
