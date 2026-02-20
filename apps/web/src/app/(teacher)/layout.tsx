"use client";

import { AppLayout } from "@/components/layout/app-layout";
import {
    LayoutDashboard,
    Users,
    Video,
    PlayCircle,
    CheckSquare,
    Database,
    User,
    CalendarDays,
} from "lucide-react";

const sidebarLinks = [
    { title: "Dashboard", href: "/teacher", icon: LayoutDashboard },
    { title: "Sınıflarım", href: "/teacher/classes", icon: Users },
    { title: "Ders Programım", href: "/teacher/schedule", icon: CalendarDays },
    { title: "Canlı Derslerim", href: "/teacher/live-classes", icon: Video },
    { title: "Video Kütüphanesi", href: "/teacher/videos", icon: PlayCircle },
    { title: "Ödevler", href: "/teacher/assignments", icon: CheckSquare },
    { title: "Soru Bankası", href: "/teacher/questions", icon: Database },
    { title: "Profilim", href: "/teacher/profile", icon: User },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
    return (
        <AppLayout
            role="TEACHER"
            allowedRoles={["TEACHER"]}
            sidebarLinks={sidebarLinks}
            searchPlaceholder="Sınıf veya öğrenci ara..."
            profileHref="/teacher/profile"
        >
            {children}
        </AppLayout>
    );
}
