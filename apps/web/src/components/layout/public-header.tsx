"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navLinks = [
    { href: "#features", label: "Özellikler" },
    { href: "/packages", label: "Paketler" },
    { href: "#about", label: "Hakkımızda" },
    { href: "#contact", label: "İletişim" },
];

export function PublicHeader() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
                ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100"
                : "bg-transparent"
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "72px" }}>
                    {/* Logo - solda, geyik + yazı yan yana */}
                    <Link href="/" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px", textDecoration: "none" }}>
                        <img
                            src="/assets/images/deer-logo.png"
                            alt="Atlas Derslik Logo"
                            style={{
                                width: "44px",
                                height: "44px",
                                objectFit: "contain",
                                filter: scrolled ? "none" : "brightness(0) invert(1)",
                                transition: "filter 0.3s ease",
                            }}
                        />
                        <span
                            style={{
                                fontSize: "20px",
                                fontWeight: 700,
                                letterSpacing: "-0.02em",
                                color: scrolled ? "#111827" : "#ffffff",
                                transition: "color 0.3s ease",
                                whiteSpace: "nowrap",
                            }}
                        >
                            Atlas Derslik
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${scrolled
                                    ? "text-gray-600 hover:text-atlas-blue hover:bg-blue-50"
                                    : "text-white/80 hover:text-white hover:bg-white/10"
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Desktop CTA */}
                    <div className="hidden md:flex items-center gap-3">
                        <Link href="/login">
                            <Button
                                variant="ghost"
                                className={`font-medium ${scrolled
                                    ? "text-gray-700 hover:text-atlas-blue"
                                    : "text-white hover:bg-white/10 hover:text-white"
                                    }`}
                            >
                                Giriş Yap
                            </Button>
                        </Link>
                        <Link href="/register">
                            <Button className="bg-atlas-orange hover:bg-atlas-orange-dark text-white shadow-md hover:shadow-lg transition-all font-semibold">
                                Kayıt Ol
                            </Button>
                        </Link>
                    </div>

                    {/* Mobile Menu */}
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`md:hidden ${scrolled ? "text-gray-700" : "text-white"}`}
                            >
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-72 p-0">
                            <div className="flex flex-col h-full">
                                <div className="p-6 border-b">
                                    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px" }}>
                                        <img
                                            src="/assets/images/deer-logo.png"
                                            alt="Atlas Derslik Logo"
                                            style={{ width: "40px", height: "40px", objectFit: "contain" }}
                                        />
                                        <span style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.02em" }}>
                                            Atlas Derslik
                                        </span>
                                    </div>
                                </div>
                                <nav className="flex-1 p-4 space-y-1">
                                    {navLinks.map((link) => (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-blue-50 hover:text-atlas-blue transition-colors"
                                        >
                                            {link.label}
                                        </Link>
                                    ))}
                                </nav>
                                <div className="p-4 border-t space-y-3">
                                    <Link href="/login" className="block">
                                        <Button variant="outline" className="w-full">
                                            Giriş Yap
                                        </Button>
                                    </Link>
                                    <Link href="/register" className="block">
                                        <Button className="w-full bg-atlas-orange hover:bg-atlas-orange-dark text-white font-semibold">
                                            Kayıt Ol
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}
