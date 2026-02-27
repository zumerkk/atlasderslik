import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

export default function KVKKPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <PublicHeader />
            <main className="flex-1">
                <section className="bg-gradient-to-br from-atlas-blue via-blue-600 to-atlas-indigo pt-32 pb-16">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">KVKK Aydınlatma Metni</h1>
                        <p className="text-lg text-white/80 max-w-2xl mx-auto">
                            6698 Sayılı Kişisel Verilerin Korunması Kanunu Kapsamında Aydınlatma Metni
                        </p>
                    </div>
                </section>

                <section className="py-20">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="bg-white rounded-2xl p-8 lg:p-12 border border-gray-100 shadow-sm prose prose-gray max-w-none">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">1. Veri Sorumlusu</h2>
                            <p className="text-gray-600 mb-6">
                                6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) kapsamında,
                                kişisel verileriniz veri sorumlusu sıfatıyla Atlas Derslik tarafından
                                aşağıda açıklanan amaçlar doğrultusunda işlenmektedir.
                            </p>

                            <h2 className="text-xl font-bold text-gray-900 mb-4">2. İşlenen Kişisel Veriler</h2>
                            <p className="text-gray-600 mb-4">Platformumuz kapsamında aşağıdaki kişisel veriler işlenmektedir:</p>
                            <ul className="text-gray-600 mb-6 list-disc pl-5 space-y-2">
                                <li><strong>Kimlik Bilgileri:</strong> Ad, soyad</li>
                                <li><strong>İletişim Bilgileri:</strong> E-posta adresi, telefon numarası</li>
                                <li><strong>Eğitim Bilgileri:</strong> Sınıf düzeyi, ders katılım bilgileri, performans verileri</li>
                                <li><strong>İşlem Güvenliği:</strong> IP adresi, giriş/çıkış kayıtları</li>
                                <li><strong>Finansal Bilgiler:</strong> Ödeme kayıtları (ödeme aracı bilgileri saklanmaz)</li>
                            </ul>

                            <h2 className="text-xl font-bold text-gray-900 mb-4">3. Verilerin İşlenme Amaçları</h2>
                            <ul className="text-gray-600 mb-6 list-disc pl-5 space-y-2">
                                <li>Eğitim hizmetlerinin sunulması ve yürütülmesi</li>
                                <li>Öğrenci ve veli hesaplarının oluşturulması ve yönetimi</li>
                                <li>Ders programı ve içerik yönetimi</li>
                                <li>Performans değerlendirme ve raporlama</li>
                                <li>Ödeme ve faturalandırma işlemleri</li>
                                <li>Yasal yükümlülüklerin yerine getirilmesi</li>
                                <li>Platformun güvenliğinin sağlanması</li>
                            </ul>

                            <h2 className="text-xl font-bold text-gray-900 mb-4">4. Verilerin Aktarılması</h2>
                            <p className="text-gray-600 mb-6">
                                Kişisel verileriniz, yasal yükümlülükler ve hizmet gereksinimleri doğrultusunda
                                yalnızca ödeme hizmet sağlayıcıları ve yasal merciler ile paylaşılabilir.
                                Verileriniz yurt dışına aktarılmamaktadır.
                            </p>

                            <h2 className="text-xl font-bold text-gray-900 mb-4">5. Veri Saklama Süresi</h2>
                            <p className="text-gray-600 mb-6">
                                Kişisel verileriniz, işlenme amacının gerektirdiği süre boyunca ve yasal
                                saklama süreleri dahilinde muhafaza edilmektedir.
                            </p>

                            <h2 className="text-xl font-bold text-gray-900 mb-4">6. Haklarınız (KVKK m.11)</h2>
                            <p className="text-gray-600 mb-4">KVKK&apos;nın 11. maddesi kapsamında aşağıdaki haklara sahipsiniz:</p>
                            <ul className="text-gray-600 mb-6 list-disc pl-5 space-y-2">
                                <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
                                <li>İşlenmişse buna ilişkin bilgi talep etme</li>
                                <li>İşlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme</li>
                                <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
                                <li>Eksik veya yanlış işlenmiş olması halinde düzeltilmesini isteme</li>
                                <li>Kanun&apos;da öngörülen şartlar çerçevesinde silinmesini isteme</li>
                                <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
                                <li>Kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme</li>
                            </ul>

                            <h2 className="text-xl font-bold text-gray-900 mb-4">7. Başvuru</h2>
                            <p className="text-gray-600">
                                KVKK kapsamındaki haklarınızı kullanmak için{" "}
                                <a href="mailto:info@atlasderslik.com" className="text-atlas-blue hover:underline">
                                    info@atlasderslik.com
                                </a>{" "}
                                adresine yazılı olarak başvurabilirsiniz. Başvurularınız en geç 30 gün
                                içinde ücretsiz olarak yanıtlanacaktır.
                            </p>
                        </div>
                    </div>
                </section>
            </main>
            <PublicFooter />
        </div>
    );
}
