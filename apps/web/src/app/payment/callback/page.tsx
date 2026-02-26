"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

function CallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    useEffect(() => {
        if (!token) {
            router.push("/payment/result?status=failure&message=Token bulunamadı");
            return;
        }

        const verifyPayment = async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/payment/callback`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ token }),
                    }
                );

                const data = await res.json();

                if (data.status === "success") {
                    router.push(`/payment/result?status=success&orderId=${data.orderId}`);
                } else {
                    router.push(`/payment/result?status=failure&message=${encodeURIComponent(data.message || "Ödeme başarısız")}`);
                }
            } catch {
                router.push("/payment/result?status=failure&message=" + encodeURIComponent("Ödeme doğrulanamadı"));
            }
        };

        verifyPayment();
    }, [token, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-gray-700">Ödemeniz doğrulanıyor...</h2>
                <p className="text-sm text-gray-500 mt-2">Lütfen bekleyin, bu işlem birkaç saniye sürebilir.</p>
            </div>
        </div>
    );
}

export default function PaymentCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-500 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-gray-700">Yükleniyor...</h2>
                </div>
            </div>
        }>
            <CallbackContent />
        </Suspense>
    );
}
