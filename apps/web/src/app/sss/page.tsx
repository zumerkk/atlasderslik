"use client";

import { useState } from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { ChevronDown } from "lucide-react";

const faqItems = [
    {
        question: "Atlas Derslik nedir?",
        answer: "Atlas Derslik, ortaokul öğrencilerine yönelik online eğitim platformudur. Haftalık canlı grup dersleri, video kütüphanesi ve soru bankası ile öğrencilerin akademik başarılarını destekler.",
    },
    {
        question: "Dersler nasıl işleniyor?",
        answer: "Dersler, haftalık olarak belirlenen program dahilinde canlı olarak online ortamda işlenmektedir. Her ders, uzman öğretmenler tarafından interaktif bir şekilde yürütülür.",
    },
    {
        question: "Hangi sınıf seviyelerine ders veriliyor?",
        answer: "5, 6, 7 ve 8. sınıf seviyelerinde tüm müfredat derslerini kapsayan eğitim programları sunulmaktadır.",
    },
    {
        question: "LGS'ye hazırlık programı var mı?",
        answer: "Evet, özellikle 8. sınıf öğrencileri için LGS sınavına yönelik özel hazırlık programları ve deneme sınavları düzenlenmektedir.",
    },
    {
        question: "Dersleri kaçırırsam ne olur?",
        answer: "Tüm canlı dersler kaydedilmekte ve video kütüphanesine eklenmektedir. İstediğiniz zaman tekrar izleyebilirsiniz.",
    },
    {
        question: "Ödeme seçenekleri nelerdir?",
        answer: "Kredi kartı ve banka kartı ile güvenli ödeme yapabilirsiniz. Taksitli ödeme seçenekleri de mevcuttur.",
    },
    {
        question: "Nasıl kayıt olabilirim?",
        answer: "Web sitemizden 'Kayıt Ol' butonuna tıklayarak ücretsiz hesabınızı oluşturabilir, ardından size uygun paketi seçerek eğitime başlayabilirsiniz.",
    },
    {
        question: "Veli olarak öğrencimin gelişimini takip edebilir miyim?",
        answer: "Evet, veli hesabı oluşturarak öğrencinizin ders katılımını, ödev durumlarını ve performans raporlarını takip edebilirsiniz.",
    },
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
                                    >
                                        <span className="text-base font-semibold text-gray-900 pr-4">{item.question}</span>
                                        <ChevronDown
                                            className={`h-5 w-5 text-gray-400 shrink-0 transition-transform duration-200 ${openIndex === index ? "rotate-180" : ""
                                                }`}
                                        />
                                    </button>
                                    {openIndex === index && (
                                        <div className="px-6 pb-6 pt-0">
                                            <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
            <PublicFooter />
        </div>
    );
}
