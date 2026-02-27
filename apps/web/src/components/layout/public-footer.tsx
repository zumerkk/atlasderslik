import Link from "next/link";
import { GraduationCap, Mail, Phone, MapPin } from "lucide-react";

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
        { label: "Blog", href: "/blog" },
    ],
    legal: [
        { label: "Gizlilik Politikası", href: "/gizlilik-politikasi" },
        { label: "Kullanım Şartları", href: "/kullanim-sartlari" },
        { label: "KVKK", href: "/kvkk" },
    ],
};

export function PublicFooter() {
    return (
        <footer className="bg-gray-900 text-gray-300">
            {/* Main Footer */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    {/* Brand */}
                    <div className="lg:col-span-1">
                        <Link href="/" className="flex items-center gap-2.5 mb-4">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-atlas-blue to-atlas-indigo flex items-center justify-center">
                                <GraduationCap className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-lg font-bold text-white">Atlas Derslik</span>
                        </Link>
                        <p className="text-sm text-gray-400 leading-relaxed mb-6">
                            Ortaokul müfredatına ve LGS&apos;ye yönelik online eğitim platformu.
                            Uzman öğretmenlerle kaliteli eğitim.
                        </p>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                                <Mail className="h-4 w-4 text-atlas-blue" />
                                <span>info@atlasderslik.com</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Phone className="h-4 w-4 text-atlas-blue" />
                                <span>+90 546 119 10 09</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <MapPin className="h-4 w-4 text-atlas-blue" />
                                <span>Antalya/Gazipaşa</span>
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
                        <a href="#" className="text-gray-500 hover:text-atlas-blue transition-colors text-sm">
                            Instagram
                        </a>
                        <a href="#" className="text-gray-500 hover:text-atlas-blue transition-colors text-sm">
                            YouTube
                        </a>
                        <a href="#" className="text-gray-500 hover:text-atlas-blue transition-colors text-sm">
                            Twitter
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
