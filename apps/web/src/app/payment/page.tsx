"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authPageHref, cartHref } from "@/lib/auth-navigation";
import { useCommerceAccount } from "@/components/commerce/use-commerce-account";

function LegacyPaymentRedirect() {
    const router = useRouter();
    const params = useSearchParams();
    const { account, ready } = useCommerceAccount();
    const target = cartHref(params.get("packageId") || undefined, params.get("studentId") || undefined);
    useEffect(() => { if (ready) router.replace(account ? target : authPageHref("login", target)); }, [account, ready, router, target]);
    return <main className="min-h-screen flex items-center justify-center"><div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /><h1 className="mt-4 text-lg font-semibold">Güvenli sepetinize yönlendiriliyorsunuz…</h1><p className="mt-2 text-sm text-muted-foreground">Paket ve öğrenci seçiminiz korunur; bu adım ödeme başlatmaz.</p></div></main>;
}
export default function PaymentPage() { return <Suspense fallback={<p className="p-8 text-center">Sepet hazırlanıyor…</p>}><LegacyPaymentRedirect /></Suspense>; }
