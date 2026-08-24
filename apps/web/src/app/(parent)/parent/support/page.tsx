"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { MessageCircle, Mail, Phone } from "lucide-react";

const faq = [
    {
        q: "Çocuğumun ödevlerini nereden takip edebilirim?",
        a: 'Soldaki menüden "Ödev Takibi" sayfasına girerek her ödevin teslim durumunu, aldığı notu ve öğretmen yorumunu görebilirsiniz.',
    },
    {
        q: "Sınav sonuçlarını nasıl görüntülerim?",
        a: '"Sınav Sonuçları" sayfasında optik formla değerlendirilen sınavların doğru, yanlış, boş ve net dökümü listelenir.',
    },
    {
        q: "Çocuğum panelde görünmüyor, ne yapmalıyım?",
        a: "Öğrenci hesabının veli hesabınıza bağlanması gerekir. Bu işlemi okul yöneticisi yapar; aşağıdaki iletişim kanallarından bize ulaşın.",
    },
    {
        q: "Şifremi unuttum, ne yapmalıyım?",
        a: "Şifre sıfırlama işlemi okul yöneticiniz tarafından yapılır. E-posta veya telefon ile bize ulaştığınızda şifreniz yenilenir.",
    },
];

export default function ParentSupportPage() {
    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader title="Destek" description="Sorularınız için bize ulaşın." />

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                                <Mail className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <CardTitle className="text-base">E-posta</CardTitle>
                                <CardDescription>Sorularınızı e-posta ile iletin.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <a href="mailto:info@atlasderslik.com" className="text-sm text-primary hover:underline font-medium">
                            info@atlasderslik.com
                        </a>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                                <Phone className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Telefon</CardTitle>
                                <CardDescription>Hafta içi 09:00 — 18:00 arası.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <a href="tel:+905461191009" className="text-sm text-primary hover:underline font-medium">
                            0546 119 10 09
                        </a>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                            <MessageCircle className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <CardTitle className="text-base">Sıkça Sorulan Sorular</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {faq.map((item, i) => (
                            <div key={i} className="p-4 rounded-xl bg-muted/40 border border-border/40">
                                <p className="font-medium text-sm">{item.q}</p>
                                <p className="text-sm text-muted-foreground mt-1">{item.a}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
