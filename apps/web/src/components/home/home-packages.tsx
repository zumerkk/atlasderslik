"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ApiStatus, PackageSkeleton } from "@/components/ui/api-status";
import { CheckCircle2, ArrowRight, Crown, Star } from "lucide-react";

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

const PACKAGES_CACHE_KEY = "atlas_packages_cache";
const PACKAGES_CACHE_TTL = 1000 * 60 * 30; // 30 minutes

function getCachedPackages(): any[] | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(PACKAGES_CACHE_KEY);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts > PACKAGES_CACHE_TTL) return null;
        return data;
    } catch {
        return null;
    }
}

function setCachedPackages(data: any[]) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(PACKAGES_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
    } catch { /* quota exceeded — ignore */ }
}

export function HomePackages({ initialPackages }: { initialPackages: any[] }) {
    const [homePackages, setHomePackages] = useState<any[]>(initialPackages);
    const [pkgLoading, setPkgLoading] = useState(initialPackages.length === 0);
    const [retryAttempt, setRetryAttempt] = useState(0);
    const [fetchFailed, setFetchFailed] = useState(false);

    const fetchPackages = useCallback(async () => {
        if (initialPackages.length > 0) return;

        setPkgLoading(true);
        setFetchFailed(false);
        setRetryAttempt(0);

        const cached = getCachedPackages();
        if (cached && cached.length > 0) {
            setHomePackages(cached);
            setPkgLoading(false);
        }

        const maxRetries = 3;
        const timeout = 15000;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/packages/active`,
                    { cache: "no-store", signal: controller.signal }
                );
                clearTimeout(timeoutId);

                if (res.ok) {
                    const data = await res.json();
                    const sliced = data.slice(0, 4);
                    setHomePackages(sliced);
                    setCachedPackages(sliced);
                    setPkgLoading(false);
                    setRetryAttempt(0);
                    setFetchFailed(false);
                    return;
                }
            } catch {
                clearTimeout(timeoutId);
            }

            if (attempt < maxRetries) {
                setRetryAttempt(attempt);
                if (!cached || cached.length === 0) {
                    setPkgLoading(true);
                }
                await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, attempt - 1)));
            }
        }

        setFetchFailed(true);
        setPkgLoading(false);
    }, [initialPackages]);

    useEffect(() => {
        fetchPackages();
    }, [fetchPackages]);

    return (
        <>
            {retryAttempt > 0 && homePackages.length === 0 && (
                <ApiStatus retryAttempt={retryAttempt} maxRetries={3} />
            )}

            {fetchFailed && homePackages.length === 0 && (
                <ApiStatus failed onRetry={fetchPackages} />
            )}

            {pkgLoading && homePackages.length === 0 && !fetchFailed && retryAttempt === 0 ? (
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
                        const badgeStyle = BADGE_STYLES[pkg.badge] || BADGE_STYLES["En Popüler"];
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
                                        <span className="text-2xl font-extrabold text-white">{pkg.price.toLocaleString("tr-TR")} TL</span>
                                        <span className="text-white/70 text-xs font-medium">/ Ay</span>
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
                                    <Link href="/packages">
                                        <Button className={`w-full bg-gradient-to-r ${ci.color} hover:opacity-90 text-white py-4 text-sm font-semibold shadow-md transition-all`}>
                                            Detayları Gör
                                            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                                        </Button>
                                    </Link>
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
