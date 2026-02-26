"use client";

import { useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
    CreditCard,
    Package,
    ArrowRight,
    CheckCircle2,
    Clock,
    XCircle,
    RefreshCw,
    Loader2,
    ShoppingBag,
    CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const STATUS_MAP: Record<string, { label: string; variant: any; icon: any }> = {
    COMPLETED: { label: "Tamamlandı", variant: "success", icon: CheckCircle2 },
    PENDING: { label: "Bekliyor", variant: "warning", icon: Clock },
    FAILED: { label: "Başarısız", variant: "destructive", icon: XCircle },
    CANCELLED: { label: "İptal", variant: "secondary", icon: XCircle },
};

export default function StudentPackagesPage() {
    const [activePackage, setActivePackage] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem("token");
            if (!token) return;
            const headers = { Authorization: `Bearer ${token}` };

            try {
                const [activeRes, ordersRes] = await Promise.all([
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/payment/active-package`, { headers }),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/payment/my-orders`, { headers }),
                ]);

                if (activeRes.ok) {
                    const data = await activeRes.json();
                    setActivePackage(data);
                }
                if (ordersRes.ok) {
                    setOrders(await ordersRes.json());
                }
            } catch (err) {
                console.error("Failed to load package data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader
                title="Paketlerim"
                description="Aktif paketinizi görüntüleyin ve yeni paket satın alın"
            >
                <Link href="/packages">
                    <Button size="sm">
                        <ShoppingBag className="h-4 w-4" />
                        Paket Satın Al
                    </Button>
                </Link>
            </PageHeader>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
            ) : (
                <>
                    {/* Active Package */}
                    <Card className="border-2 border-emerald-200 hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                                    <Package className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                    <CardTitle>Aktif Paketim</CardTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5">Şu anda kullanmakta olduğunuz paket</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {activePackage && activePackage.package ? (
                                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-100">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">{activePackage.package.name}</h3>
                                            <p className="text-sm text-gray-500 mt-1">{activePackage.package.description}</p>
                                        </div>
                                        <Badge variant="success">Aktif</Badge>
                                    </div>
                                    <div className="flex items-center gap-4 mt-4">
                                        <div className="text-sm text-gray-500">
                                            <span className="font-semibold text-emerald-700">{activePackage.package.price?.toLocaleString("tr-TR")} TL</span>
                                            <span className="text-gray-400 ml-1">/ Ay</span>
                                        </div>
                                        {activePackage.order?.paidAt && (
                                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                                <CalendarDays className="h-3.5 w-3.5" />
                                                <span>
                                                    Ödeme: {format(new Date(activePackage.order.paidAt), "d MMMM yyyy", { locale: tr })}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4">
                                        <Link href="/packages">
                                            <Button variant="outline" size="sm">
                                                <RefreshCw className="h-3.5 w-3.5" />
                                                Paket Yenile / Değiştir
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <EmptyState
                                        icon={Package}
                                        title="Henüz aktif paketiniz yok"
                                        description="Paketler sayfasından size uygun bir paket satın alabilirsiniz."
                                    />
                                    <div className="flex justify-center -mt-6 mb-4">
                                        <Link href="/packages">
                                            <Button size="sm">
                                                <ShoppingBag className="h-4 w-4" />
                                                Paket Satın Al
                                                <ArrowRight className="h-3.5 w-3.5" />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Order History */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                    <CreditCard className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <CardTitle>Ödeme Geçmişi</CardTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5">Tüm sipariş ve ödeme geçmişiniz</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {orders.length === 0 ? (
                                <EmptyState
                                    icon={CreditCard}
                                    title="Henüz ödeme kaydı yok"
                                    description="İlk paketinizi satın aldığınızda burada görünecektir."
                                />
                            ) : (
                                <div className="space-y-3">
                                    {orders.map((order: any) => {
                                        const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.PENDING;
                                        const StatusIcon = statusInfo.icon;
                                        return (
                                            <div
                                                key={order._id}
                                                className="p-4 rounded-xl bg-muted/40 border border-border/40 hover:shadow-sm transition-all"
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <h4 className="text-sm font-semibold">
                                                            {order.package?.name || "Paket"}
                                                        </h4>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {order.amount?.toLocaleString("tr-TR")} TL
                                                        </p>
                                                    </div>
                                                    <Badge variant={statusInfo.variant}>
                                                        <StatusIcon className="h-3 w-3 mr-1" />
                                                        {statusInfo.label}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <CalendarDays className="h-3.5 w-3.5" />
                                                    <span>
                                                        {order.createdAt
                                                            ? format(new Date(order.createdAt), "d MMMM yyyy HH:mm", { locale: tr })
                                                            : "-"}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
