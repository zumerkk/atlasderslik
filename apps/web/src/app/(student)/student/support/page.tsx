"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { MessageCircle, Mail, Phone } from "lucide-react";

export default function SupportPage() {
    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader title="Destek" description="Yardıma mı ihtiyacınız var? Bize ulaşın." />

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                <Mail className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <CardTitle className="text-base">E-posta Destek</CardTitle>
                                <CardDescription>Sorularınız için bize e-posta gönderin.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <a href="mailto:destek@atlasderslik.com" className="text-sm text-primary hover:underline font-medium">
                            destek@atlasderslik.com
                        </a>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                                <Phone className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Telefon</CardTitle>
                                <CardDescription>Hafta içi 09:00 — 18:00 arası arayabilirsiniz.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <span className="text-sm font-medium">0850 XXX XX XX</span>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-blue-100">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <MessageCircle className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <CardTitle className="text-base">Sıkça Sorulan Sorular</CardTitle>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[
                            { q: "Canlı derslere nasıl katılabilirim?", a: "Canlı dersler sayfasından aktif dersleri görüntüleyebilir ve bağlantıya tıklayarak katılabilirsiniz." },
                            { q: "Ödevlerimi nasıl teslim edebilirim?", a: "Ödevler sayfasından ilgili ödevi seçip dosyanızı yükleyebilirsiniz." },
                            { q: "Şifremi unuttum, ne yapmalıyım?", a: 'Giriş sayfasındaki "Şifremi Unuttum" bağlantısını kullanarak şifrenizi sıfırlayabilirsiniz.' },
                        ].map((item, i) => (
                            <div key={i} className="p-4 rounded-xl bg-white/60 border border-blue-100/50">
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
