"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Home, User, FileText, GraduationCap, LifeBuoy } from "lucide-react";

const sidebarLinks = [
    { title: "Ana Sayfa", href: "/parent", icon: Home },
    { title: "Ödev Takibi", href: "/parent/assignments", icon: FileText },
    { title: "Sınav Sonuçları", href: "/parent/exams", icon: GraduationCap },
    { title: "Profilim", href: "/parent/profile", icon: User },
    { title: "Destek", href: "/parent/support", icon: LifeBuoy },
];

export default function ParentLayout({ children }: { children: React.ReactNode }) {
    return (
        <AppLayout
            role="PARENT"
            allowedRoles={["PARENT"]}
            sidebarLinks={sidebarLinks}
            profileHref="/parent/profile"
        >
            {children}
        </AppLayout>
    );
}
