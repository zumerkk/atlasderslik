"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { apiPost } from "@/lib/api";

// Compatibility for sessions opened before the server-to-server callback route.
function CallbackContent() {
    const initialToken = useSearchParams().get("token") || "";
    const [token] = useState(initialToken);
    const router = useRouter();
    const verification = useRef<{ token: string; request: Promise<string> } | null>(null);
    useEffect(() => {
        let active = true;
        // Remove provider token from browser history while verification is pending.
        window.history.replaceState(null, "", "/payment/callback");
        if (!/^[A-Za-z0-9_-]{8,200}$/.test(token)) { router.replace("/payment/result"); return; }
        if (verification.current?.token !== token) verification.current = { token, request: (async () => { try { const response = await apiPost("/payment/callback", { token }, { skipAuth: true, retries: 0, timeout: 45000 }); const data: unknown = await response.json(); return response.ok && !!data && typeof data === "object" && "orderId" in data && typeof data.orderId === "string" && /^[a-f0-9]{24}$/i.test(data.orderId) ? `/payment/result?orderId=${encodeURIComponent(data.orderId)}` : "/payment/result"; } catch { return "/payment/result"; } })() };
        void verification.current.request.then(href => { if (active) router.replace(href); });
        return () => { active = false; };
    }, [token, router]);
    return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto mb-4" /><h1 className="text-lg font-semibold">Ödeme sonucu doğrulanıyor…</h1><p className="text-sm text-gray-500 mt-2">Bu sayfa tek başına ödeme onayı anlamına gelmez.</p></div></div>;
}
export default function PaymentCallbackPage() { return <Suspense fallback={<Loader2 className="mx-auto h-8 w-8 animate-spin" />}><CallbackContent /></Suspense>; }
