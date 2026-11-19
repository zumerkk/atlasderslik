import type { Metadata } from "next";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { AccountSecurity } from "@/components/commerce/account-security";

export const metadata: Metadata = { title: "Hesap güvenliği", robots: { index: false, follow: false } };
export default function AccountSecurityPage() { return <div className="min-h-screen flex flex-col bg-slate-50"><PublicHeader /><main className="flex-1 px-4 pt-28 pb-16"><AccountSecurity /></main><PublicFooter /></div>; }
