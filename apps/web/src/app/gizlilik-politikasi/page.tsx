import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

export default function GizlilikPolitikasiPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <PublicHeader />
            <main className="flex-1">
                <section className="bg-gradient-to-br from-atlas-blue via-blue-600 to-atlas-indigo pt-32 pb-16">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Gizlilik Politikası</h1>
                        <p className="text-lg text-white/80 max-w-2xl mx-auto">
                            Son güncelleme: Şubat 2025
                        </p>
                    </div>
                </section>

                <section className="py-20">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="bg-white rounded-2xl p-8 lg:p-12 border border-gray-100 shadow-sm prose prose-gray max-w-none">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">1. Genel Bilgilendirme</h2>
                            <p className="text-gray-600 mb-6">
                                Atlas Derslik (&quot;Platform&quot;) olarak kişisel verilerinizin korunmasına büyük önem veriyoruz.
                                Bu gizlilik politikası, platformumuzu kullanırken toplanan, işlenen ve saklanan
                                kişisel verileriniz hakkında sizi bilgilendirmek amacıyla hazırlanmıştır.
                            </p>

                            <h2 className="text-xl font-bold text-gray-900 mb-4">2. Toplanan Veriler</h2>
                            <p className="text-gray-600 mb-4">Platformumuz aşağıdaki kişisel verileri toplayabilir:</p>
                            <ul className="text-gray-600 mb-6 list-disc pl-5 space-y-2">
                                <li>Ad, soyad ve iletişim bilgileri (e-posta, telefon)</li>
                                <li>Eğitim bilgileri (sınıf, okul)</li>
                                <li>Ders katılım ve performans verileri</li>
                                <li>Ödeme bilgileri (ödeme hizmet sağlayıcısı aracılığıyla)</li>
                                <li>Cihaz ve oturum bilgileri</li>
                            </ul>

                            <h2 className="text-xl font-bold text-gray-900 mb-4">3. Verilerin Kullanım Amacı</h2>
                            <p className="text-gray-600 mb-4">Toplanan veriler aşağıdaki amaçlarla kullanılmaktadır:</p>
                            <ul className="text-gray-600 mb-6 list-disc pl-5 space-y-2">
                                <li>Eğitim hizmetinin sunulması ve iyileştirilmesi</li>
                                <li>Öğrenci performansının takibi ve raporlanması</li>
                                <li>Ödeme işlemlerinin gerçekleştirilmesi</li>
                                <li>İletişim ve bilgilendirme</li>
                                <li>Yasal yükümlülüklerin yerine getirilmesi</li>
                            </ul>

                            <h2 className="text-xl font-bold text-gray-900 mb-4">4. Verilerin Paylaşılması</h2>
                            <p className="text-gray-600 mb-6">
                                Kişisel verileriniz, yasal zorunluluklar dışında üçüncü taraflarla paylaşılmaz.
                                Ödeme işlemleri için güvenli ödeme altyapı sağlayıcıları kullanılmaktadır.
                            </p>

                            <h2 className="text-xl font-bold text-gray-900 mb-4">5. Veri Güvenliği</h2>
                            <p className="text-gray-600 mb-6">
                                Kişisel verilerinizin güvenliğini sağlamak için endüstri standardı güvenlik
                                önlemleri uygulanmaktadır. Veriler şifreli bağlantılar üzerinden iletilmekte
                                ve güvenli sunucularda saklanmaktadır.
                            </p>

                            <h2 className="text-xl font-bold text-gray-900 mb-4">6. İletişim</h2>
                            <p className="text-gray-600">
                                Gizlilik politikamız hakkında sorularınız için{" "}
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
