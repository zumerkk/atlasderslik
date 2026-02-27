import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

export default function KullanimSartlariPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <PublicHeader />
            <main className="flex-1">
                <section className="bg-gradient-to-br from-atlas-blue via-blue-600 to-atlas-indigo pt-32 pb-16">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Kullanım Şartları</h1>
                        <p className="text-lg text-white/80 max-w-2xl mx-auto">
                            Son güncelleme: Şubat 2025
                        </p>
                    </div>
                </section>

                <section className="py-20">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="bg-white rounded-2xl p-8 lg:p-12 border border-gray-100 shadow-sm prose prose-gray max-w-none">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">1. Genel Hükümler</h2>
                            <p className="text-gray-600 mb-6">
                                Bu kullanım şartları, Atlas Derslik platformunu (&quot;Platform&quot;) kullanan tüm kullanıcılar
                                için geçerlidir. Platformu kullanarak bu şartları kabul etmiş sayılırsınız.
                            </p>

                            <h2 className="text-xl font-bold text-gray-900 mb-4">2. Hizmet Tanımı</h2>
                            <p className="text-gray-600 mb-6">
                                Atlas Derslik, ortaokul öğrencilerine yönelik online eğitim hizmeti sunan bir platformdur.
                                Canlı dersler, video içerikler, soru bankası ve ödev takibi gibi eğitim hizmetleri
                                sunulmaktadır.
                            </p>

                            <h2 className="text-xl font-bold text-gray-900 mb-4">3. Üyelik ve Hesap</h2>
                            <ul className="text-gray-600 mb-6 list-disc pl-5 space-y-2">
                                <li>Platforma kayıt olmak için doğru ve güncel bilgiler sağlanmalıdır.</li>
                                <li>Hesap bilgileri kişiseldir ve üçüncü kişilerle paylaşılmamalıdır.</li>
                                <li>18 yaşından küçük kullanıcılar, velilerinin onayıyla kayıt olabilir.</li>
                                <li>Hesap güvenliğinden kullanıcı sorumludur.</li>
                            </ul>

                            <h2 className="text-xl font-bold text-gray-900 mb-4">4. Ödeme ve İade</h2>
                            <ul className="text-gray-600 mb-6 list-disc pl-5 space-y-2">
                                <li>Paket satın alımları online ödeme yöntemiyle gerçekleştirilir.</li>
                                <li>Ödeme işlemleri güvenli altyapı üzerinden yapılmaktadır.</li>
                                <li>İade talepleri satın alma tarihinden itibaren 14 gün içinde yapılmalıdır.</li>
                                <li>Satın alınan hizmetin kullanılmış kısmı iade kapsamı dışındadır.</li>
                            </ul>

                            <h2 className="text-xl font-bold text-gray-900 mb-4">5. Fikri Mülkiyet</h2>
                            <p className="text-gray-600 mb-6">
                                Platformdaki tüm içerikler (videolar, dokümanlar, sorular, tasarımlar) Atlas Derslik&apos;e
                                aittir. İçeriklerin izinsiz kopyalanması, dağıtılması veya paylaşılması yasaktır.
                            </p>

                            <h2 className="text-xl font-bold text-gray-900 mb-4">6. Kullanıcı Sorumlulukları</h2>
                            <ul className="text-gray-600 mb-6 list-disc pl-5 space-y-2">
                                <li>Platform kurallarına ve eğitim etiğine uygun davranılmalıdır.</li>
                                <li>Diğer kullanıcılara saygılı olunmalıdır.</li>
                                <li>İçerikler yalnızca kişisel eğitim amaçlı kullanılmalıdır.</li>
                                <li>Platformun teknik altyapısına zarar verecek eylemlerden kaçınılmalıdır.</li>
                            </ul>

                            <h2 className="text-xl font-bold text-gray-900 mb-4">7. İletişim</h2>
                            <p className="text-gray-600">
                                Kullanım şartları hakkında sorularınız için{" "}
                                <a href="mailto:info@atlasderslik.com" className="text-atlas-blue hover:underline">
                                    info@atlasderslik.com
                                </a>{" "}
                                adresinden bizimle iletişime geçebilirsiniz.
                            </p>
                        </div>
                    </div>
                </section>
            </main>
            <PublicFooter />
        </div>
    );
}
