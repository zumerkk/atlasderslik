"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowRight, RefreshCw, Loader2 } from "lucide-react";
import Link from "next/link";

function ResultContent() {
    const searchParams = useSearchParams();
    const status = searchParams.get("status");
    const message = searchParams.get("message");
    const orderId = searchParams.get("orderId");

    const isSuccess = status === "success";

    return (
        <div className="max-w-lg mx-auto px-4 text-center">
            <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${isSuccess ? "bg-emerald-100" : "bg-rose-100"}`}>
                {isSuccess ? (
                    <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                ) : (
                    <XCircle className="h-10 w-10 text-rose-600" />
                )}
            </div>

            <h1 className={`text-2xl font-bold mb-3 ${isSuccess ? "text-emerald-700" : "text-rose-700"}`}>
                {isSuccess ? "Ödeme Başarılı! 🎉" : "Ödeme Başarısız"}
            </h1>

            <p className="text-gray-500 mb-8">
                {isSuccess
                    ? "Paketiniz başarıyla aktifleştirildi. Hemen derslerinize başlayabilirsiniz."
                    : message || "Ödeme işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin."}
            </p>

            {orderId && isSuccess && (
                <p className="text-xs text-gray-400 mb-6">
                    Sipariş No: <span className="font-mono">{orderId}</span>
                </p>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {isSuccess ? (
                    <>
                        <Link href="/student">
                            <Button className="bg-atlas-blue hover:bg-atlas-blue-dark text-white px-8 py-5 font-semibold">
                                Dashboard&apos;a Git
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href="/student/packages">
                            <Button variant="outline" className="px-8 py-5">
                                Paketlerimi Gör
                            </Button>
                        </Link>
                    </>
                ) : (
                    <>
                        <Link href="/packages">
                            <Button className="bg-atlas-blue hover:bg-atlas-blue-dark text-white px-8 py-5 font-semibold">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Tekrar Dene
                            </Button>
                        </Link>
                        <Link href="/">
                            <Button variant="outline" className="px-8 py-5">
                                Ana Sayfaya Dön
                            </Button>
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}

export default function PaymentResultPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <PublicHeader />
            <main className="flex-1 flex items-center justify-center pt-24 pb-16">
                <Suspense fallback={
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                }>
                    <ResultContent />
                </Suspense>
            </main>
            <PublicFooter />
        </div>
    );
}
