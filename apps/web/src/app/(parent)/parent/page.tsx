"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { GraduationCap, Clock, Users, BarChart3, Rocket } from "lucide-react";

export default function ParentDashboard() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const u = localStorage.getItem("user");
        if (u) setUser(JSON.parse(u));
    }, []);

    const features = [
        {
            title: "Öğrenci Takibi",
            description: "Çocuğunuzun ders durumu, ödevleri ve sınav sonuçları burada görüntülenecektir.",
            icon: GraduationCap,
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
        },
        {
            title: "Öğretmen İletişim",
            description: "Öğretmenlerle iletişim kurma ve randevu alma özelliği eklenecektir.",
            icon: Users,
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
        },
        {
            title: "Raporlar",
            description: "Haftalık ve aylık performans raporları burada sunulacaktır.",
            icon: BarChart3,
            iconBg: "bg-violet-50",
            iconColor: "text-violet-600",
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader
                title={user ? `Hoş geldiniz, ${user.firstName}` : "Hoş geldiniz"}
                description="Veli Paneli"
            />

            <div className="grid gap-4 md:grid-cols-3">
                {features.map((feature) => {
                    const Icon = feature.icon;
                    return (
                        <Card key={feature.title} className="hover:shadow-md transition-all duration-200">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-10 h-10 rounded-xl ${feature.iconBg} flex items-center justify-center`}>
                                        <Icon className={`h-5 w-5 ${feature.iconColor}`} />
                                    </div>
                                    <h3 className="font-semibold">{feature.title}</h3>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {feature.description}
                                </p>
                                <Badge variant="warning" className="mt-4">
                                    <Clock className="h-3 w-3" />
                                    Yakında
                                </Badge>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Development Notice */}
            <Card className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-blue-100/60">
                <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                            <Rocket className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold mb-1">Geliştirme Aşamasında</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Veli paneli aktif olarak geliştirilmektedir. Çok yakında öğrenci takibi,
                                öğretmen iletişimi ve detaylı raporlama özellikleri eklenecektir.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
