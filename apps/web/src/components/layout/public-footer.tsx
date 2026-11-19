"use client";

import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { contactEmailHref, contactPhoneLabel, usePublicContact } from "@/lib/public-contact";
import { LEGAL_DOCUMENTS } from "@/lib/legal-documents";

const footerLinks = {
    platform: [
        { label: "Paketler", href: "/packages" },
        { label: "Canlı Dersler", href: "/canli-dersler" },
        { label: "Video Kütüphanesi", href: "/video-kutuphanesi" },
        { label: "Soru Bankası", href: "/soru-bankasi" },
    ],
    company: [
        { label: "Hakkımızda", href: "/hakkimizda" },
        { label: "Öğretmenler", href: "/ogretmenler" },
        { label: "SSS", href: "/sss" },
        { label: "İletişim ve Satıcı Bilgileri", href: "/iletisim" },
    ],
    legal: [
        ...Object.values(LEGAL_DOCUMENTS).map(document => ({ label: document.title, href: document.href })),
    ],
};

export function PublicFooter() {
    const contact = usePublicContact();
    return (
        <footer className="bg-gray-900 text-gray-300">
            {/* Main Footer */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    {/* Brand */}
                    <div className="lg:col-span-1">
                        <Link href="/" style={{ display: "inline-flex", flexDirection: "row", alignItems: "center", gap: "12px", marginBottom: "16px", textDecoration: "none" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/assets/images/deer-logo.png"
                                alt="Atlas Derslik"
                                style={{
                                    width: "48px",
                                    height: "48px",
                                    objectFit: "contain",
                                    display: "block",
                                    filter: "brightness(0) invert(1)",
                                }}
                            />
                            <span style={{ fontSize: "22px", fontWeight: 800, color: "#ffffff", whiteSpace: "nowrap" }}>Atlas Derslik</span>
                        </Link>
                        <p className="text-sm text-gray-400 leading-relaxed mb-6">
                            Ders programı, eğitim içerikleri ve öğrenci takibi için
                            çevrim içi eğitim platformu.
                        </p>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                                <Mail className="h-4 w-4 text-atlas-blue" />
                                <a href={contactEmailHref(contact)} className="hover:text-white transition-colors">{contact.email}</a>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Phone className="h-4 w-4 text-atlas-blue" />
                                <a href={`tel:${contact.phone}`} className="hover:text-white transition-colors">{contactPhoneLabel(contact.phone)}</a>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <MapPin className="h-4 w-4 text-atlas-blue" />
                                <Link href="/iletisim" className="hover:text-white transition-colors">Açık adres ve satıcı bilgileri</Link>
                            </div>
                        </div>
                    </div>

                    {/* Platform */}
                    <div>
                        <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                            Platform
                        </h4>
                        <ul className="space-y-3">
                            {footerLinks.platform.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-gray-400 hover:text-atlas-blue transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                            Kurumsal
                        </h4>
                        <ul className="space-y-3">
                            {footerLinks.company.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-gray-400 hover:text-atlas-blue transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                            Yasal
                        </h4>
                        <ul className="space-y-3">
                            {footerLinks.legal.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-gray-400 hover:text-atlas-blue transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-gray-500">
                        © {new Date().getFullYear()} Atlas Derslik. Tüm hakları saklıdır.
                    </p>
                    <div className="flex items-center gap-4">
                        <a
                            href="https://instagram.com/atlasderslik"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-atlas-blue transition-colors text-sm"
                        >
                            Instagram
                        </a>
                        <a href={contactEmailHref(contact)} className="text-gray-500 hover:text-atlas-blue transition-colors text-sm">
                            E-posta
                        </a>
                        <a href={`tel:${contact.phone}`} className="text-gray-500 hover:text-atlas-blue transition-colors text-sm">
                            {contactPhoneLabel(contact.phone)}
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
