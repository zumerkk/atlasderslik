"use client";

import { useState } from "react";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { ChevronDown } from "lucide-react";

const faqItems = [
    { question: "Atlas Derslik nedir?", answer: "Öğrenci, öğretmen ve velinin çevrim içi ders programı, yüklenmiş içerik, ödev ve test çalışmalarını takip edebildiği eğitim platformudur. Kullanılan özellikler, sınıf erişimine ve paket kapsamına bağlıdır." },
    { question: "Hangi sınıf ve dersler için paket var?", answer: "Güncel seçenekler Paketler sayfasındadır. Her paketin detayında açıklaması, dâhil özellikleri ve geçerli sınıfları gösterilir. Öğrencinin güncel sınıfına uygunluğu sepette tekrar kontrol edilir; her paketin bütün dersleri kapsadığı varsayılmamalıdır." },
    { question: "Canlı derslere nasıl katılırım?", answer: "Öğrenci hesabındaki ders programından, yetkiniz olan dersin katılım bağlantısını açabilirsiniz. Uygun cihaz ve internet bağlantısı gerekir. Ders saati ve erişim, öğrencinin sınıfına ve programına göre belirlenir." },
    { question: "Kaçırdığım her dersin kaydı var mı?", answer: "Yalnız öğretmenin sisteme yüklediği ve size erişim verilmiş videolar izlenebilir. Her canlı ders otomatik kaydedilmez. Süreli paket bittikten sonra o pakete dayalı video erişimi de sona erer." },
    { question: "Ödeme ve kullanım süresi nasıl?", answer: "Mevcut kart akışı tek çekimdir; otomatik yenileme yoktur. Aylık paket doğrulanmış ödeme tarihinden bir takvim ayı, yıllık paket 12 takvim ayı sürer. Tek seferlik paket, satın alınan sınıf kapsamında süre sonu tanımlanmadan erişim sağlar. Sonraki sınıflar ayrıca kapsamda olmalıdır. Ödeme seçeneğinin kullanılabilirliği sepette gösterilir." },
    { question: "Ödeme yaptım, erişimim neden açılmadı?", answer: "Erişim için ödemenin doğrulanması ve öğrenciye paket sınıf kaydının tamamlanması gerekir. Siparişinizin ödeme ve erişim durumunu kontrol edin. Ödeme doğrulandığı hâlde erişim açılmadıysa sipariş numaranızla destek kanallarına yazın." },
    { question: "Veli olarak satın alabilir miyim?", answer: "Veli hesabı üzerinden, hesabınıza bağlı uygun öğrenciyi seçerek işlem yapabilirsiniz. Öğrenci bağlantısı yoksa satın almadan önce kurumla iletişime geçin. Hesap açılması tek başına ücretli eğitim erişimi sağlamaz." },
    { question: "İptal veya iade talebini nasıl iletirim?", answer: "Sipariş panelindeki iade talebi seçeneği veya resmî e-posta/adres üzerinden yazılı bildirim kullanılabilir. Cayma hakkı, kanuni istisnalar, süreler ve başvuru ayrıntıları Teslimat, İptal ve İade sayfasındadır. Talep oluşturulması iadenin tamamlandığı anlamına gelmez." },
    { question: "Atlas AI her soruyu yanıtlar mı?", answer: "Atlas AI, öğrencinin erişimi ve kurumun onaylı müfredatına göre çalışır. Uygun kapsam belirlenemezse yanıt üretmeyebilir. Video özetleri ses dökümü ve sınırlı örnek kareler üzerinden hazırlanır; her görüntü anı incelenmiş sayılmaz. Çıktılar hata içerebilir ve öğretmen kontrolü gerekebilir." },
];

export default function SSSPage() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <div className="flex flex-col min-h-screen">
            <PublicHeader />
            <main className="flex-1">
                <section className="bg-gradient-to-br from-atlas-blue via-blue-600 to-atlas-indigo pt-32 pb-16">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Sıkça Sorulan Sorular</h1>
                        <p className="text-lg text-white/80 max-w-2xl mx-auto">
                            Merak ettiğiniz konularda yanıtlar burada.
                        </p>
                    </div>
                </section>

                <section className="py-20">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="space-y-4">
                            {faqItems.map((item, index) => (
                                <div
                                    key={index}
                                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                                >
                                    <button
                                        className="w-full flex items-center justify-between p-6 text-left"
                                        onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                        aria-expanded={openIndex === index}
                                        aria-controls={`faq-answer-${index}`}
                                    >
                                        <span className="text-base font-semibold text-gray-900 pr-4">{item.question}</span>
                                        <ChevronDown
                                            className={`h-5 w-5 text-gray-400 shrink-0 transition-transform duration-200 ${openIndex === index ? "rotate-180" : ""
                                                }`}
                                        />
                                    </button>
                                    {openIndex === index && (
                                        <div id={`faq-answer-${index}`} className="px-6 pb-6 pt-0">
                                            <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 flex flex-wrap gap-5 text-sm text-atlas-blue"><Link className="underline" href="/packages">Paketler ve detayları</Link><Link className="underline" href="/iptal-iade">Teslimat, iptal ve iade</Link><Link className="underline" href="/iletisim">İletişim ve destek</Link></div>
                    </div>
                </section>
            </main>
            <PublicFooter />
        </div>
    );
}
