"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Bell, Lock, Palette } from "lucide-react";

const settingsCards = [
    { icon: Bell, title: "Bildirimler", description: "Bildirim tercihlerinizi buradan düzenleyebileceksiniz.", color: "bg-blue-50 text-blue-600" },
    { icon: Lock, title: "Güvenlik", description: "Şifre değiştirme ve iki faktörlü doğrulama ayarları.", color: "bg-emerald-50 text-emerald-600" },
    { icon: Palette, title: "Görünüm", description: "Tema ve görünüm tercihlerinizi ayarlayın.", color: "bg-purple-50 text-purple-600" },
];

export default function SettingsPage() {
    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader title="Ayarlar" description="Hesap ve uygulama ayarlarınızı yönetin." />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {settingsCards.map((item) => (
                    <Card key={item.title} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                                    <item.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">{item.title}</CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CardDescription>{item.description}</CardDescription>
                            <Badge variant="warning" className="mt-3">Yakında</Badge>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
