import { Suspense } from "react";
import type { Metadata } from "next";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { PasswordHelp } from "@/components/commerce/account-security";

export const metadata: Metadata = { title: "Şifre erişim desteği", robots: { index: false, follow: false } };
export default function ForgotPasswordPage() { return <div className="min-h-screen flex flex-col bg-slate-50"><PublicHeader /><main className="flex-1 px-4 pt-28 pb-16"><Suspense fallback={<p className="text-center">Destek bilgileri hazırlanıyor…</p>}><PasswordHelp /></Suspense></main><PublicFooter /></div>; }
