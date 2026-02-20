"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, Package2 } from "lucide-react";

const links = [
    { href: "/parent", label: "Dashboard", icon: Home },
    { href: "/parent/profile", label: "Profilim", icon: User },
];

export function ParentSidebar() {
    const pathname = usePathname();
    return (
        <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                <Link href="/parent" className="flex items-center gap-2 font-semibold">
                    <Package2 className="h-6 w-6" />
                    <span>Atlas Derslik</span>
                </Link>
            </div>
            <div className="flex-1">
                <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                    {links.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${isActive ? "bg-muted text-primary" : "text-muted-foreground"}`}
                            >
                                <link.icon className="h-4 w-4" />
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
