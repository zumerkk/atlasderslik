"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { AddToCartLink } from "@/components/commerce/add-to-cart-link";
import { Button } from "@/components/ui/button";
import { ApiStatus, PackageSkeleton } from "@/components/ui/api-status";
import { CheckCircle2, ArrowRight, Crown, Star } from "lucide-react";
import { apiGet } from "@/lib/api";
import { commerceJson, money, PERIOD_LABELS, type CommercePackage } from "@/lib/commerce";

const COLORS = [
    { color: "from-sky-500 to-blue-600" },
    { color: "from-teal-500 to-emerald-600" },
    { color: "from-blue-500 to-indigo-600" },
    { color: "from-amber-500 to-orange-600" },
];

const BADGE_STYLES: Record<string, string> = {
    VIP: "bg-gradient-to-r from-amber-500 to-orange-500",
    "En Popüler": "bg-gradient-to-r from-emerald-500 to-teal-500",
};

export function HomePackages({ initialPackages }: { initialPackages: CommercePackage[] }) {
    const [homePackages, setHomePackages] = useState<CommercePackage[]>(initialPackages);
    const [pkgLoading, setPkgLoading] = useState(initialPackages.length === 0);
    const [fetchFailed, setFetchFailed] = useState(false);
    const request = useRef<AbortController | null>(null);
    const fetchPackages = useCallback(async () => {
        request.current?.abort(); const controller = new AbortController(); request.current = controller;
        setPkgLoading(true); setFetchFailed(false);
        try {
            const data = await commerceJson<CommercePackage[]>(await apiGet("/packages/active", { skipAuth: true, signal: controller.signal, retries: 0, timeout: 45000 }), "Paketler alınamadı.");
            if (!Array.isArray(data)) throw new Error("Paket listesi doğrulanamadı.");
            if (!controller.signal.aborted) setHomePackages(data.slice(0, 4));
        } catch { if (!controller.signal.aborted) { setHomePackages([]); setFetchFailed(true); } }
        finally { if (!controller.signal.aborted) setPkgLoading(false); }
    }, []);
    useEffect(() => { void fetchPackages(); return () => request.current?.abort(); }, [fetchPackages]);

    return (
        <>
            {fetchFailed && homePackages.length === 0 && (
                <ApiStatus failed onRetry={fetchPackages} />
            )}

            {pkgLoading && homePackages.length === 0 && !fetchFailed ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <PackageSkeleton key={i} />
                    ))}
                </div>
            ) : homePackages.length === 0 && !pkgLoading && !fetchFailed ? (
                <p className="text-center text-gray-400 py-16">Paketler yakında eklenecek.</p>
            ) : homePackages.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                    {homePackages.map((pkg, idx) => {
                        const ci = COLORS[idx % COLORS.length];
                        const badgeStyle = BADGE_STYLES[pkg.badge || ""] || BADGE_STYLES["En Popüler"];
                        return (
                            <div
                                key={pkg._id}
                                className="group relative bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
                            >
                                {pkg.badge && (
                                    <div className="absolute top-3 right-3 z-10">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white rounded-full shadow-sm ${badgeStyle}`}>
                                            {pkg.badge === "VIP" ? <Crown className="h-3 w-3" /> : <Star className="h-3 w-3" />}
                                            {pkg.badge}
                                        </span>
                                    </div>
                                )}

                                <div className={`bg-gradient-to-r ${ci.color} px-5 py-4`}>
                                    <h3 className="text-base font-bold text-white mb-2">{pkg.name}</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-extrabold text-white">{money(pkg.price)}</span>
                                        <span className="text-white/70 text-xs font-medium">{PERIOD_LABELS[pkg.period]}</span>
                                    </div>
                                </div>

                                {pkg.subtitle && (
                                    <div className="px-5 pt-3 pb-1">
                                        <p className="text-xs font-medium text-gray-500 bg-gray-50 rounded-md px-2.5 py-1.5 text-center">
                                            {pkg.subtitle}
                                        </p>
                                    </div>
                                )}

                                <div className="px-5 py-3 flex-1">
                                    <ul className="space-y-2">
                                        {(pkg.features || []).slice(0, 3).map((feat: string, fi: number) => (
                                            <li key={fi} className="flex items-start gap-2 text-sm text-gray-600">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                                <span className="leading-snug">{feat}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="px-5 pb-5">
                                    <AddToCartLink packageId={pkg._id} className={`w-full bg-gradient-to-r ${ci.color} hover:opacity-90 text-white py-4 text-sm font-semibold shadow-md transition-all`}>Sepete ekle<ArrowRight className="ml-1.5 h-3.5 w-3.5" /></AddToCartLink><Link href={`/packages/${encodeURIComponent(pkg._id)}`} className="mt-3 block text-center text-sm text-atlas-blue underline">Paket ayrıntıları</Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : null}

            <div className="text-center mt-10">
                <Link href="/packages">
                    <Button variant="outline" size="lg" className="text-atlas-blue border-atlas-blue hover:bg-atlas-blue hover:text-white transition-all font-semibold">
                        Tüm Paketleri Detaylı İncele
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </Link>
            </div>
        </>
    );
}
