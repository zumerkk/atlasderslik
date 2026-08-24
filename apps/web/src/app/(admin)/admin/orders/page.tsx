"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { apiGet } from "@/lib/api";
import { CreditCard, Loader2, CheckCircle2, Clock, XCircle, Wallet } from "lucide-react";

const STATUS = {
    COMPLETED: { label: "Tamamlandı", variant: "success" as const, icon: CheckCircle2 },
    PENDING: { label: "Bekliyor", variant: "warning" as const, icon: Clock },
    FAILED: { label: "Başarısız", variant: "destructive" as const, icon: XCircle },
    CANCELLED: { label: "İptal", variant: "secondary" as const, icon: XCircle },
};

const FILTERS = [
    { key: "", label: "Tümü" },
    { key: "COMPLETED", label: "Tamamlanan" },
    { key: "PENDING", label: "Bekleyen" },
    { key: "FAILED", label: "Başarısız" },
];

interface Order {
    _id: string;
    amount: number;
    status: keyof typeof STATUS;
    createdAt: string;
    paidAt?: string;
    user?: { firstName: string; lastName: string; email: string };
    package?: { name: string; price: number; period: string };
}

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError("");
            try {
                const res = await apiGet(`/payment/admin/orders${status ? `?status=${status}` : ""}`);
                if (!res.ok) throw new Error("failed");
                const data = await res.json();
                if (!cancelled) setOrders(Array.isArray(data) ? data : []);
            } catch {
                if (!cancelled) setError("Siparişler yüklenemedi. Sayfayı yenileyip tekrar deneyin.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [status]);

    const completed = orders.filter((o) => o.status === "COMPLETED");
    const revenue = completed.reduce((sum, o) => sum + (o.amount || 0), 0);

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader
                title="Siparişler ve Ödemeler"
                description="Paket satın alma kayıtları ve ödeme durumları."
            />

            {error && (
                <div className="px-4 py-3 rounded-xl text-sm bg-rose-50 text-rose-700 border border-rose-200">{error}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <SummaryCard icon={Wallet} label="Tahsil edilen" value={`${revenue.toLocaleString("tr-TR")} TL`} tone="text-emerald-600" />
                <SummaryCard icon={CheckCircle2} label="Tamamlanan sipariş" value={completed.length} tone="text-blue-600" />
                <SummaryCard icon={Clock} label="Bekleyen sipariş" value={orders.filter((o) => o.status === "PENDING").length} tone="text-amber-600" />
            </div>

            <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                    <Button
                        key={f.key}
                        variant={status === f.key ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatus(f.key)}
                    >
                        {f.label}
                    </Button>
                ))}
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <CardTitle className="text-base">Sipariş Kayıtları</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">{orders.length} kayıt</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
                        </div>
                    ) : orders.length === 0 ? (
                        <EmptyState
                            icon={CreditCard}
                            title="Sipariş kaydı yok"
                            description="Bu filtreye uyan bir sipariş bulunamadı."
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[640px]">
                                <thead>
                                    <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                                        <th className="py-2.5 pr-4 font-semibold">Öğrenci</th>
                                        <th className="py-2.5 pr-4 font-semibold">Paket</th>
                                        <th className="py-2.5 pr-4 font-semibold text-right">Tutar</th>
                                        <th className="py-2.5 pr-4 font-semibold">Tarih</th>
                                        <th className="py-2.5 font-semibold">Durum</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((o) => {
                                        const st = STATUS[o.status] || STATUS.PENDING;
                                        const StatusIcon = st.icon;
                                        return (
                                            <tr key={o._id} className="border-b border-border/40 last:border-0 hover:bg-muted/30">
                                                <td className="py-3 pr-4">
                                                    <div className="font-medium">
                                                        {o.user ? `${o.user.firstName} ${o.user.lastName}` : "Bilinmiyor"}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">{o.user?.email || "—"}</div>
                                                </td>
                                                <td className="py-3 pr-4">{o.package?.name || "—"}</td>
                                                <td className="py-3 pr-4 text-right tabular-nums font-medium">
                                                    {(o.amount || 0).toLocaleString("tr-TR")} TL
                                                </td>
                                                <td className="py-3 pr-4 text-muted-foreground text-xs">
                                                    {o.createdAt
                                                        ? new Date(o.createdAt).toLocaleDateString("tr-TR", {
                                                            day: "numeric", month: "short", year: "numeric",
                                                        })
                                                        : "—"}
                                                </td>
                                                <td className="py-3">
                                                    <Badge variant={st.variant}>
                                                        <StatusIcon className="h-3 w-3" />
                                                        {st.label}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string | number; tone: string }) {
    return (
        <Card>
            <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Icon className={`h-5 w-5 ${tone}`} />
                </div>
                <div className="min-w-0">
                    <div className={`text-lg font-bold ${tone} truncate`}>{value}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                </div>
            </CardContent>
        </Card>
    );
}
