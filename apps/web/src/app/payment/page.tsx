"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";

function PaymentContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const packageId = searchParams.get("packageId");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [formContent, setFormContent] = useState("");
    const formRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push(`/login?redirect=/payment?packageId=${packageId}`);
            return;
        }

        if (!packageId) {
            setError("Geçersiz paket. Lütfen paketler sayfasından bir paket seçin.");
            setLoading(false);
            return;
        }

        const initializePayment = async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/payment/initialize`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ packageId }),
                    }
                );

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.message || "Ödeme başlatılamadı");
                }

                const data = await res.json();
                setFormContent(data.checkoutFormContent);
            } catch (err: any) {
                setError(err.message || "Ödeme başlatılamadı. Lütfen tekrar deneyin.");
            } finally {
                setLoading(false);
            }
        };

        initializePayment();
    }, [packageId, router]);

    // Render iyzico form content
    useEffect(() => {
        if (formContent && formRef.current) {
            formRef.current.innerHTML = formContent;
            // Execute any scripts in the form content
            const scripts = formRef.current.querySelectorAll("script");
            scripts.forEach((script) => {
                const newScript = document.createElement("script");
                if (script.src) {
                    newScript.src = script.src;
                } else {
                    newScript.textContent = script.textContent;
                }
                document.body.appendChild(newScript);
            });
        }
    }, [formContent]);

    return (
        <>
            {/* Back button */}
            <Link href="/packages" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Paketlere Dön
            </Link>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-atlas-blue to-atlas-indigo px-6 py-5">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="h-6 w-6 text-white" />
                        <div>
                            <h1 className="text-lg font-bold text-white">Güvenli Ödeme</h1>
                            <p className="text-sm text-white/70">iyzico güvencesiyle ödeme yapın</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
                            <p className="text-sm text-gray-500">Ödeme formu yükleniyor...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="bg-rose-50 border border-rose-200 rounded-xl px-6 py-4 text-sm text-rose-700 flex items-start gap-3 mb-6">
                                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                            <Link href="/packages">
                                <Button variant="outline">
                                    <ArrowLeft className="h-4 w-4" />
                                    Paketlere Dön
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div ref={formRef} id="iyzipay-checkout-form" className="min-h-[400px]" />
                    )}
                </div>

                {/* Security badge */}
                <div className="px-6 pb-6">
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>256-bit SSL ile şifrelenmiş güvenli ödeme</span>
                    </div>
                </div>
            </div>
        </>
    );
}

export default function PaymentPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <PublicHeader />
            <main className="flex-1 pt-24 pb-16">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Suspense fallback={
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        </div>
                    }>
                        <PaymentContent />
                    </Suspense>
                </div>
            </main>
            <PublicFooter />
        </div>
    );
}
