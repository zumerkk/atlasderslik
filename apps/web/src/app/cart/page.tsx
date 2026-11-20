import { Suspense } from "react";
import type { Metadata } from "next";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { CartWorkspace } from "@/components/commerce/cart-workspace";

export const metadata: Metadata = { title: "Sepetim", robots: { index: false, follow: false } };
export default function CartPage() {
    return <div className="min-h-screen flex flex-col bg-slate-50"><PublicHeader /><main className="flex-1 pt-28 pb-16 px-4 sm:px-6"><div className="max-w-6xl mx-auto"><Suspense fallback={<p className="py-16 text-center text-muted-foreground">Sepet hazırlanıyor…</p>}><CartWorkspace /></Suspense></div></main><PublicFooter /></div>;
}
