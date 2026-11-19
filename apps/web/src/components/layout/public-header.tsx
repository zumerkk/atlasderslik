"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Menu, ShoppingCart, UserRound, LogOut, ShieldCheck, ReceiptText, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCommerceAccount } from "@/components/commerce/use-commerce-account";
import { accountHome, accountOrders, authPageHref, safeAuthRedirect } from "@/lib/auth-navigation";
import { clearAuthSession } from "@/lib/auth-session";

const navLinks = [{ href: "/#features", label: "Özellikler" }, { href: "/packages", label: "Paketler" }, { href: "/hakkimizda", label: "Hakkımızda" }, { href: "/iletisim", label: "İletişim" }];

export function PublicHeader() {
    return <Suspense fallback={<header className="fixed top-0 inset-x-0 z-50 h-[76px] border-b bg-white px-6 flex items-center"><Link href="/" className="text-xl font-extrabold text-slate-900">Atlas Derslik</Link></header>}><PublicHeaderContent /></Suspense>;
}
function PublicHeaderContent() {
    const pathname = usePathname();
    const params = useSearchParams();
    const router = useRouter();
    const { account, ready } = useCommerceAccount();
    const [mobileOpen, setMobileOpen] = useState(false);
    const intent = safeAuthRedirect(`${pathname}${params.size ? `?${params}` : ""}`);
    const customer = account?.role === "STUDENT" || account?.role === "PARENT";
    const orders = accountOrders(account?.role);
    const close = () => setMobileOpen(false);
    const logout = () => { close(); clearAuthSession(); router.replace(authPageHref("login", intent)); };
    const brand = <Link href="/" onClick={close} className="inline-flex items-center gap-2.5 shrink-0"><Image src="/assets/images/deer-logo.png" alt="Atlas Derslik" width={48} height={48} unoptimized className="h-12 w-12 object-contain" /><span className="text-xl font-extrabold tracking-tight text-slate-900">Atlas Derslik</span></Link>;
    return <header className="fixed top-0 inset-x-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-sm"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-[76px] items-center justify-between gap-4">
        {brand}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Ana menü">{navLinks.map(link => <Link href={link.href} key={link.href} className="px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-blue-50 hover:text-atlas-blue">{link.label}</Link>)}</nav>
        <div className="hidden lg:flex items-center gap-2">
            {(!account || customer) && <Button variant="outline" asChild><Link href={account ? "/cart" : authPageHref("login", "/cart")}><ShoppingCart className="h-4 w-4" />Sepetim</Link></Button>}
            {!ready ? <span className="text-xs text-muted-foreground" role="status">Oturum kontrol ediliyor…</span> : account ? <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><UserRound className="h-4 w-4" />Hesabım</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-56"><DropdownMenuItem asChild><Link href={accountHome(account.role)}><LayoutDashboard className="h-4 w-4" />Panelim</Link></DropdownMenuItem>{orders && <DropdownMenuItem asChild><Link href={orders}><ReceiptText className="h-4 w-4" />Siparişlerim</Link></DropdownMenuItem>}<DropdownMenuItem asChild><Link href="/account/security"><ShieldCheck className="h-4 w-4" />Hesap güvenliği</Link></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={logout}><LogOut className="h-4 w-4" />Çıkış yap</DropdownMenuItem></DropdownMenuContent></DropdownMenu> : <><Button variant="ghost" asChild><Link href={authPageHref("login", intent)}>Giriş yap</Link></Button><Button asChild className="bg-atlas-orange hover:bg-atlas-orange-dark text-white"><Link href={authPageHref("register", intent)}>Kayıt ol</Link></Button></>}
        </div>
        <div className="flex lg:hidden items-center gap-1">{(!account || customer) && <Button variant="ghost" size="icon" asChild><Link href={account ? "/cart" : authPageHref("login", "/cart")} aria-label="Sepetim"><ShoppingCart className="h-5 w-5" /></Link></Button>}<Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Menüyü aç"><Menu className="h-6 w-6" /></Button></SheetTrigger><SheetContent side="right" className="p-0 flex flex-col"><div className="border-b p-5 pr-12"><SheetTitle>Atlas Derslik menüsü</SheetTitle><SheetDescription className="sr-only">Paketlere, sepetinize ve hesap işlemlerinize ulaşın.</SheetDescription></div><nav className="p-4 space-y-1" aria-label="Mobil ana menü">{navLinks.map(link => <Link href={link.href} key={link.href} onClick={close} className="block rounded-lg px-4 py-3 text-sm font-medium hover:bg-blue-50">{link.label}</Link>)}</nav><div className="mt-auto border-t p-4 space-y-2">{account ? <><Link onClick={close} href={accountHome(account.role)} className="block rounded-lg p-3 text-sm font-medium">Panelim</Link>{customer && <Link onClick={close} href="/cart" className="block rounded-lg p-3 text-sm font-medium">Sepetim</Link>}{orders && <Link onClick={close} href={orders} className="block rounded-lg p-3 text-sm font-medium">Siparişlerim</Link>}<Link onClick={close} href="/account/security" className="block rounded-lg p-3 text-sm font-medium">Hesap güvenliği</Link><Button variant="outline" className="w-full" onClick={logout}><LogOut className="h-4 w-4" />Çıkış yap</Button></> : <><Button variant="outline" asChild className="w-full"><Link onClick={close} href={authPageHref("login", intent)}>Giriş yap</Link></Button><Button asChild className="w-full"><Link onClick={close} href={authPageHref("register", intent)}>Kayıt ol</Link></Button></>}</div></SheetContent></Sheet></div>
    </div></header>;
}
