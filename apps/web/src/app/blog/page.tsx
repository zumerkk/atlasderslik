import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { PenLine } from "lucide-react";

export default function BlogPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <PublicHeader />
            <main className="flex-1">
                <section className="bg-gradient-to-br from-atlas-blue via-blue-600 to-atlas-indigo pt-32 pb-16">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Blog</h1>
                        <p className="text-lg text-white/80 max-w-2xl mx-auto">
                            Eğitim dünyasındaki gelişmeler ve faydalı içerikler.
                        </p>
                    </div>
                </section>

                <section className="py-20">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm">
                            <div className="w-16 h-16 rounded-2xl bg-blue-100 text-atlas-blue flex items-center justify-center mb-6 mx-auto">
                                <PenLine className="h-8 w-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Yakında</h2>
                            <p className="text-gray-500">
                                Blog yazılarımız çok yakında burada yayınlanacak.
                                Eğitimle ilgili faydalı içerikler, LGS ipuçları ve
                                çalışma teknikleri hakkında yazılarımızı takip edin.
                            </p>
                        </div>
                    </div>
                </section>
            </main>
            <PublicFooter />
        </div>
    );
}
