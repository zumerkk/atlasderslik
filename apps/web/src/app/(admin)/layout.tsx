"use client";

import { AppLayout } from "@/components/layout/app-layout";
import {
    Home,
    GraduationCap,
    BookOpen,
    Layers,
    FileText,
    Package,
    Users,
    UserCheck,
    UserPlus,
    CalendarDays,
} from "lucide-react";

const sidebarLinks = [
    { title: "Dashboard", href: "/admin", icon: Home },
    { title: "Sınıflar", href: "/admin/grades", icon: GraduationCap },
    { title: "Dersler", href: "/admin/subjects", icon: BookOpen },
    { title: "Üniteler", href: "/admin/units", icon: Layers },
    { title: "Konular", href: "/admin/topics", icon: FileText },
    { title: "Ders Programı", href: "/admin/schedule", icon: CalendarDays },
    { title: "Paketler", href: "/admin/packages", icon: Package },
    { title: "Kullanıcılar", href: "/admin/users", icon: Users },
    { title: "Öğretmen Atamaları", href: "/admin/assignments/teachers", icon: UserCheck },
    { title: "Öğrenci Kayıtları", href: "/admin/assignments/students", icon: UserPlus },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AppLayout
            role="ADMIN"
            allowedRoles={["ADMIN"]}
            sidebarLinks={sidebarLinks}
            searchPlaceholder="Kullanıcı, ders ara..."
            profileHref="/admin"
        >
            {children}
        </AppLayout>
    );
}
